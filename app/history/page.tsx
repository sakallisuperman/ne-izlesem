'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MovieDetailPopup from '@/components/MovieDetailPopup'
import PersonPopup from '@/components/PersonPopup'

interface WatchlistItem {
  id: string
  title: string
  turkish_title: string
  type: string
  year: number
  duration: string
  imdb: number
  platform: string
  reason: string
  tags: string[]
  status: string
  created_at: string
}

interface FavoriteActor {
  id: string
  actor_id: number
  actor_name: string
  profile_path: string | null
}

interface DetailState {
  tmdb_id: number | null
  media_type: 'movie' | 'tv'
  title: string
  turkish_title: string
  type: string
  year: number
  imdb: number
  poster: string | null
  backdrop: string | null
  overview: string | null
}

type FilterType = 'all' | 'saved' | 'watched' | 'actors'

export default function History() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [favoriteActors, setFavoriteActors] = useState<FavoriteActor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  // URL param ile başlangıç tab seçimi (profil sayfasından yönlendirme)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as FilterType | null
    if (tab === 'saved' || tab === 'watched' || tab === 'actors') {
      setFilter(tab)
    }
  }, [])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedActor, setSelectedActor] = useState<FavoriteActor | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    Promise.all([
      supabase.from('watchlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('favorite_actors').select('id, actor_id, actor_name, profile_path').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([watchlistRes, actorsRes]) => {
      setItems(watchlistRes.data || [])
      setFavoriteActors(actorsRes.data || [])
      setLoading(false)
    })
  }, [user, authLoading])

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('watchlist').update({ status }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const removeItem = async (id: string) => {
    await supabase.from('watchlist').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const openDetail = async (item: WatchlistItem) => {
    setDetailLoading(true)
    setDetailOpen(true)
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    const mediaType = item.type === 'film' ? 'movie' : 'tv'
    let tmdb_id: number | null = null
    let poster: string | null = null
    let backdrop: string | null = null
    let overview: string | null = null
    try {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(item.title)}&language=tr-TR`)
      const searchData = await searchRes.json()
      const found = searchData.results?.[0]
      if (found) {
        tmdb_id = found.id || null
        poster = found.poster_path ? `https://image.tmdb.org/t/p/w500${found.poster_path}` : null
        backdrop = found.backdrop_path ? `https://image.tmdb.org/t/p/w780${found.backdrop_path}` : null
        overview = found.overview || null
      }
    } catch {}
    setDetail({ tmdb_id, media_type: mediaType, title: item.title, turkish_title: item.turkish_title, type: item.type, year: item.year, imdb: item.imdb, poster, backdrop, overview })
    setDetailLoading(false)
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pb-20" style={{ background: '#0a0a0f' }}>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i*150}ms` }} />)}
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl mb-6">📋</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#f1f5f9' }}>Önerilerini Kaydet</h1>
        <p className="text-center mb-8 max-w-sm" style={{ color: '#94a3b8' }}>
          Giriş yap, beğendiğin önerileri kaydet ve izlediklerini işaretle.
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105"
          style={{ background: '#ffffff', color: '#0a0a0f' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google ile Giriş Yap
        </button>
      </main>
    )
  }

  const savedItems = items.filter(i => i.status === 'saved')
  const watchedItems = items.filter(i => i.status === 'watched')
  const allItems = items

  const filteredItems = filter === 'saved' ? savedItems : filter === 'watched' ? watchedItems : allItems

  const TABS = [
    { key: 'all' as FilterType, label: 'Tümü', count: allItems.length },
    { key: 'saved' as FilterType, label: 'İzleme Listem', count: savedItems.length },
    { key: 'watched' as FilterType, label: 'İzlediklerim', count: watchedItems.length },
    { key: 'actors' as FilterType, label: 'Sevdiğim Oyuncular', count: favoriteActors.length },
  ]

  return (
    <main className="min-h-screen pt-8 px-6 pb-24" style={{ background: '#0a0a0f' }}>
      {/* MovieDetailPopup */}
      {detailOpen && detail && (
        <MovieDetailPopup
          isOpen={detailOpen && !detailLoading}
          onClose={() => { setDetailOpen(false); setDetail(null) }}
          movieId={detail.tmdb_id}
          mediaType={detail.media_type}
          title={detail.title}
          turkishTitle={detail.turkish_title !== detail.title ? detail.turkish_title : undefined}
          poster={detail.poster}
          backdrop={detail.backdrop}
          overview={detail.overview}
          year={detail.year}
          imdb={detail.imdb}
          contentType={detail.type === 'film' ? 'film' : 'dizi'}
        />
      )}

      {/* PersonPopup for favorite actors */}
      {selectedActor && (
        <PersonPopup
          personId={selectedActor.actor_id}
          personName={selectedActor.actor_name}
          personProfile={selectedActor.profile_path ? `https://image.tmdb.org/t/p/w185${selectedActor.profile_path}` : null}
          onClose={() => setSelectedActor(null)}
        />
      )}

      {/* Loading overlay */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#000000cc' }}>
          <div className="flex gap-2">
            {[0,1,2].map(i => <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i*150}ms` }} />)}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#f59e0b' }}>Önerilerim 📋</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all flex-shrink-0 flex items-center gap-1"
              style={{
                background: filter === tab.key ? '#f59e0b' : '#12121a',
                color: filter === tab.key ? '#0a0a0f' : '#94a3b8',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] rounded-full px-1.5" style={{ background: filter === tab.key ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Favori oyuncular tab */}
        {filter === 'actors' && (
          favoriteActors.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">❤️</div>
              <p style={{ color: '#94a3b8' }}>Henüz favori oyuncun yok.</p>
              <p className="text-sm mt-2" style={{ color: '#475569' }}>Oyuncu profillerinde ❤️ butonuna bas!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {favoriteActors.map(actor => (
                <button
                  key={actor.id}
                  onClick={() => setSelectedActor(actor)}
                  className="rounded-xl border p-3 text-center transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: '#12121a', borderColor: '#7F77DD33' }}
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 border-2" style={{ borderColor: '#7F77DD' }}>
                    {actor.profile_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                        alt={`${actor.actor_name} profil fotoğrafı`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: '#1e293b' }}>👤</div>
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-tight" style={{ color: '#f1f5f9' }}>{actor.actor_name}</p>
                </button>
              ))}
            </div>
          )
        )}

        {/* Film/dizi listesi */}
        {filter !== 'actors' && (
          filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🎬</div>
              <p style={{ color: '#94a3b8' }}>
                {filter === 'saved' ? 'İzleme listen boş.' : filter === 'watched' ? 'Henüz hiçbir şey izlemedin.' : 'Listelediğin bir şey yok.'}
              </p>
              <button
                onClick={() => router.push('/quiz')}
                className="mt-4 px-6 py-2 rounded-full text-sm font-semibold"
                style={{ background: '#f59e0b', color: '#0a0a0f' }}
              >
                Quiz'e Başla
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: '#12121a', borderColor: '#ffffff15' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="font-bold" style={{ color: '#f1f5f9' }}>{item.title}</h3>
                      {item.turkish_title && item.turkish_title !== item.title && (
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{item.turkish_title}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {item.status === 'saved' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b22', color: '#f59e0b' }}>⏳ Listede</span>
                      )}
                      {item.status === 'watched' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#22c55e22', color: '#22c55e' }}>✓ İzlendi</span>
                      )}
                      <span className="text-xs px-2 py-1 rounded-full" style={{
                        background: item.type === 'film' ? '#f59e0b22' : '#3b82f622',
                        color: item.type === 'film' ? '#f59e0b' : '#3b82f6',
                      }}>
                        {item.type === 'film' ? 'Film' : 'Dizi'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs mb-3" style={{ color: '#64748b' }}>
                    {item.imdb > 0 && <span>⭐ {item.imdb}</span>}
                    {item.year > 0 && <span>{item.year}</span>}
                    {item.platform && <span>📺 {item.platform}</span>}
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    {item.status === 'saved' && (
                      <button
                        onClick={() => updateStatus(item.id, 'watched')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                        style={{ background: '#22c55e22', color: '#22c55e' }}
                      >
                        ✓ İzledim
                      </button>
                    )}
                    {item.status === 'watched' && (
                      <button
                        onClick={() => updateStatus(item.id, 'saved')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                        style={{ background: '#3b82f622', color: '#60a5fa' }}
                      >
                        ↩ Listeye Geri Al
                      </button>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{ background: '#ef444422', color: '#ef4444' }}
                    >
                      Kaldır
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  )
}
