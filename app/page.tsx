'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import MovieDetailPopup from '@/components/MovieDetailPopup'
import NotificationBell from '@/components/NotificationBell'
import { checkVizyonNotification } from '@/lib/notifications'

interface Stats {
  recommendations: string
  users: string
  titles: string
}

interface PopularMovie {
  title: string
  turkish_title: string
  type: string
  watch_count: number
  poster: string | null
}

interface PickDetail {
  title: string
  turkish_title: string
  type: string
  year: number
  imdb: number
  poster: string | null
  backdrop: string | null
  overview: string | null
  tmdbId: number | null
  mediaType: 'movie' | 'tv'
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({ recommendations: '14.8K+', users: '3.2K+', titles: '850+' })
  const [loaded, setLoaded] = useState(false)
  const [posters, setPosters] = useState<string[]>([])
  const [popularMovies, setPopularMovies] = useState<PopularMovie[]>([])
  const { user } = useAuth()
  const [popup, setPopup] = useState<PickDetail | null>(null)
  const [greeting, setGreeting] = useState('')
  const [reminder, setReminder] = useState<{ id: string; title: string; mood?: string } | null>(null)

  const [dailyPicks, setDailyPicks] = useState<PickDetail[]>([])

  // Saat bazlı karşılama (sağ üst köşe için kısa format)
  useEffect(() => {
    const h = new Date().getHours()
    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''
    const name = firstName ? `, ${firstName}` : ''
    let msg = ''
    if (h >= 6 && h < 12)       msg = `Günaydın${name} ☀️`
    else if (h >= 12 && h < 17) msg = `İyi öğlenler${name} 🌤️`
    else if (h >= 17 && h < 21) msg = `İyi akşamlar${name} 🌅`
    else if (h >= 21 || h < 2)  msg = `İyi geceler${name} 🌙`
    else                         msg = `Geç saatler${name} 🦉`
    setGreeting(msg)
  }, [user])

  // Hatırlatıcı kontrolü
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('ne_izlesem_reminders') || '[]')
      const due = list.find((r: any) => r.reminderTime <= Date.now())
      if (due) setReminder(due)
    } catch {}
  }, [])

  const dismissReminder = (addToWatchlist: boolean) => {
    if (!reminder) return
    // localStorage'dan sil
    try {
      const list = JSON.parse(localStorage.getItem('ne_izlesem_reminders') || '[]')
      localStorage.setItem('ne_izlesem_reminders', JSON.stringify(list.filter((r: any) => r.id !== reminder.id)))
    } catch {}
    setReminder(null)
    if (!addToWatchlist) { window.location.href = '/quiz' }
  }

  useEffect(() => {
    setLoaded(true)
    checkVizyonNotification()
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    // Arka plan posterleri
    try {
      const kultIds = [603, 550, 238, 120, 13, 155, 680, 27205, 78, 11, 424, 539, 278, 510, 497]
      Promise.all(kultIds.map(id => fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=tr-TR`).then(r => r.json()).catch(() => null)))
        .then(results => setPosters(results.filter(Boolean).map((m: any) => m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : '').filter(Boolean)))
    } catch {}
    // Dinamik günün seçimi — TMDB trending
    Promise.all([
      fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=tr-TR`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/trending/tv/day?api_key=${apiKey}&language=tr-TR`).then(r => r.json()),
    ]).then(([movieData, tvData]) => {
      const m = movieData.results?.[0]
      const t = tvData.results?.[0]
      if (m && t) {
        setDailyPicks([
          {
            title: m.original_title || m.title || '',
            turkish_title: m.title || '',
            type: 'film',
            year: parseInt(m.release_date?.substring(0, 4) || '0') || 0,
            imdb: Math.round((m.vote_average || 0) * 10) / 10,
            poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
            backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
            overview: m.overview || null,
            tmdbId: m.id || null,
            mediaType: 'movie',
          },
          {
            title: t.original_name || t.name || '',
            turkish_title: t.name || '',
            type: 'dizi',
            year: parseInt(t.first_air_date?.substring(0, 4) || '0') || 0,
            imdb: Math.round((t.vote_average || 0) * 10) / 10,
            poster: t.poster_path ? `https://image.tmdb.org/t/p/w500${t.poster_path}` : null,
            backdrop: t.backdrop_path ? `https://image.tmdb.org/t/p/w780${t.backdrop_path}` : null,
            overview: t.overview || null,
            tmdbId: t.id || null,
            mediaType: 'tv',
          },
        ])
      }
    }).catch(() => {})
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/popular').then(r => r.json()).then(d => setPopularMovies(d.movies || [])).catch(() => {})
  }, [])

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="absolute inset-0 grid grid-cols-4 gap-1 p-1 opacity-[0.12]" style={{ animation: 'bgScroll 60s linear infinite', height: '200%', marginTop: '-50%' }}>
        {posters.length > 0 ? posters.map((p, i) => (
          <img key={i} src={p} alt="" className="rounded-lg w-full h-full object-cover" loading="lazy" />
        )) : Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rounded-lg" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
        ))}
      </div>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.3) 0%, rgba(10,10,15,0.85) 35%, #0a0a0f 60%)' }} />

      {popup && (
        <MovieDetailPopup
          isOpen={!!popup}
          onClose={() => setPopup(null)}
          movieId={popup.tmdbId}
          mediaType={popup.mediaType}
          title={popup.title}
          turkishTitle={popup.turkish_title !== popup.title ? popup.turkish_title : undefined}
          poster={popup.poster}
          backdrop={popup.backdrop}
          overview={popup.overview}
          year={popup.year}
          imdb={popup.imdb}
          contentType={popup.type === 'film' ? 'film' : 'dizi'}
        />
      )}

      {/* Hatırlatıcı banner */}
      {reminder && (
        <div className="fixed bottom-24 left-4 right-4 z-40 rounded-2xl p-4 border max-w-sm mx-auto" style={{ background: '#12121a', borderColor: '#f59e0b44' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#f59e0b' }}>🔔 İzleme zamanı!</p>
          <p className="text-sm font-medium mb-3" style={{ color: '#f1f5f9' }}>
            <span style={{ color: '#f59e0b' }}>{reminder.title}</span> izleme zamanı!
            {reminder.mood && <span style={{ color: '#64748b' }}> Hâlâ {reminder.mood} misin?</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => dismissReminder(true)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}
            >
              Evet, izliyorum ✓
            </button>
            <button
              onClick={() => dismissReminder(false)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold"
              style={{ background: '#ffffff08', color: '#94a3b8', border: '1px solid #ffffff15' }}
            >
              Hayır, yeni öneri →
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1 px-6 max-w-lg mx-auto w-full">
        <div className="flex justify-between items-center pt-6 pb-4">
          <a href="https://instagram.com/ne_izlesem" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80" style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: '20px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#94a3b8" stroke="none"/></svg>
            Takip Et
          </a>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user ? (
              <span className="text-xs" style={{ color: '#f59e0b88' }}>{greeting}</span>
            ) : (
              <Link href="/profile" className="text-xs font-medium transition-opacity hover:opacity-80" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', padding: '5px 14px', borderRadius: '20px', background: 'rgba(245,158,11,0.08)' }}>
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center" style={{ marginTop: '-20px' }}>
          <div className={loaded ? 'text-center mb-10 transition-all duration-700 opacity-100 translate-y-0' : 'text-center mb-10 transition-all duration-700 opacity-0 translate-y-4'}>
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-5xl font-bold mb-4" style={{ color: '#f59e0b', letterSpacing: '-1px' }}>Ne İzlesem?</h1>
            <p className="text-xl" style={{ color: '#94a3b8', lineHeight: 1.6 }}>Ruh haline göre sana özel<br /><span style={{ color: '#cbd5e1', fontWeight: 500 }}>film ve dizi önerileri</span></p>
          </div>
          {dailyPicks.length > 0 && (
            <div className={loaded ? 'mb-6 transition-all duration-700 delay-100 opacity-100 translate-y-0' : 'mb-6 transition-all duration-700 delay-100 opacity-0 translate-y-4'}>
              <p className="text-center text-[10px] font-semibold mb-2 tracking-widest" style={{ color: '#f59e0b44' }}>GÜNÜN SEÇİMİ</p>
              <div className="flex gap-2 justify-center">
                {dailyPicks.map((pick, i) => (
                  <button key={i} onClick={() => setPopup(pick)} className="rounded-lg overflow-hidden border px-3 py-2 text-left transition-all hover:scale-105 active:scale-95" style={{ background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: pick.type === 'film' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', color: pick.type === 'film' ? '#f59e0b' : '#60a5fa' }}>{pick.type === 'film' ? 'Film' : 'Dizi'}</span>
                      <span className="text-[11px] font-medium" style={{ color: '#e2e8f0' }}>{pick.turkish_title || pick.title}</span>
                    </div>
                    <p className="text-[9px] mt-1" style={{ color: '#475569' }}>{pick.year} • ⭐ {pick.imdb}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {popularMovies.length > 0 && (
            <div className={loaded ? 'w-full mb-6 transition-all duration-700 delay-150 opacity-100 translate-y-0' : 'w-full mb-6 transition-all duration-700 delay-150 opacity-0 translate-y-4'}>
              <p className="text-center text-[10px] font-semibold mb-2 tracking-widest" style={{ color: '#f59e0b44' }}>🔥 EN ÇOK İZLENENLER</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {popularMovies.map((m, i) => (
                  <div key={i} className="flex-shrink-0 rounded-xl overflow-hidden border" style={{ width: '80px', background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}>
                    {m.poster ? (
                      <div className="relative" style={{ height: '108px' }}>
                        <img src={m.poster} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center" style={{ background: 'linear-gradient(0deg, #12121a, transparent)' }}>
                          <span className="text-[8px]" style={{ color: '#f59e0b' }}>👁 {m.watch_count}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: '108px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                        <span style={{ fontSize: '24px' }}>🎬</span>
                      </div>
                    )}
                    <div className="px-1.5 py-1.5">
                      <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {m.turkish_title || m.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
