'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import { checkBadgeNotification } from '@/lib/notifications'

interface Stats {
  watchlist: number
  watched: number
  reviews: number
}

const BADGE_THRESHOLDS = [
  { name: 'Yeni Üye',          emoji: '🌱', min: 0,   next: 50  },
  { name: 'Film Sever',         emoji: '🎬', min: 50,  next: 150 },
  { name: 'Sinefil',            emoji: '🎭', min: 150, next: 300 },
  { name: 'Film Gurmesi',       emoji: '🏆', min: 300, next: 500 },
  { name: 'Efsane Eleştirmen',  emoji: '⭐', min: 500, next: null },
]

const PLATFORMS = ['Netflix', 'Amazon Prime', 'Disney+', 'BluTV', 'MUBI', 'Exxen', 'Gain', 'HBO Max', 'Tabii']

function ShareButton() {
  const [shared, setShared] = useState(false)
  const share = async () => {
    const data = { title: 'Ne İzlesem?', text: 'Ruh haline göre film ve dizi önerileri için bu uygulamayı dene!', url: 'https://ne-izlesemapp.vercel.app' }
    if (navigator.share) {
      try { await navigator.share(data); setShared(true); setTimeout(() => setShared(false), 2000) } catch {}
    } else {
      await navigator.clipboard.writeText(data.url)
      setShared(true); setTimeout(() => setShared(false), 2000)
    }
  }
  return (
    <button
      onClick={share}
      className="w-full py-3 rounded-xl font-medium transition-all border mb-3"
      style={{ background: shared ? '#22c55e22' : '#12121a', color: shared ? '#22c55e' : '#94a3b8', borderColor: shared ? '#22c55e33' : '#ffffff15' }}
    >
      {shared ? '✓ Paylaşıldı!' : '🔗 Uygulamayı Paylaş'}
    </button>
  )
}

export default function Profile() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  const [stats, setStats]                 = useState<Stats>({ watchlist: 0, watched: 0, reviews: 0 })
  const [statsLoading, setStatsLoading]   = useState(false)
  const [points, setPoints]               = useState(0)
  const [badge, setBadge]                 = useState('Yeni Üye')
  const [platforms, setPlatforms]         = useState<string[]>([])
  const [savingPlatforms, setSavingPlatforms] = useState(false)
  const [platformsSaved, setPlatformsSaved]   = useState(false)

  useEffect(() => {
    if (!user) return
    setStatsLoading(true)

    Promise.all([
      supabase.from('watchlist').select('status').eq('user_id', user.id),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_points').select('total_points, badge').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('preferred_platforms').eq('id', user.id).maybeSingle(),
    ]).then(([wlRes, revRes, pointsRes, profileRes]) => {
      const items = wlRes.data || []
      setStats({
        watchlist: items.filter(i => i.status === 'saved').length,
        watched:   items.filter(i => i.status === 'watched').length,
        reviews:   revRes.count || 0,
      })
      if (pointsRes.data) {
        setPoints(pointsRes.data.total_points)
        setBadge(pointsRes.data.badge)
        checkBadgeNotification(pointsRes.data.badge)
      }
      if (profileRes.data?.preferred_platforms) {
        setPlatforms(profileRes.data.preferred_platforms)
      }
      setStatsLoading(false)
    })
  }, [user])

  const togglePlatform = (p: string) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
    setPlatformsSaved(false)
  }

  const savePlatforms = async () => {
    if (!user) return
    setSavingPlatforms(true)
    await supabase.from('profiles').upsert(
      { id: user.id, preferred_platforms: platforms },
      { onConflict: 'id' }
    )
    setSavingPlatforms(false)
    setPlatformsSaved(true)
    setTimeout(() => setPlatformsSaved(false), 2000)
  }

  const badgeInfo    = BADGE_THRESHOLDS.find(b => b.name === badge) || BADGE_THRESHOLDS[0]
  const progressPct  = badgeInfo.next
    ? Math.min(100, Math.round(((points - badgeInfo.min) / (badgeInfo.next - badgeInfo.min)) * 100))
    : 100
  const pointsToNext = badgeInfo.next ? badgeInfo.next - points : 0

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-lg" style={{ color: '#94a3b8' }}>Yükleniyor...</div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl mb-6">👤</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#f1f5f9' }}>Giriş Yap</h1>
        <p className="text-center mb-8 max-w-sm" style={{ color: '#94a3b8' }}>
          Önerilerini kaydet, izlediklerini işaretle ve kişiselleştirilmiş deneyimin keyfini çıkar.
        </p>
        <button
          onClick={signInWithGoogle}
          className="flex items-center gap-3 px-6 py-3 rounded-full font-semibold transition-all hover:scale-105 border"
          style={{ background: '#ffffff', color: '#0a0a0f', borderColor: '#ffffff20' }}
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

  return (
    <main className="min-h-screen px-6 pt-12 pb-24" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md mx-auto">

        {/* Üst bar */}
        <div className="flex justify-end mb-4">
          <NotificationBell />
        </div>

        {/* Avatar + İsim */}
        <div className="flex flex-col items-center mb-6">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profil"
              loading="lazy"
              className="w-20 h-20 rounded-full mb-4 border-2"
              style={{ borderColor: '#f59e0b' }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-3xl"
              style={{ background: '#f59e0b22', color: '#f59e0b' }}>
              {(user.user_metadata?.full_name || 'K')[0].toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>
            {user.user_metadata?.full_name || 'Kullanıcı'}
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{user.email}</p>
        </div>

        {/* ─── Rozet Kartı ─── */}
        <div className="rounded-2xl p-5 mb-6 border" style={{ background: '#12121a', borderColor: '#f59e0b22' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '36px' }}>{badgeInfo.emoji}</span>
              <div>
                <p className="font-bold text-lg leading-tight" style={{ color: '#f59e0b' }}>{badge}</p>
                <p className="text-sm" style={{ color: '#64748b' }}>{points} puan</p>
              </div>
            </div>
            {badgeInfo.next && (
              <div className="text-right">
                <p className="text-xs" style={{ color: '#64748b' }}>Sıradaki</p>
                <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                  {BADGE_THRESHOLDS[BADGE_THRESHOLDS.indexOf(badgeInfo) + 1]?.emoji}{' '}
                  {BADGE_THRESHOLDS[BADGE_THRESHOLDS.indexOf(badgeInfo) + 1]?.name}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: '#0f172a' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #f59e0b, #fcd34d)' }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px]" style={{ color: '#475569' }}>{progressPct}%</span>
            {pointsToNext > 0 && (
              <span className="text-[10px]" style={{ color: '#475569' }}>{pointsToNext} puan kaldı</span>
            )}
            {!badgeInfo.next && (
              <span className="text-[10px]" style={{ color: '#f59e0b' }}>Maksimum rozet!</span>
            )}
          </div>

          {/* Puan kazanma ipuçları */}
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-1.5" style={{ borderColor: '#ffffff08' }}>
            {[
              { label: 'Yorum yaz', pts: '+10' },
              { label: 'Puan ver', pts: '+5' },
              { label: 'Arkadaşına öner', pts: '+15' },
              { label: 'Film izle', pts: '+3' },
            ].map(tip => (
              <div key={tip.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: '#0f172a' }}>
                <span className="text-[10px]" style={{ color: '#64748b' }}>{tip.label}</span>
                <span className="text-[10px] font-bold" style={{ color: '#f59e0b' }}>{tip.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── İstatistikler ─── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center p-3 rounded-xl" style={{ background: '#12121a' }}>
            <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>
              {statsLoading ? '—' : stats.watchlist}
            </p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>İzleme Listem</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: '#12121a' }}>
            <p className="text-lg font-bold" style={{ color: '#22c55e' }}>
              {statsLoading ? '—' : stats.watched}
            </p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>İzlediklerim</p>
          </div>
          <div className="text-center p-3 rounded-xl" style={{ background: '#12121a' }}>
            <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
              {statsLoading ? '—' : stats.reviews}
            </p>
            <p className="text-[10px]" style={{ color: '#64748b' }}>Yorumlarım</p>
          </div>
        </div>

        {/* ─── Platform Tercihleri ─── */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: '#12121a' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>Platform Tercihlerim</p>
          <p className="text-xs mb-4" style={{ color: '#64748b' }}>Seçtiğin platformlar quiz'de otomatik seçili gelir.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PLATFORMS.map(p => {
              const active = platforms.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border"
                  style={{
                    background: active ? '#f59e0b' : '#0f172a',
                    color: active ? '#0a0a0f' : '#94a3b8',
                    borderColor: active ? '#f59e0b' : '#ffffff15',
                  }}
                >
                  {p}
                </button>
              )
            })}
          </div>
          <button
            onClick={savePlatforms}
            disabled={savingPlatforms}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: platformsSaved ? '#22c55e22' : '#f59e0b',
              color: platformsSaved ? '#22c55e' : '#0a0a0f',
            }}
          >
            {platformsSaved ? '✓ Kaydedildi' : savingPlatforms ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}
          </button>
        </div>

        {/* ─── Uygulamayı Paylaş ─── */}
        <ShareButton />

        {/* ─── Çıkış ─── */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl font-medium transition-all border"
          style={{ background: '#12121a', color: '#ef4444', borderColor: '#ef444433' }}
        >
          Çıkış Yap
        </button>
      </div>
    </main>
  )
}
