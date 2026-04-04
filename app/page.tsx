'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface Stats {
  recommendations: string
  users: string
  titles: string
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ recommendations: '14.8K+', users: '3.2K+', titles: '850+' })
  const [loaded, setLoaded] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setLoaded(true)
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="absolute inset-0 grid grid-cols-4 gap-1 p-1 opacity-[0.04]">
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
            {user ? (user.user_metadata?.full_name || user.email || "Profil").split(" ")[0] : "Giriş Yap"}
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center" style={{ marginTop: '-20px' }}>
          <div className={loaded ? 'text-center mb-10 transition-all duration-700 opacity-100 translate-y-0' : 'text-center mb-10 transition-all duration-700 opacity-0 translate-y-4'}>
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-5xl font-bold mb-4" style={{ color: '#f59e0b', letterSpacing: '-1px' }}>Ne İzlesem?</h1>
            <p className="text-xl" style={{ color: '#94a3b8', lineHeight: 1.6 }}>Ruh haline göre sana özel<br /><span style={{ color: '#cbd5e1', fontWeight: 500 }}>film ve dizi önerileri</span></p>
          </div>
          <div className={loaded ? 'mb-6 transition-all duration-700 delay-100 opacity-100 translate-y-0' : 'mb-6 transition-all duration-700 delay-100 opacity-0 translate-y-4'}>
            <p className="text-center text-[10px] font-semibold mb-2 tracking-widest" style={{ color: '#f59e0b44' }}>GÜNÜN SEÇİMİ</p>
            <div className="flex gap-2 justify-center">
              <DailyCard title="Esaretin Bedeli" year={1994} imdb={9.3} type="film" />
              <DailyCard title="Breaking Bad" year={2008} imdb={9.5} type="dizi" />
            </div>
          </div>
          <div className={loaded ? 'text-center mb-8 transition-all duration-700 delay-200 opacity-100 translate-y-0' : 'text-center mb-8 transition-all duration-700 delay-200 opacity-0 translate-y-4'}>
            <Link href="/quiz"><button className="px-14 py-5 rounded-full text-xl font-semibold transition-all hover:scale-105 active:scale-95" style={{ background: '#f59e0b', color: '#0a0a0f' }}>Başla →</button></Link>
            <p className="text-sm mt-3" style={{ color: '#475569' }}>veya <Link href="/assistant" style={{ color: '#f59e0b', fontWeight: 500 }}>asistanla konuşarak</Link> öneri al</p>
          </div>
          <div className={loaded ? 'flex justify-center gap-5 transition-all duration-700 delay-400 opacity-100 translate-y-0' : 'flex justify-center gap-5 transition-all duration-700 delay-400 opacity-0 translate-y-4'}>
            <div className="text-center"><p className="text-[11px] font-medium" style={{ color: '#ffffff20' }}>{stats.recommendations} öneri</p></div>
            <div className="text-center"><p className="text-[11px] font-medium" style={{ color: '#ffffff20' }}>{stats.users} kullanıcı</p></div>
            <div className="text-center"><p className="text-[11px] font-medium" style={{ color: '#ffffff20' }}>{stats.titles} içerik</p></div>
          </div>
        </div>
        <div className="pb-20" />
      </div>
    </main>
  )
}

function DailyCard({ title, year, imdb, type }: { title: string; year: number; imdb: number; type: string }) {
  const isFilm = type === 'film'
  return (
    <div className="rounded-lg overflow-hidden border px-3 py-2" style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: isFilm ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', color: isFilm ? '#f59e0b' : '#60a5fa' }}>{isFilm ? 'Film' : 'Dizi'}</span>
        <span className="text-[11px] font-medium" style={{ color: '#e2e8f0' }}>{title}</span>
      </div>
      <p className="text-[9px] mt-1" style={{ color: '#475569' }}>{year} • ⭐ {imdb}</p>
    </div>
  )
}
