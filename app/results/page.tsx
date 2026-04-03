'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    const answers = JSON.parse(localStorage.getItem('quiz_answers') || '{}')
    if (!Object.keys(answers).length) {
      router.push('/quiz')
      return
    }
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
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
      setSavedItems(prev => { const next = new Set(Array.from(prev)); next.add(index); return next; })
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
        <div className="flex gap-3 justify-center flex-wrap">
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
        </div>
      </div>
    </main>
  )
}
