'use client'
import { useState, useCallback } from 'react'
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

/* ─── Oyuncu Popup ─── */
function PersonPopup({ person, onClose }: { person: PersonResult; onClose: () => void }) {
  const [credits, setCredits] = useState<CreditItem[] | null>(null)
  const [detail, setDetail] = useState<MovieResult | null>(null)

  const loadCredits = useCallback(async () => {
    if (credits !== null) return
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      const res = await fetch(
        `https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${apiKey}&language=tr-TR`
      )
      const data = await res.json()
      const cast: CreditItem[] = (data.cast || [])
        .filter((c: any) => c.media_type === 'movie' || c.media_type === 'tv')
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 30)
      setCredits(cast)
    } catch {
      setCredits([])
    }
  }, [person.id, credits])

  // Popup açılınca hemen yükle
  useState(() => { loadCredits() })

  const openCredit = (c: CreditItem) => {
    setDetail({
      kind: 'media',
      id: c.id,
      media_type: c.media_type,
      title: c.title,
      original_title: c.original_title,
      poster: c.poster_path ? `https://image.tmdb.org/t/p/w500${c.poster_path}` : null,
      backdrop: c.backdrop_path ? `https://image.tmdb.org/t/p/w780${c.backdrop_path}` : null,
      overview: c.overview || null,
      release_date: c.release_date || '',
      vote_average: c.vote_average || 0,
    })
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-t-3xl overflow-y-auto"
          style={{ background: '#12121a', maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Kapat */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm z-10"
            style={{ background: '#00000066', color: '#fff', position: 'sticky', float: 'right', marginTop: '12px', marginRight: '12px' }}
          >✕</button>

          <div className="p-6">
            {/* Profil fotoğrafı + isim */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border-2" style={{ borderColor: '#7F77DD', flexShrink: 0 }}>
                {person.profile ? (
                  <img src={person.profile} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: '#1e293b' }}>👤</div>
                )}
              </div>
              <h2 className="text-xl font-bold text-center" style={{ color: '#f1f5f9' }}>{person.name}</h2>
              <span className="mt-1.5 text-xs px-3 py-1 rounded-full font-semibold" style={{ background: '#7F77DD22', color: '#7F77DD', border: '1px solid #7F77DD44' }}>
                {person.known_for_department === 'Acting' ? 'Oyuncu' : person.known_for_department || 'Oyuncu'}
              </span>
            </div>

            {/* Filmografi */}
            <p className="text-xs font-semibold mb-3 tracking-widest" style={{ color: '#64748b' }}>FİLMOGRAFİ</p>
            {credits === null ? (
              <div className="flex gap-1.5 justify-center py-8">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#7F77DD', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            ) : credits.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#64748b' }}>Filmografi bulunamadı.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {credits.map(c => (
                  <button
                    key={`${c.media_type}-${c.id}`}
                    onClick={() => openCredit(c)}
                    className="flex-shrink-0 rounded-xl overflow-hidden text-left transition-all hover:scale-[1.03] active:scale-95"
                    style={{ width: '90px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {c.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${c.poster_path}`}
                        alt={c.title}
                        className="w-full object-cover"
                        style={{ height: '130px' }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: '130px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                        <span style={{ fontSize: '24px' }}>🎬</span>
                      </div>
                    )}
                    <div className="px-1.5 py-1.5">
                      <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.title}
                      </p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[8px]" style={{ color: '#475569' }}>{c.release_date?.substring(0, 4)}</span>
                        <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: c.media_type === 'movie' ? '#f59e0b18' : '#3b82f618', color: c.media_type === 'movie' ? '#f59e0b' : '#60a5fa' }}>
                          {c.media_type === 'movie' ? 'F' : 'D'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filmden tıklanınca MovieDetailPopup */}
      {detail && (
        <MovieDetailPopup
          isOpen
          onClose={() => setDetail(null)}
          movieId={detail.id}
          mediaType={detail.media_type}
          title={detail.title}
          originalTitle={detail.original_title}
          poster={detail.poster}
          backdrop={detail.backdrop}
          overview={detail.overview}
          releaseDate={detail.release_date}
          voteAverage={detail.vote_average}
          contentType={detail.media_type === 'movie' ? 'film' : 'dizi'}
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

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(q)}&language=tr-TR&page=1`)
      const data = await res.json()
      const mapped: AnyResult[] = (data.results || []).flatMap((r: any): AnyResult[] => {
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
        if (r.media_type === 'person') {
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
      setResults(mapped)
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
    doSearch(query)
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
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Film, dizi veya oyuncu adı yazın..."
              autoFocus
              className="w-full rounded-2xl pl-12 pr-4 py-4 text-base outline-none transition-all"
              style={{ background: '#12121a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ background: '#1e293b', color: '#64748b' }}
              >✕</button>
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
            <p className="text-4xl mb-3">🎬</p>
            <p style={{ color: '#94a3b8' }}>Sonuç bulunamadı.</p>
            <p className="text-sm mt-1" style={{ color: '#475569' }}>Farklı bir arama deneyin.</p>
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

              // Film / Dizi kartı
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
