'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCached } from '@/lib/tmdbCache'
import MovieDetailPopup from '@/components/MovieDetailPopup'

export interface FilmNavItem {
  movieId: number
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle?: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  releaseDate?: string
  voteAverage?: number
}

interface CreditItem {
  id: number
  media_type: 'movie' | 'tv'
  title: string
  original_title: string
  character: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string | null
  release_date: string
  vote_average: number
  popularity: number
  vote_count: number
}

interface PersonDetail {
  biography: string | null
  birthday: string | null
  place_of_birth: string | null
  profile_path: string | null
}

interface PersonPopupProps {
  personId: number
  personName: string
  personProfile?: string | null
  onClose: () => void
  onSelectFilm?: (film: FilmNavItem) => void
  zIndex?: number
  mode?: 'actor' | 'director'
}

function formatDate(d: string | null): string | null {
  if (!d) return null
  const parts = d.split('-')
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  const y = parts[0], m = parseInt(parts[1]) - 1, day = parts[2]
  if (isNaN(m) || m < 0 || m > 11) return d
  return `${day} ${months[m]} ${y}`
}

function dedupeById(items: CreditItem[]): CreditItem[] {
  const seen = new Map<number, CreditItem>()
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item)
  }
  return Array.from(seen.values())
}

/** İlk 3 popüler (popularity DESC), geri kalanlar tarihe göre (release_date DESC) */
function sortWithTopPopular(items: CreditItem[]): CreditItem[] {
  if (items.length <= 3) return [...items].sort((a, b) => b.popularity - a.popularity)
  const byPopularity = [...items].sort((a, b) => b.popularity - a.popularity)
  const top3 = byPopularity.slice(0, 3)
  const top3Ids = new Set(top3.map(i => i.id))
  const rest = items
    .filter(i => !top3Ids.has(i.id))
    .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
  return [...top3, ...rest]
}

export default function PersonPopup({
  personId, personName, personProfile,
  onClose, onSelectFilm, zIndex = 50, mode = 'actor',
}: PersonPopupProps) {
  const { user } = useAuth()
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [movies, setMovies] = useState<CreditItem[] | null>(null)
  const [tvShows, setTvShows] = useState<CreditItem[] | null>(null)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [internalDetail, setInternalDetail] = useState<FilmNavItem | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Favori durumu kontrol et
  useEffect(() => {
    if (!user) return
    const table = mode === 'director' ? 'favorite_directors' : 'favorite_actors'
    const idCol = mode === 'director' ? 'director_id' : 'actor_id'
    supabase.from(table)
      .select('id')
      .eq('user_id', user.id)
      .eq(idCol, personId)
      .maybeSingle()
      .then(({ data }) => { if (data) setIsFavorite(true) })
  }, [user, personId, mode])

  // Kişi detayı + filmografi paralel çek
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    Promise.all([
      fetchCached(`https://api.themoviedb.org/3/person/${personId}?api_key=${apiKey}&language=tr-TR`) as Promise<any>,
      fetchCached(`https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${apiKey}&language=tr-TR`) as Promise<any>,
      mode === 'actor'
        ? fetchCached(`https://api.themoviedb.org/3/person/${personId}/tv_credits?api_key=${apiKey}&language=tr-TR`) as Promise<any>
        : Promise.resolve({ cast: [], crew: [] }),
    ]).then(([personData, movieCredits, tvCredits]) => {
      setDetail({
        biography: personData.biography || null,
        birthday: personData.birthday || null,
        place_of_birth: personData.place_of_birth || null,
        profile_path: personData.profile_path || null,
      })

      if (mode === 'director') {
        // Yönetmen modu: crew dizisinden job=Director olanları al
        const rawMovies: CreditItem[] = (movieCredits.crew || [])
          .filter((c: any) => c.job === 'Director' && !c.adult && (c.vote_average || 0) > 0)
          .map((c: any) => ({
            id: c.id,
            media_type: 'movie' as const,
            title: c.title || c.original_title || '',
            original_title: c.original_title || c.title || '',
            character: '',
            poster_path: c.poster_path || null,
            backdrop_path: c.backdrop_path || null,
            overview: c.overview || null,
            release_date: c.release_date || '',
            vote_average: c.vote_average || 0,
            popularity: c.popularity || 0,
            vote_count: c.vote_count || 0,
          }))
        setMovies(sortWithTopPopular(dedupeById(rawMovies)))
        setTvShows([])
      } else {
        // Oyuncu modu: cast dizisinden al
        const rawMovies: CreditItem[] = (movieCredits.cast || [])
          .filter((c: any) => !c.adult && (c.vote_average || 0) > 0)
          .map((c: any) => ({
            id: c.id,
            media_type: 'movie' as const,
            title: c.title || c.original_title || '',
            original_title: c.original_title || c.title || '',
            character: c.character || '',
            poster_path: c.poster_path || null,
            backdrop_path: c.backdrop_path || null,
            overview: c.overview || null,
            release_date: c.release_date || '',
            vote_average: c.vote_average || 0,
            popularity: c.popularity || 0,
            vote_count: c.vote_count || 0,
          }))
        setMovies(sortWithTopPopular(dedupeById(rawMovies)))

        const rawTv: CreditItem[] = (tvCredits.cast || [])
          .filter((c: any) => !c.adult && (c.vote_average || 0) > 0)
          .map((c: any) => ({
            id: c.id,
            media_type: 'tv' as const,
            title: c.name || c.original_name || '',
            original_title: c.original_name || c.name || '',
            character: c.character || '',
            poster_path: c.poster_path || null,
            backdrop_path: c.backdrop_path || null,
            overview: c.overview || null,
            release_date: c.first_air_date || '',
            vote_average: c.vote_average || 0,
            popularity: c.popularity || 0,
            vote_count: c.vote_count || 0,
          }))
        setTvShows(sortWithTopPopular(dedupeById(rawTv)))
      }
    }).catch(() => {
      setDetail({ biography: null, birthday: null, place_of_birth: null, profile_path: null })
      setMovies([])
      setTvShows([])
    })
  }, [personId, mode])

  const handleFilmClick = (c: CreditItem) => {
    const filmItem: FilmNavItem = {
      movieId: c.id,
      mediaType: c.media_type,
      title: c.title,
      originalTitle: c.original_title,
      poster: c.poster_path ? `https://image.tmdb.org/t/p/w500${c.poster_path}` : null,
      backdrop: c.backdrop_path ? `https://image.tmdb.org/t/p/w780${c.backdrop_path}` : null,
      overview: c.overview,
      releaseDate: c.release_date,
      voteAverage: c.vote_average,
    }
    if (onSelectFilm) {
      onSelectFilm(filmItem)
    } else {
      setInternalDetail(filmItem)
    }
  }

  const toggleFavorite = async () => {
    if (!user || favLoading) return
    setFavLoading(true)
    const profilePath = detail?.profile_path || personProfile || null
    if (mode === 'director') {
      if (isFavorite) {
        await supabase.from('favorite_directors').delete().eq('user_id', user.id).eq('director_id', personId)
        setIsFavorite(false)
      } else {
        await supabase.from('favorite_directors').insert({ user_id: user.id, director_id: personId, director_name: personName, profile_path: profilePath })
        setIsFavorite(true)
      }
    } else {
      if (isFavorite) {
        await supabase.from('favorite_actors').delete().eq('user_id', user.id).eq('actor_id', personId)
        setIsFavorite(false)
      } else {
        await supabase.from('favorite_actors').insert({ user_id: user.id, actor_id: personId, actor_name: personName, profile_path: profilePath })
        setIsFavorite(true)
      }
    }
    setFavLoading(false)
  }

  const profileUrl = detail?.profile_path
    ? `https://image.tmdb.org/t/p/w300${detail.profile_path}`
    : personProfile || null

  const bio = detail?.biography || ''
  const bioShort = bio.length > 200
  const totalCount = (movies?.length || 0) + (tvShows?.length || 0)

  const renderGrid = (items: CreditItem[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {items.map((c, idx) => (
        <button
          key={`${c.media_type}-${c.id}-${idx}`}
          onClick={() => handleFilmClick(c)}
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
            transition: 'transform 0.15s',
            display: 'flex',
            flexDirection: 'column',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ position: 'relative', paddingBottom: '150%', width: '100%' }}>
            {c.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w185${c.poster_path}`}
                alt={c.title}
                loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', fontSize: '24px' }}>
                🎬
              </div>
            )}
          </div>
          <div style={{ padding: '6px' }}>
            <p style={{ color: '#cbd5e1', fontSize: '9px', fontWeight: 500, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{c.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <p style={{ color: '#475569', fontSize: '8px' }}>{c.release_date?.substring(0, 4)}</p>
              {c.vote_average > 0 && (
                <p style={{ color: '#f59e0b', fontSize: '8px' }}>⭐{c.vote_average.toFixed(1)}</p>
              )}
            </div>
            {c.character && (
              <p style={{ color: '#7F77DD', fontSize: '8px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.character}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  )

  return (
    <>
    {/* Film detay popup (onSelectFilm olmadığında dahili kullanım) */}
    {internalDetail && (
      <MovieDetailPopup
        isOpen
        onClose={() => setInternalDetail(null)}
        movieId={internalDetail.movieId}
        mediaType={internalDetail.mediaType}
        title={internalDetail.title}
        originalTitle={internalDetail.originalTitle}
        poster={internalDetail.poster}
        backdrop={internalDetail.backdrop}
        overview={internalDetail.overview}
        releaseDate={internalDetail.releaseDate}
        voteAverage={internalDetail.voteAverage}
        zIndex={zIndex + 50}
      />
    )}
    <div
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: '#000000cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '448px', maxHeight: '85vh',
          overflowY: 'auto', borderRadius: '16px',
          background: '#12121a', position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Kapat */}
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
          {/* Profil */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #7F77DD', marginBottom: '12px', flexShrink: 0, background: '#1e293b' }}>
              {profileUrl ? (
                <img src={profileUrl} alt={`${personName} profil fotoğrafı`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>
              )}
            </div>
            <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, textAlign: 'center', margin: 0 }}>{personName}</h2>
            <span style={{ marginTop: '6px', fontSize: '11px', padding: '3px 12px', borderRadius: '999px', fontWeight: 600, background: '#7F77DD22', color: '#7F77DD', border: '1px solid #7F77DD44' }}>
              {mode === 'director' ? 'Yönetmen' : 'Oyuncu'}
            </span>
            {/* Favori butonu */}
            {user && (
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                style={{
                  marginTop: '10px',
                  padding: '6px 16px',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isFavorite ? '#f59e0b22' : '#ffffff10',
                  color: isFavorite ? '#f59e0b' : '#94a3b8',
                  transition: 'all 0.2s',
                }}
              >
                {mode === 'director'
                  ? (isFavorite ? '💛 Takiptesin' : '❤️ Yönetmeni Takip Et')
                  : (isFavorite ? '💛 Favorilerde' : '❤️ Favorilere Ekle')}
              </button>
            )}
          </div>

          {/* Bilgi kartları */}
          {detail && (detail.birthday || detail.place_of_birth || movies !== null) && (
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
              {movies !== null && (
                <div style={{ flex: 1, minWidth: '80px', background: '#0f172a', borderRadius: '10px', padding: '8px 10px', textAlign: 'center' }}>
                  <p style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>{mode === 'director' ? 'FİLM' : 'YAPIM'}</p>
                  <p style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 700 }}>{mode === 'director' ? movies.length : `${totalCount}+`}</p>
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

          {/* Filmler */}
          {movies === null ? (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', padding: '32px 0' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="animate-bounce" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7F77DD', animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          ) : (
            <>
              {movies.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '10px' }}>
                    {mode === 'director' ? `YÖNETMENLİĞİNİ YAPTIĞI FİLMLER (${movies.length})` : `FİLMLER (${movies.length})`}
                  </p>
                  {renderGrid(movies)}
                </div>
              )}
              {tvShows !== null && tvShows.length > 0 && (
                <div>
                  <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '10px' }}>
                    DİZİLER ({tvShows.length})
                  </p>
                  {renderGrid(tvShows)}
                </div>
              )}
              {movies.length === 0 && (!tvShows || tvShows.length === 0) && (
                <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Filmografi bulunamadı.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
