'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DailyPick {
  title: string
  turkish_title: string
  type: string
  year: number
  imdb: number
  poster: string | null
}

interface Stats {
  recommendations: string
  users: string
  titles: string
}

export default function Home() {
  const [daily, setDaily] = useState<{ film: DailyPick | null; dizi: DailyPick | null }>({ film: null, dizi: null })
  const [stats, setStats] = useState<Stats>({ recommendations: '14.8K+', users: '3.2K+', titles: '850+' })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(true)
    fetch('/api/daily-picks').then(r => r.json()).then(setDaily).catch(() => {})
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="absolute inset-0 grid grid-cols-4 gap-1 p-1 opacity-[0.05]">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rounded-lg" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
        ))}
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.85) 35%, #0a0a0f 60%)' }} />
      <div className="relative z-10 flex flex-col flex-1 px-6 max-w-lg mx-auto w-full">
        <div className="flex justify-between items-center pt-6 pb-4">
          <a href="https://instagram.com/ne_izlesem" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80" style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#94a3b8" stroke="none"/></svg>
            Takip Et
          </a>
          <Link href="/profile" className="text-xs font-medium transition-opacity hover:opacity-80" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', padding: '5px 14px', borderRadius: '20px', background: 'rgba(245,158,11,0.08)' }}>
            Giriş Yap
          </Link>
        </div>
        <div className={loaded ? 'text-center mt-6 mb-6 transition-all duration-700 opacity-100 translate-y-0' : 'text-center mt-6 mb-6 transition-all duration-700 opacity-0 translate-y-4'}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-5xl">🎬</span>
            <h1 className="text-5xl font-bold" style={{ color: '#f59e0b', letterSpacing: '-1px' }}>Ne İzlesem?</h1>
          </div>
          <p className="text-xl" style={{ color: '#94a3b8', lineHeight: 1.6 }}>Ruh haline göre sana özel<br /><span style={{ color: '#cbd5e1', fontWeight: 500 }}>film ve dizi önerileri</span></p>
        </div>
        <div className={loaded ? 'mb-6 transition-all duration-700 delay-200 opacity-100 translate-y-0' : 'mb-6 transition-all duration-700 delay-200 opacity-0 translate-y-4'}>
          <p className="text-center text-xs font-semibold mb-3 tracking-widest" style={{ color: '#f59e0b' }}>✨ GÜNÜN SEÇİMİ</p>
          <div className="flex gap-3 justify-center">
            <DailyCard pick={daily.film} type="film" />
            <DailyCard pick={daily.dizi} type="dizi" />
          </div>
        </div>
        <div className={loaded ? 'text-center mb-8 transition-all duration-700 delay-300 opacity-100 translate-y-0' : 'text-center mb-8 transition-all duration-700 delay-300 opacity-0 translate-y-4'}>
          <Link href="/quiz"><button className="px-14 py-5 rounded-full text-xl font-semibold transition-all hover:scale-105 active:scale-95" style={{ background: '#f59e0b', color: '#0a0a0f' }}>Başla →</button></Link>
          <p className="text-sm mt-3" style={{ color: '#475569' }}>veya <Link href="/assistant" style={{ color: '#f59e0b', fontWeight: 500 }}>asistanla konuşarak</Link> öneri al</p>
        </div>
        <div className={loaded ? 'flex justify-center gap-6 mb-6 transition-all duration-700 delay-500 opacity-100 translate-y-0' : 'flex justify-center gap-6 mb-6 transition-all duration-700 delay-500 opacity-0 translate-y-4'}>
          <div className="text-center"><p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{stats.recommendations}</p><p className="text-[10px]" style={{ color: '#64748b' }}>öneri yapıldı</p></div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
          <div className="text-center"><p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{stats.users}</p><p className="text-[10px]" style={{ color: '#64748b' }}>mutlu kullanıcı</p></div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
          <div className="text-center"><p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{stats.titles}</p><p className="text-[10px]" style={{ color: '#64748b' }}>film & dizi</p></div>
        </div>
        <div className="pb-20" />
      </div>
    </main>
  )
}

function DailyCard({ pick, type }: { pick: DailyPick | null; type: string }) {
  const isFilm = type === 'film'
  return (
    <div className="rounded-xl overflow-hidden border" style={{ width: '140px', background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="relative" style={{ height: '85px' }}>
        {pick?.poster ? (
          <img src={pick.poster} alt={pick.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: isFilm ? 'linear-gradient(135deg, #2d1b69, #1a1a2e)' : 'linear-gradient(135deg, #1e3a5f, #0f172a)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #12121a)' }} />
        <span className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: isFilm ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)', color: isFilm ? '#f59e0b' : '#60a5fa' }}>{isFilm ? 'Film' : 'Dizi'}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>{pick?.turkish_title || pick?.title || 'Yükleniyor...'}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{pick ? pick.year + ' • ⭐ ' + pick.imdb : '...'}</p>
      </div>
    </div>
  )
}
