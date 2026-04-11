'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MovieDetailPopup from '@/components/MovieDetailPopup'
import PersonPopup from '@/components/PersonPopup'
import type { FilmNavItem } from '@/components/PersonPopup'
import { supabase } from '@/lib/supabase'

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

interface UserResult {
  kind: 'user'
  id: string
  nickname: string
  badge: string | null
}

type AnyResult = MovieResult | PersonResult | UserResult

const BADGE_EMOJIS: Record<string, string> = {
  'Yeni Üye': '🌱', 'Film Sever': '🎬', 'Sinefil': '🎭',
  'Film Gurmesi': '👑', 'Efsane Eleştirmen': '🏆',
}

/* ─── TMDB sonuçlarını normalize eden yardımcı ─── */
function mapResults(raw: any[]): (MovieResult | PersonResult)[] {
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

  return raw.flatMap((r: any): (MovieResult | PersonResult)[] => {
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

/* ─── Debounce timer ─── */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/* ─── Ana sayfa ─── */
export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MovieResult | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
      const [tmdbRes, usersRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(q)}&language=tr-TR&page=1`).then(r => r.json()),
        supabase
          .from('profiles')
          .select('id, nickname')
          .ilike('nickname', `%${q}%`)
          .not('nickname', 'is', null)
          .limit(5),
      ])

      // Kullanıcılar — badge bilgisi çek
      const userProfiles = usersRes.data || []
      let userResults: UserResult[] = []
      if (userProfiles.length > 0) {
        const ids = userProfiles.map((p: any) => p.id)
        const { data: pts } = await supabase.from('user_points').select('user_id, badge').in('user_id', ids)
        const badgeMap: Record<string, string> = {}
        if (pts) pts.forEach((p: any) => { badgeMap[p.user_id] = p.badge })
        userResults = userProfiles.map((p: any): UserResult => ({
          kind: 'user',
          id: p.id,
          nickname: p.nickname,
          badge: badgeMap[p.id] || null,
        }))
      }

      // TMDB sonuçları
      const tmdbResults = mapResults(tmdbRes.results || [])

      // Sıralama: kullanıcılar → filmler/diziler → oyuncular
      const media = tmdbResults.filter(r => r.kind === 'media')
      const people = tmdbResults.filter(r => r.kind === 'person')
      setResults([...userResults, ...media, ...people])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (val: string) => {
    setQuery(val)
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => doSearch(val), 400)
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
    if (s.kind === 'user') { router.push(`/user/${s.id}`); return }
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
        <PersonPopup
          personId={selectedPerson.id}
          personName={selectedPerson.name}
          personProfile={selectedPerson.profile}
          onClose={() => setSelectedPerson(null)}
          onSelectFilm={(film: FilmNavItem) => {
            setSelectedPerson(null)
            setSelectedMedia({
              kind: 'media',
              id: film.movieId,
              media_type: film.mediaType,
              title: film.title,
              original_title: film.originalTitle || film.title,
              poster: film.poster,
              backdrop: film.backdrop,
              overview: film.overview,
              release_date: film.releaseDate || '',
              vote_average: film.voteAverage || 0,
            })
          }}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#f59e0b' }}>Film, Dizi, Oyuncu & Kullanıcı Ara 🔍</h1>

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
              placeholder="Film, dizi, oyuncu veya kullanıcı adı yazın..."
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
                    key={`sug-${s.kind}-${s.kind === 'user' ? s.id : s.id}`}
                    onMouseDown={() => pickSuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 border-b last:border-b-0"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    {s.kind === 'user' ? (
                      <>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                          {s.nickname[0].toUpperCase()}
                        </div>
                        <span className="text-xs flex-1 truncate" style={{ color: '#f1f5f9' }}>@{s.nickname}</span>
                        {s.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                            {BADGE_EMOJIS[s.badge] || ''} {s.badge}
                          </span>
                        )}
                      </>
                    ) : s.kind === 'person' ? (
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
            <p style={{ color: '#94a3b8' }}>Film, dizi, oyuncu veya kullanıcı adı yazarak arama yapın.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Kullanıcı sonuçları */}
            {results.some(r => r.kind === 'user') && (
              <div>
                <p className="text-[10px] font-semibold mb-2 tracking-widest" style={{ color: '#64748b' }}>KULLANICILAR</p>
                <div className="flex flex-col gap-2">
                  {(results.filter(r => r.kind === 'user') as UserResult[]).map(u => (
                    <button
                      key={`user-${u.id}`}
                      onClick={() => router.push(`/user/${u.id}`)}
                      className="rounded-xl border flex items-center gap-3 p-3 text-left transition-all hover:scale-[1.01] active:scale-95"
                      style={{ background: '#12121a', borderColor: '#f59e0b22' }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 border-2" style={{ background: '#f59e0b22', color: '#f59e0b', borderColor: '#f59e0b' }}>
                        {u.nickname[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>@{u.nickname}</p>
                        {u.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                            {BADGE_EMOJIS[u.badge] || ''} {u.badge}
                          </span>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Film/Dizi + Oyuncu sonuçları */}
            {results.some(r => r.kind !== 'user') && (
              <div>
                {results.some(r => r.kind === 'user') && (
                  <p className="text-[10px] font-semibold mb-2 tracking-widest" style={{ color: '#64748b' }}>FİLM, DİZİ & OYUNCU</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {(results.filter(r => r.kind !== 'user') as (MovieResult | PersonResult)[]).map(result => {
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
                          <p className="text-xs font-semibold leading-snug" style={{ color: '#f1f5f9', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{result.title}</p>
                          {result.release_date && (
                            <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{result.release_date.substring(0, 4)}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
