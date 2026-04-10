'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

interface PopupData {
  title: string
  turkish_title: string
  type: string
  year: number
  imdb: number
  platform: string
  reason: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  trailer_key: string | null
}

export default function History() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'saved' | 'watched'>('all')
  const [popup, setPopup] = useState<PopupData | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    fetchWatchlist()
  }, [user, authLoading])

  const fetchWatchlist = async () => {
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    undefined
    setItems(items.map(i => i.id === id ? { ...i, status } : i))
  }

  const removeItem = async (id: string) => {
    await supabase.from('watchlist').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  const openDetail = async (item: WatchlistItem) => {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    const mediaType = item.type === 'film' ? 'movie' : 'tv'
    let poster = null, backdrop = null, overview = null, trailer_key = null
    try {
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(item.title)}&language=tr-TR`)
      const searchData = await searchRes.json()
      const found = searchData.results?.[0]
      if (found) {
        poster = found.poster_path ? `https://image.tmdb.org/t/p/w500${found.poster_path}` : null
        backdrop = found.backdrop_path ? `https://image.tmdb.org/t/p/w780${found.backdrop_path}` : null
        overview = found.overview || null
        const vidRes = await fetch(`https://api.themoviedb.org/3/${mediaType}/${found.id}/videos?api_key=${apiKey}`)
        const vidData = await vidRes.json()
        const tr = vidData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
        trailer_key = tr?.key || null
      }
    } catch {}
    setPopup({
      title: item.title,
      turkish_title: item.turkish_title,
      type: item.type,
      year: item.year,
      imdb: item.imdb,
      platform: item.platform,
      reason: item.reason,
      poster, backdrop, overview, trailer_key,
    })
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-lg" style={{ color: '#94a3b8' }}>Yükleniyor...</div>
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

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <main className="min-h-screen pt-8 px-6 pb-24" style={{ background: '#0a0a0f' }}>
      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#000000cc' }} onClick={() => setPopup(null)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden relative" style={{ background: '#12121a', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPopup(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: '#00000088', color: '#fff' }}>✕</button>
            {popup.backdrop ? (
              <div className="relative" style={{ height: '200px' }}>
                <img src={popup.backdrop} alt={popup.title} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
              </div>
            ) : popup.poster ? (
              <div className="relative" style={{ height: '200px' }}>
                <img src={popup.poster} alt={popup.title} className="w-full h-full object-cover" style={{ objectPosition: 'top' }} loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
              </div>
            ) : null}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{popup.title}</h2>
                  {popup.turkish_title && popup.turkish_title !== popup.title && (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>{popup.turkish_title}</p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold ml-3 shrink-0" style={{ background: popup.type === 'film' ? '#f59e0b22' : '#3b82f622', color: popup.type === 'film' ? '#f59e0b' : '#60a5fa' }}>
                  {popup.type === 'film' ? 'Film' : 'Dizi'}
                </span>
              </div>
              <div className="flex gap-3 mb-3 text-sm" style={{ color: '#94a3b8' }}>
                <span>📅 {popup.year}</span>
                <span>⭐ {popup.imdb}</span>
                {popup.platform && <span>📺 {popup.platform}</span>}
              </div>
              {popup.overview && (
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#cbd5e1' }}>{popup.overview}</p>
              )}
              {popup.reason && (
                <p className="text-xs italic mb-4" style={{ color: '#94a3b8' }}>"{popup.reason}"</p>
              )}
              {popup.trailer_key && (
                <div className="aspect-video rounded-xl overflow-hidden">
                  <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${popup.trailer_key}`} allowFullScreen allow="autoplay" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#f59e0b' }}>Önerilerim 📋</h1>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'Tümü' },
            { key: 'saved', label: 'İzleme Listem' },
            { key: 'watched', label: 'İzlediklerim' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === f.key ? '#f59e0b' : '#12121a',
                color: filter === f.key ? '#0a0a0f' : '#94a3b8',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🎬</div>
            <p style={{ color: '#94a3b8' }}>Henüz listelediğin bir şey yok. Quiz'den veya önerilerden beğendiklerini ekle!</p>
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
            {filtered.map(item => (
              <button
                key={item.id}
                onClick={() => openDetail(item)}
                className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: '#12121a', borderColor: '#ffffff15' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold" style={{ color: '#f1f5f9' }}>{item.title}</h3>
                    {item.turkish_title && item.turkish_title !== item.title && (
                      <p className="text-xs" style={{ color: '#94a3b8' }}>{item.turkish_title}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    background: item.type === 'film' ? '#f59e0b22' : '#3b82f622',
                    color: item.type === 'film' ? '#f59e0b' : '#3b82f6',
                  }}>
                    {item.type === 'film' ? 'Film' : 'Dizi'}
                  </span>
                </div>
                <div className="flex gap-3 text-xs mb-3" style={{ color: '#64748b' }}>
                  <span>⭐ {item.imdb}</span>
                  <span>{item.year}</span>
                  {item.platform && <span>📺 {item.platform}</span>}
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {item.status !== 'watched' && (
                    <button
                      onClick={() => updateStatus(item.id, 'watched')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: '#22c55e22', color: '#22c55e' }}
                    >
                      Bunu İzledim
                    </button>
                  )}
                  {item.status === 'watched' && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: '#22c55e22', color: '#22c55e' }}>
                      ✓ İzlendi
                    </span>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: '#ef444422', color: '#ef4444' }}
                  >
                    Kaldır
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
