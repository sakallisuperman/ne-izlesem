'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import StarRating from '@/components/StarRating'

interface Recommendation {
  title: string
  turkish_title: string
  type: string
  year: number
  duration: string
  imdb: number
  platform: string
  reason: string
  tags: string[]
}

interface TMDBResult {
  poster_path: string | null
  trailer_key: string | null
}

async function fetchTMDB(title: string, type: string): Promise<TMDBResult> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
  const mediaType = type === 'film' ? 'movie' : 'tv'
  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=tr-TR`
  )
  const searchData = await searchRes.json()
  const item = searchData.results?.[0]
  if (!item) return { poster_path: null, trailer_key: null }
  const videoRes = await fetch(
    `https://api.themoviedb.org/3/${mediaType}/${item.id}/videos?api_key=${apiKey}`
  )
  const videoData = await videoRes.json()
  const trailer = videoData.results?.find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  )
  return {
    poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    trailer_key: trailer?.key || null,
  }
}

export default function Results() {
  const router = useRouter()
  const { user, signInWithGoogle } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [tmdbData, setTmdbData] = useState<Record<number, TMDBResult>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set())
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    const answers = JSON.parse(localStorage.getItem('quiz_answers') || '{}')
    if (!Object.keys(answers).length) {
      router.push('/quiz')
      return
    }
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, excludeTitles: JSON.parse(localStorage.getItem('watched_titles') || '[]') }),
    })
      .then(r => r.json())
      .then(async data => {
        if (data.error) throw new Error(data.error)
        setRecommendations(data.recommendations)
        const tmdb: Record<number, TMDBResult> = {}
        await Promise.all(
          data.recommendations.map(async (rec: Recommendation, i: number) => {
            tmdb[i] = await fetchTMDB(rec.title, rec.type)
          })
        )
        setTmdbData(tmdb)
      })
      .catch(() => setError('Bir sorun oluştu, tekrar dene'))
      .finally(() => setLoading(false))
  }, [])

  const shareRec = async (rec: Recommendation, index: number) => {
    const text = `"${rec.title}" ${rec.type === 'dizi' ? 'dizisini' : 'filmini'} izlemelisin! 🎬`
    const url = 'https://ne-izlesemapp.vercel.app'
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: rec.title, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      }
      // Paylaşım için puan ver
      if (user) { supabase.rpc('award_share_points').then(() => {}) }
    } catch {}
  }

  const saveToWatchlist = async (rec: Recommendation, index: number) => {
    if (!user) {
      signInWithGoogle()
      return
    }
    setSavingIndex(index)
    const { error } = await supabase.from('watchlist').insert({
      user_id: user.id,
      title: rec.title,
      turkish_title: rec.turkish_title,
      type: rec.type,
      year: rec.year,
      duration: rec.duration,
      imdb: rec.imdb,
      platform: rec.platform,
      reason: rec.reason,
      tags: rec.tags,
    })
    if (!error) {
      setSavedItems(prev => { const next = new Set(Array.from(prev)); next.add(index); return next })
    }
    setSavingIndex(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center" style={{background: '#0a0a0f'}}>
        <div className="text-6xl mb-6 animate-bounce">🎬</div>
        <p className="text-xl font-medium" style={{color: '#f59e0b'}}>Sana özel seçkini hazırlıyoruz...</p>
        <p className="text-sm mt-3" style={{color: '#94a3b8'}}>Bu birkaç saniye sürebilir</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center" style={{background: '#0a0a0f'}}>
        <div className="text-6xl mb-6">😔</div>
        <p className="text-xl mb-6" style={{color: '#f1f5f9'}}>{error}</p>
        <button onClick={() => router.push('/quiz')} className="px-8 py-3 rounded-full font-semibold" style={{background: '#f59e0b', color: '#0a0a0f'}}>
          Tekrar Dene
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-6" style={{background: '#0a0a0f'}}>
      {activeTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: '#000000cc'}} onClick={() => setActiveTrailer(null)}>
          <div className="w-full max-w-3xl aspect-video px-4" onClick={e => e.stopPropagation()}>
            <iframe className="w-full h-full rounded-2xl" src={`https://www.youtube.com/embed/${activeTrailer}?autoplay=1`} allowFullScreen allow="autoplay" />
            <button className="mt-4 text-sm w-full text-center" style={{color: '#94a3b8'}} onClick={() => setActiveTrailer(null)}>
              Kapat ✕
            </button>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2" style={{color: '#f59e0b'}}>Senin İçin Seçtik 🎬</h1>
        <p className="text-center mb-10" style={{color: '#94a3b8'}}>Ruh haline göre 6 öneri — 3 film, 3 dizi</p>
        <div className="flex flex-col gap-6">
          {recommendations.map((rec, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border" style={{background: '#12121a', borderColor: '#ffffff15'}}>
              {tmdbData[i]?.poster_path && (
                <div className="relative">
                  <img src={tmdbData[i].poster_path!} alt={rec.title} className="w-full object-cover" style={{maxHeight: '300px', objectPosition: 'top'}} loading="lazy" />
                  {tmdbData[i]?.trailer_key && (
                    <button onClick={() => setActiveTrailer(tmdbData[i].trailer_key!)} className="absolute inset-0 flex items-center justify-center" style={{background: '#00000066'}}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background: '#f59e0b'}}>
                        <span className="text-2xl ml-1">▶</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-bold" style={{color: '#f1f5f9'}}>{rec.title}</h2>
                    {rec.turkish_title && rec.turkish_title !== rec.title && (
                      <p className="text-sm" style={{color: '#94a3b8'}}>{rec.turkish_title}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold ml-3 shrink-0"
                    style={{background: rec.type === 'film' ? '#f59e0b22' : '#3b82f622', color: rec.type === 'film' ? '#f59e0b' : '#3b82f6', border: `1px solid ${rec.type === 'film' ? '#f59e0b44' : '#3b82f644'}`}}>
                    {rec.type === 'film' ? '🎥 Film' : '📺 Dizi'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mb-3 text-sm" style={{color: '#94a3b8'}}>
                  <span>📅 {rec.year}</span>
                  <span>⏱ {rec.duration}</span>
                  <span>⭐ {rec.imdb}</span>
                  {rec.platform && <span>📺 {rec.platform}</span>}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{color: '#cbd5e1'}}>{rec.reason}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {rec.tags?.map((tag, j) => (
                    <span key={j} className="px-2 py-1 rounded-full text-xs" style={{background: '#ffffff10', color: '#94a3b8'}}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveToWatchlist(rec, i)}
                    disabled={savedItems.has(i) || savingIndex === i}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all border"
                    style={{
                      background: savedItems.has(i) ? '#22c55e22' : '#f59e0b11',
                      color: savedItems.has(i) ? '#22c55e' : '#f59e0b',
                      borderColor: savedItems.has(i) ? '#22c55e44' : '#f59e0b33',
                    }}
                  >
                    {savedItems.has(i) ? '✓ Kaydedildi' : savingIndex === i ? 'Kaydediliyor...' : user ? '+ Listeme Ekle' : '+ Kaydet'}
                  </button>
                  <button
                    onClick={() => shareRec(rec, i)}
                    className="px-4 py-3 rounded-xl text-sm font-semibold transition-all border flex items-center gap-1.5"
                    style={{
                      background: copiedIndex === i ? '#22c55e22' : '#ffffff08',
                      color: copiedIndex === i ? '#22c55e' : '#94a3b8',
                      borderColor: copiedIndex === i ? '#22c55e44' : '#ffffff15',
                    }}
                  >
                    {copiedIndex === i ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    )}
                    {copiedIndex === i ? 'Kopyalandı' : 'Öner'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center flex-wrap mt-10">
          <button onClick={() => router.push('/')}
            className="px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 border"
            style={{background: 'transparent', color: '#94a3b8', borderColor: '#ffffff20'}}>
            Ana Sayfa
          </button>
          <button onClick={() => router.push('/quiz')}
            className="px-10 py-4 rounded-full font-semibold transition-all hover:scale-105"
            style={{background: '#f59e0b', color: '#0a0a0f'}}>
            Tekrar Başla
          </button>
        </div>
      </div>
    </main>
  )
}
