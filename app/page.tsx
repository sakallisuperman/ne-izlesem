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
      {/* Background poster grid */}
      <div className="absolute inset-0 grid grid-cols-4 gap-1 p-1 opacity-[0.05]">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rounded-lg" style={{
            background: `linear-gradient(${135 + i * 15}deg, #1a1a2e, #16213e)`,
            animationDelay: `${i * 0.5}s`,
          }} />
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.85) 35%, #0a0a0f 60%)',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 max-w-lg mx-auto w-full">
        {/* Top bar */}
        <div className="flex justify-between items-center pt-6 pb-4">
          
            href="https://instagram.com/ne_izlesem"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
            style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="5"/>
              <circle cx="17.5" cy="6.5" r="1.5" fill="#94a3b8" stroke="none"/>
            </svg>
            Takip Et
          </a>
          <Link
            href="/profile"
            className="text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', padding: '5px 14px', borderRadius: '20px', background: 'rgba(245,158,11,0.08)' }}
          >
            Giriş Yap
          </Link>
        </div>

        {/* Hero */}
        <div className={`text-center mt-8 mb-8 transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-4xl">🎬</span>
            <h1 className="text-4xl font-bold" style={{ color: '#f59e0b', letterSpacing: '-1px' }}>
              Ne İzlesem?
            </h1>
          </div>
          <p className="text-base" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
            Ruh haline göre sana özel<br />
            <span style={{ color: '#cbd5e1', fontWeight: 500 }}>film ve dizi önerileri</span>
          </p>
        </div>

        {/* Daily picks */}
        <div className={`mb-8 transition-all duration-700 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-center text-xs font-semibold mb-3 tracking-widest" style={{ color: '#f59e0b' }}>
            ✨ GÜNÜN SEÇİMİ
          </p>
          <div className="flex gap-3 justify-center">
            {/* Film card */}
            <div className="rounded-xl overflow-hidden border" style={{ width: '152px', background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="relative" style={{ height: '110px' }}>
                {daily.film?.poster ? (
                  <img src={daily.film.poster} alt={daily.film.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #2d1b69, #1a1a2e)' }} />
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #12121a)' }} />
                <span className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                  Film
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>
                  {daily.film?.turkish_title || daily.film?.title || 'Yükleniyor...'}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                  {daily.film ? `${daily.film.year} • ⭐ ${daily.film.imdb}` : '...'}
                </p>
              </div>
            </div>

            {/* Dizi card */}
            <div className="rounded-xl overflow-hidden border" style={{ width: '152px', background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="relative" style={{ height: '110px' }}>
                {daily.dizi?.poster ? (
                  <img src={daily.dizi.poster} alt={daily.dizi.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }} />
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #12121a)' }} />
                <span className="absolute top-2 left-2 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                  Dizi
                </span>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-xs font-semibold truncate" style={{ color: '#f1f5f9' }}>
                  {daily.dizi?.turkish_title || daily.dizi?.title || 'Yükleniyor...'}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>
                  {daily.dizi ? `${daily.dizi.year} • ⭐ ${daily.dizi.imdb}` : '...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center mb-8 transition-all duration-700 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Link href="/quiz">
            <button className="relative px-12 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 active:scale-95"
              style={{ background: '#f59e0b', color: '#0a0a0f' }}>
              <span className="absolute inset-0 rounded-full animate-pulse" style={{
                border: '2px solid rgba(245,158,11,0.3)',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              Başla →
            </button>
          </Link>
          <p className="text-xs mt-3" style={{ color: '#475569' }}>
            veya{' '}
            <Link href="/assistant" style={{ color: '#f59e0b', fontWeight: 500 }}>
              asistanla konuşarak
            </Link>
            {' '}öneri al
          </p>
        </div>

        {/* Stats */}
        <div className={`flex justify-center gap-6 mb-6 transition-all duration-700 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{stats.recommendations}</p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>öneri yapıldı</p>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{stats.users}</p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>mutlu kullanıcı</p>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>{stats.titles}</p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>film & dizi</p>
          </div>
        </div>

        {/* Spacer for bottom nav */}
        <div className="pb-20" />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.1); }
        }
      `}</style>
    </main>
  )
}
