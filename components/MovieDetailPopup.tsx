'use client'
import { useEffect, useState } from 'react'

interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

interface CollectionMovie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
}

interface EnrichedData {
  trailer_key: string | null
  cast: CastMember[]
  director: string | null
  collection_name: string | null
  collection_movies: CollectionMovie[]
}

interface MovieDetailPopupProps {
  isOpen: boolean
  onClose: () => void
  movieId: number | null
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle?: string
  turkishTitle?: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  releaseDate?: string
  voteAverage?: number
  year?: number
  imdb?: number
  contentType?: 'film' | 'dizi'
}

export default function MovieDetailPopup({
  isOpen, onClose, movieId, mediaType,
  title, originalTitle, turkishTitle, poster, backdrop, overview,
  releaseDate, voteAverage, year, imdb, contentType,
}: MovieDetailPopupProps) {
  const [enriched, setEnriched] = useState<EnrichedData | null>(null)
  const [loadingEnrich, setLoadingEnrich] = useState(false)

  useEffect(() => {
    if (!isOpen || !movieId) return
    setEnriched(null)
    setLoadingEnrich(true)

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY

    const fetchAll = async () => {
      try {
        const [detailsRes, creditsRes, videosRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${apiKey}&language=tr-TR`),
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}/credits?api_key=${apiKey}&language=tr-TR`),
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}/videos?api_key=${apiKey}`),
        ])

        const [details, credits, videos] = await Promise.all([
          detailsRes.json(),
          creditsRes.json(),
          videosRes.json(),
        ])

        const trailer = videos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
        const cast: CastMember[] = (credits.cast || []).slice(0, 5).map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path,
        }))
        const directorEntry = (credits.crew || []).find((c: any) => c.job === 'Director')
        const director = directorEntry?.name || null

        let collection_name: string | null = null
        let collection_movies: CollectionMovie[] = []

        if (details.belongs_to_collection?.id) {
          try {
            const colRes = await fetch(`https://api.themoviedb.org/3/collection/${details.belongs_to_collection.id}?api_key=${apiKey}&language=tr-TR`)
            const colData = await colRes.json()
            collection_name = colData.name || null
            collection_movies = (colData.parts || [])
              .sort((a: any, b: any) => (a.release_date || '').localeCompare(b.release_date || ''))
              .map((p: any) => ({
                id: p.id,
                title: p.title,
                poster_path: p.poster_path,
                release_date: p.release_date ? p.release_date.substring(0, 4) : '',
              }))
          } catch {}
        }

        setEnriched({
          trailer_key: trailer?.key || null,
          cast,
          director,
          collection_name,
          collection_movies,
        })
      } catch {
        setEnriched({ trailer_key: null, cast: [], director: null, collection_name: null, collection_movies: [] })
      } finally {
        setLoadingEnrich(false)
      }
    }

    fetchAll()
  }, [isOpen, movieId, mediaType])

  if (!isOpen) return null

  const displayTitle = title
  const displayOriginal = originalTitle && originalTitle !== title ? originalTitle : null
  const displayTurkish = turkishTitle && turkishTitle !== title ? turkishTitle : null
  const displayRating = voteAverage ?? imdb
  const displayYear = year ?? (releaseDate ? releaseDate.substring(0, 4) : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: '#000000cc' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden relative"
        style={{ background: '#12121a', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: '#00000088', color: '#fff' }}
        >✕</button>

        {backdrop ? (
          <div className="relative" style={{ height: '200px' }}>
            <img src={backdrop} alt={displayTitle} className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
          </div>
        ) : poster ? (
          <div className="relative" style={{ height: '200px' }}>
            <img src={poster} alt={displayTitle} className="w-full h-full object-cover" style={{ objectPosition: 'top' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
          </div>
        ) : null}

        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-2">
              <h2 className="text-xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>{displayTitle}</h2>
              {displayOriginal && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayOriginal}</p>}
              {displayTurkish && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayTurkish}</p>}
            </div>
            {contentType && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold shrink-0" style={{ background: contentType === 'film' ? '#f59e0b22' : '#3b82f622', color: contentType === 'film' ? '#f59e0b' : '#60a5fa' }}>
                {contentType === 'film' ? 'Film' : 'Dizi'}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mb-1 text-sm" style={{ color: '#94a3b8' }}>
            {displayYear && <span>📅 {displayYear}</span>}
            {displayRating != null && displayRating > 0 && <span>⭐ {typeof displayRating === 'number' ? displayRating.toFixed(1) : displayRating}</span>}
            {enriched?.director && <span>🎬 {enriched.director}</span>}
          </div>

          {overview && (
            <p className="text-sm leading-relaxed mt-3 mb-4" style={{ color: '#cbd5e1' }}>{overview}</p>
          )}

          {/* Oyuncu Kadrosu */}
          {enriched && enriched.cast.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#64748b' }}>OYUNCULAR</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {enriched.cast.map(actor => (
                  <div key={actor.id} className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                    <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1" style={{ background: '#1e293b' }}>
                      {actor.profile_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg" style={{ color: '#475569' }}>👤</div>
                      )}
                    </div>
                    <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1' }}>{actor.name.split(' ')[0]}</p>
                    <p className="text-[8px] leading-tight mt-0.5 truncate" style={{ color: '#475569', maxWidth: '60px' }}>{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Film Serisi */}
          {enriched && enriched.collection_name && enriched.collection_movies.length > 1 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#64748b' }}>SERİ: {enriched.collection_name.toUpperCase()}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {enriched.collection_movies.map(cm => (
                  <div key={cm.id} className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: '70px', background: '#0f172a', border: cm.id === movieId ? '2px solid #f59e0b' : '2px solid transparent' }}>
                    {cm.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${cm.poster_path}`} alt={cm.title} className="w-full object-cover" style={{ height: '105px' }} />
                    ) : (
                      <div style={{ height: '105px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
                    )}
                    <p className="text-[8px] p-1 text-center leading-tight" style={{ color: '#94a3b8' }}>{cm.release_date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingEnrich && !enriched && (
            <div className="flex justify-center py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Fragman */}
          {enriched?.trailer_key && (
            <div className="aspect-video rounded-xl overflow-hidden mt-1">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${enriched.trailer_key}`} allowFullScreen allow="autoplay" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
