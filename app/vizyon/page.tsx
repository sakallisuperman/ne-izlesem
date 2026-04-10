'use client'
import { useEffect, useState } from 'react'
import MovieDetailPopup from '@/components/MovieDetailPopup'
import { formatDateTR } from '@/lib/utils'

interface Movie {
  id: number
  title: string
  original_title: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  release_date: string
  vote_average: number
}

export default function Vizyon() {
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([])
  const [upcoming, setUpcoming] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Movie | null>(null)
  const [tab, setTab] = useState<'now' | 'upcoming'>('now')

  useEffect(() => {
    fetch('/api/vizyon')
      .then(r => r.json())
      .then(data => {
        setNowPlaying(data.now_playing || [])
        setUpcoming(data.upcoming || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const movies = tab === 'now' ? nowPlaying : upcoming

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-lg" style={{ color: '#94a3b8' }}>Yükleniyor...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-6 px-4 pb-24" style={{ background: '#0a0a0f' }}>
      {selected && (
        <MovieDetailPopup
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          movieId={selected.id}
          mediaType="movie"
          title={selected.title}
          originalTitle={selected.original_title}
          poster={selected.poster}
          backdrop={selected.backdrop}
          overview={selected.overview}
          releaseDate={selected.release_date}
          voteAverage={selected.vote_average}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#f59e0b' }}>Vizyondakiler 🎬</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('now')}
            className="px-4 py-2 rounded-full text-xs font-medium transition-all"
            style={{ background: tab === 'now' ? '#f59e0b' : '#12121a', color: tab === 'now' ? '#0a0a0f' : '#94a3b8' }}
          >
            Vizyonda
          </button>
          <button
            onClick={() => setTab('upcoming')}
            className="px-4 py-2 rounded-full text-xs font-medium transition-all"
            style={{ background: tab === 'upcoming' ? '#f59e0b' : '#12121a', color: tab === 'upcoming' ? '#0a0a0f' : '#94a3b8' }}
          >
            Yakında
          </button>
        </div>

        {movies.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: '#94a3b8' }}>Gösterilecek film bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {movies.map(movie => (
              <button
                key={movie.id}
                onClick={() => setSelected(movie)}
                className="rounded-xl overflow-hidden border text-left transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {movie.poster ? (
                  <div className="relative" style={{ height: '200px' }}>
                    <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, #12121a)' }} />
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f59e0b33', color: '#f59e0b' }}>⭐ {movie.vote_average}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '200px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
                )}
                <div className="px-3 py-2.5">
                  <p className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>{movie.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{formatDateTR(movie.release_date)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
