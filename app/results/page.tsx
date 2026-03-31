'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Recommendation {
  title: string
  turkish_title: string
  type: string
  year: number
  duration: string
  imdb: number
  reason: string
  tags: string[]
}

export default function Results() {
  const router = useRouter()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      .then(data => {
        if (data.error) throw new Error(data.error)
        setRecommendations(data.recommendations)
      })
      .catch(() => setError('Bir sorun oluştu, tekrar dene'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <main className="min-h-screen flex flex-col items-center justify-center" style={{background: '#0a0a0f'}}>
      <div className="text-6xl mb-6 animate-bounce">🎬</div>
      <p className="text-xl font-medium" style={{color: '#f59e0b'}}>Sana özel seçkini hazırlıyoruz...</p>
      <p className="text-sm mt-3" style={{color: '#94a3b8'}}>Bu birkaç saniye sürebilir</p>
    </main>
  )

  if (error) return (
    <main className="min-h-screen flex flex-col items-center justify-center" style={{background: '#0a0a0f'}}>
      <div className="text-6xl mb-6">😔</div>
      <p className="text-xl mb-6" style={{color: '#f1f5f9'}}>{error}</p>
      <button onClick={() => router.push('/quiz')}
        className="px-8 py-3 rounded-full font-semibold"
        style={{background: '#f59e0b', color: '#0a0a0f'}}>
        Tekrar Dene
      </button>
    </main>
  )

  return (
    <main className="min-h-screen py-12 px-6" style={{background: '#0a0a0f'}}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2" style={{color: '#f59e0b'}}>Senin İçin Seçtik 🎬</h1>
        <p className="text-center mb-10" style={{color: '#94a3b8'}}>Ruh haline göre 5 öneri</p>
        <div className="flex flex-col gap-6">
          {recommendations.map((rec, i) => (
            <div key={i} className="rounded-2xl p-6 border" style={{background: '#12121a', borderColor: '#ffffff15'}}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold" style={{color: '#f1f5f9'}}>{rec.title}</h2>
                  {rec.turkish_title && rec.turkish_title !== rec.title && (
                    <p className="text-sm" style={{color: '#94a3b8'}}>{rec.turkish_title}</p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold ml-3 shrink-0"
                  style={{background: rec.type === 'film' ? '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44'}}>
                  {rec.type === 'film' ? '🎥 Film' : '📺 Dizi'}
                </span>
              </div>
              <div className="flex gap-4 mb-3 text-sm" style={{color: '#94a3b8'}}>
                <span>📅 {rec.year}</span>
                <span>⏱ {rec.duration}</span>
                <span>⭐ {rec.imdb}</span>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{color: '#cbd5e1'}}>{rec.reason}</p>
              <div className="flex flex-wrap gap-2">
                {rec.tags?.map((tag, j) => (
                  <span key={j} className="px-2 py-1 rounded-full text-xs" style={{background: '#ffffff10', color: '#94a3b8'}}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
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
