'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import MovieDetailPopup from '@/components/MovieDetailPopup'

/* ─── Tipler ─── */
interface MovieResult {
  kind: 'media'
  id: number
  media_type: 'movie' | 'tv'
  title: string
  original_title: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  release_date: string
  vote_average: number
}

interface PersonResult {
  kind: 'person'
  id: number
  name: string
  profile: string | null
  known_for_department: string
}

type AnyResult = MovieResult | PersonResult

interface CreditItem {
  id: number
  media_type: 'movie' | 'tv'
  title: string
  original_title: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string | null
  release_date: string
  vote_average: number
  popularity: number
}

/* ─── TMDB sonuçlarını normalize eden yardımcı ─── */
function mapResults(raw: any[]): AnyResult[] {
  // Kişileri isme göre dedup — en yüksek popularity'i tut
  const personsByName = new Map<string, any>()
  for (const r of raw) {
    if (r.media_type === 'person') {
      const existing = personsByName.get(r.name)
      if (!existing || (r.popularity || 0) > (existing.popularity || 0)) {
        personsByName.set(r.name, r)
      }
    }
  }
  const uniquePersonIds = new Set(Array.from(personsByName.values()).map((p: any) => p.id))

  return raw.flatMap((r: any): AnyResult[] => {
    if (r.media_type === 'movie' || r.media_type === 'tv') {
      return [{
        kind: 'media',
        id: r.id,
        media_type: r.media_type,
        title: r.title || r.name || '',
        original_title: r.original_title || r.original_name || '',
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
        overview: r.overview || null,
        release_date: r.release_date || r.first_air_date || '',
        vote_average: r.vote_average || 0,
      }]
    }
    if (r.media_type === 'person' && uniquePersonIds.has(r.id)) {
      return [{
        kind: 'person',
        id: r.id,
        name: r.name || '',
        profile: r.profile_path ? `https://image.tmdb.org/t/p/w185${r.profile_path}` : null,
        known_for_department: r.known_for_department || '',
      }]
    }
    return []
  })
}

interface PersonDetail {
  biography: string | null
  birthday: string | null
  place_of_birth: string | null
  profile_path: string | null
}

/* ─── Oyuncu Popup ─── */
function PersonPopup({ person, onClose }: { person: PersonResult; onClose: () => void }) {
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [credits, setCredits] = useState<CreditItem[] | null>(null)
  const [selectedFilm, setSelectedFilm] = useState<MovieResult | null>(null)
  const [bioExpanded, setBioExpanded] = useState(false)

  // Body scroll kilidi
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

  // Oyuncu detayı + filmografi paralel çek
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    Promise.all([
      fetch(`https://api.themoviedb.org/3/person/${person.id}?api_key=${apiKey}&language=tr-TR`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${apiKey}&language=tr-TR`).then(r => r.json()),
    ]).then(([personData, creditsData]) => {
      setDetail({
        biography: personData.biography || null,
        birthday: personData.birthday || null,
        place_of_birth: personData.place_of_birth || null,
        profile_path: personData.profile_path || null,
      })
      const cast: CreditItem[] = (creditsData.cast || [])
        .filter((c: any) => (c.media_type === 'movie' || c.media_type === 'tv') && c.poster_path)
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 30)
      setCredits(cast)
    }).catch(() => {
      setDetail({ biography: null, birthday: null, place_of_birth: null, profile_path: null })
      setCredits([])
    })
  }, [person.id])

  const openFilm = (c: CreditItem) => {
    setSelectedFilm({
      kind: 'media',
      id: c.id,
      media_type: c.media_type,
      title: c.title || c.original_title || '',
      original_title: c.original_title || c.title || '',
      poster: c.poster_path ? `https://image.tmdb.org/t/p/w500${c.poster_path}` : null,
      backdrop: c.backdrop_path ? `https://image.tmdb.org/t/p/w780${c.backdrop_path}` : null,
      overview: c.overview || null,
      release_date: c.release_date || '',
      vote_average: c.vote_average || 0,
    })
  }

  const profileUrl = detail?.profile_path
    ? `https://image.tmdb.org/t/p/w300${detail.profile_path}`
    : person.profile

  const bio = detail?.biography || ''
  const bioShort = bio.length > 200

  const formatDate = (d: string | null) => {
    if (!d) return null
    const [y, m, mo] = d.split('-')
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    return `${mo} ${months[parseInt(m) - 1]} ${y}`
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: '#000000cc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        {/* İç kapsayıcı */}
        <div
          style={{
            width: '100%', maxWidth: '448px', maxHeight: '85vh',
            overflowY: 'auto', borderRadius: '16px',
            background: '#12121a', position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Kapat butonu */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '12px', right: '12px', zIndex: 10,
              width: '32px', height: '32px', borderRadius: '50%',
              background: '#1e293b', color: '#94a3b8',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}
          >✕</button>

          <div style={{ padding: '24px' }}>
            {/* Profil fotoğrafı */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #7F77DD', marginBottom: '12px', flexShrink: 0, background: '#1e293b' }}>
                {profileUrl ? (
                  <img src={profileUrl} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
                )}
              </div>
              <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, textAlign: 'center', margin: 0 }}>{person.name}</h2>
              <span style={{ marginTop: '6px', fontSize: '11px', padding: '3px 12px', borderRadius: '999px', fontWeight: 600, background: '#7F77DD22', color: '#7F77DD', border: '1px solid #7F77DD44' }}>
                {person.known_for_department === 'Acting' ? 'Oyuncu' : person.known_for_department || 'Oyuncu'}
              </span>
            </div>

            {/* Bilgi kartları */}
            {detail && (detail.birthday || detail.place_of_birth || credits) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {detail.birthday && (
                  <div style={{ flex: 1, minWidth: '100px', background: '#0f172a', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>DOĞUM</p>
                    <p style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 500 }}>{formatDate(detail.birthday)}</p>
                  </div>
                )}
                {detail.place_of_birth && (
                  <div style={{ flex: 2, minWidth: '120px', background: '#0f172a', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>DOĞUM YERİ</p>
                    <p style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.place_of_birth}</p>
                  </div>
                )}
                {credits !== null && (
                  <div style={{ flex: 1, minWidth: '80px', background: '#0f172a', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>YAPIM</p>
                    <p style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 700 }}>{credits.length}+</p>
                  </div>
                )}
              </div>
            )}

            {/* Biyografi */}
            {bio && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '8px' }}>BİYOGRAFİ</p>
                <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                  {bioShort && !bioExpanded ? bio.substring(0, 200) + '...' : bio}
                </p>
                {bioShort && (
                  <button
                    onClick={() => setBioExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', color: '#7F77DD', fontSize: '12px', cursor: 'pointer', padding: '4px 0', marginTop: '4px' }}
                  >
                    {bioExpanded ? 'Daha az ↑' : 'Devamını oku ↓'}
                  </button>
                )}
              </div>
            )}

            {/* Filmografi */}
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '10px' }}>FİLMOGRAFİ</p>
            {credits === null ? (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '32px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="animate-bounce" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7F77DD', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            ) : credits.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Filmografi bulunamadı.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {credits.map(c => (
                  <button
                    key={`${c.media_type}-${c.id}`}
                    onClick={() => openFilm(c)}
                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'transform 0.15s', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <div style={{ position: 'relative', paddingBottom: '150%', width: '100%' }}>
                      <img
                        src={`https://image.tmdb.org/t/p/w185${c.poster_path}`}
                        alt={c.title}
                        loading="lazy"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '6px' }}>
                      <p style={{ color: '#cbd5e1', fontSize: '9px', fontWeight: 500, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{c.title}</p>
                      <p style={{ color: '#475569', fontSize: '8px', marginTop: '2px' }}>{c.release_date?.substring(0, 4)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedFilm && (
        <MovieDetailPopup
          isOpen
          onClose={() => setSelectedFilm(null)}
          movieId={selectedFilm.id}
          mediaType={selectedFilm.media_type}
          title={selectedFilm.title}
          originalTitle={selectedFilm.original_title}
          poster={selectedFilm.poster}
          backdrop={selectedFilm.backdrop}
          overview={selectedFilm.overview}
          releaseDate={selectedFilm.release_date}
          voteAverage={selectedFilm.vote_average}
          contentType={selectedFilm.media_type === 'movie' ? 'film' : 'dizi'}
        />
      )}
    </>
  )
}

/* ─── Debounce timer ─── */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/* ─── Ana sayfa ─── */
export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MovieResult | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(q)}&language=tr-TR&page=1`)
      const data = await res.json()
      setResults(mapResults(data.results || []))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (val: string) => {
    setQuery(val)
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => doSearch(val), 500)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceTimer) clearTimeout(debounceTimer)
    setInputFocused(false)
    doSearch(query)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    setInputFocused(false)
    inputRef.current?.focus()
  }

  // Autocomplete: ilk 5 sonuç, input odaklanmışken göster
  const showSuggestions = inputFocused && query.length >= 2 && results.length > 0 && !loading
  const suggestions = results.slice(0, 5)

  const pickSuggestion = (s: AnyResult) => {
    setInputFocused(false)
    if (s.kind === 'media') setSelectedMedia(s)
    else setSelectedPerson(s)
  }

  return (
    <main className="min-h-screen pt-6 px-4 pb-24" style={{ background: '#0a0a0f' }}>
      {selectedMedia && (
        <MovieDetailPopup
          isOpen
          onClose={() => setSelectedMedia(null)}
          movieId={selectedMedia.id}
          mediaType={selectedMedia.media_type}
          title={selectedMedia.title}
          originalTitle={selectedMedia.original_title}
          poster={selectedMedia.poster}
          backdrop={selectedMedia.backdrop}
          overview={selectedMedia.overview}
          releaseDate={selectedMedia.release_date}
          voteAverage={selectedMedia.vote_average}
          contentType={selectedMedia.media_type === 'movie' ? 'film' : 'dizi'}
        />
      )}

      {selectedPerson && (
        <PersonPopup person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#f59e0b' }}>Film, Dizi & Oyuncu Ara 🔍</h1>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 150)}
              placeholder="Film, dizi veya oyuncu adı yazın..."
              autoFocus
              className="w-full rounded-2xl pl-12 pr-4 py-4 text-base outline-none transition-all"
              style={{ background: '#12121a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ background: '#1e293b', color: '#64748b' }}
              >✕</button>
            )}

            {/* Autocomplete dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-20" style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.08)' }}>
                {suggestions.map(s => (
                  <button
                    key={`sug-${s.kind}-${s.id}`}
                    onMouseDown={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 border-b last:border-b-0"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    {s.kind === 'person' ? (
                      <>
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#1e293b' }}>
                          {s.profile
                            ? <img src={s.profile} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                            : <span className="text-xs flex items-center justify-center h-full w-full">👤</span>
                          }
                        </div>
                        <span className="text-xs flex-1 truncate" style={{ color: '#f1f5f9' }}>{s.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#7F77DD22', color: '#7F77DD' }}>Oyuncu</span>
                      </>
                    ) : (
                      <>
                        <div className="rounded overflow-hidden flex-shrink-0" style={{ width: '22px', height: '32px', background: '#1e293b' }}>
                          {s.poster
                            ? <img src={s.poster} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                            : <span className="text-[10px] flex items-center justify-center h-full w-full">🎬</span>
                          }
                        </div>
                        <span className="text-xs flex-1 truncate" style={{ color: '#f1f5f9' }}>{s.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: s.media_type === 'movie' ? '#f59e0b18' : '#3b82f618', color: s.media_type === 'movie' ? '#f59e0b' : '#60a5fa' }}>
                          {s.media_type === 'movie' ? 'Film' : 'Dizi'}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p style={{ color: '#94a3b8' }}>Sonuç bulunamadı.</p>
            <p className="text-sm mt-1" style={{ color: '#475569' }}>Farklı yazımı deneyin.</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍿</p>
            <p style={{ color: '#94a3b8' }}>Film, dizi veya oyuncu adı yazarak arama yapın.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {results.map(result => {
              if (result.kind === 'person') {
                return (
                  <button
                    key={`person-${result.id}`}
                    onClick={() => setSelectedPerson(result)}
                    className="rounded-xl overflow-hidden border text-left transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center py-5 px-3"
                    style={{ background: '#12121a', borderColor: '#7F77DD33' }}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-3 border-2" style={{ borderColor: '#7F77DD' }}>
                      {result.profile ? (
                        <img src={result.profile} alt={result.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: '#1e293b' }}>👤</div>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-center leading-snug mb-2" style={{ color: '#f1f5f9' }}>{result.name}</p>
                    <span className="text-[9px] px-2.5 py-0.5 rounded-full font-semibold" style={{ background: '#7F77DD22', color: '#7F77DD', border: '1px solid #7F77DD44' }}>
                      Oyuncu
                    </span>
                  </button>
                )
              }

              return (
                <button
                  key={`${result.media_type}-${result.id}`}
                  onClick={() => setSelectedMedia(result)}
                  className="rounded-xl overflow-hidden border text-left transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  {result.poster ? (
                    <div className="relative" style={{ height: '220px' }}>
                      <img src={result.poster} alt={result.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, #12121a)' }} />
                      <div className="absolute top-2 left-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: result.media_type === 'movie' ? '#f59e0b22' : '#3b82f622', color: result.media_type === 'movie' ? '#f59e0b' : '#60a5fa', backdropFilter: 'blur(4px)' }}>
                          {result.media_type === 'movie' ? 'Film' : 'Dizi'}
                        </span>
                      </div>
                      {result.vote_average > 0 && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f59e0b33', color: '#f59e0b' }}>⭐ {result.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center" style={{ height: '220px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                      <span className="text-4xl">🎬</span>
                      <div className="absolute top-2 left-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold" style={{ background: result.media_type === 'movie' ? '#f59e0b22' : '#3b82f622', color: result.media_type === 'movie' ? '#f59e0b' : '#60a5fa' }}>
                          {result.media_type === 'movie' ? 'Film' : 'Dizi'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-semibold leading-snug" style={{ color: '#f1f5f9', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{result.title}</p>
                    {result.release_date && (
                      <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{result.release_date.substring(0, 4)}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
