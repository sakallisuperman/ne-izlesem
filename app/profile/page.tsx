'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import PersonPopup from '@/components/PersonPopup'
import { checkBadgeNotification } from '@/lib/notifications'

interface Stats {
  watchlist: number
  watched: number
  reviews: number
  favoriteActors: number
}

interface UserReview {
  id: string
  movie_title: string
  movie_type: string
  rating: number
  comment: string | null
  created_at: string
}

interface FavoriteActor {
  id: string
  actor_id: number
  actor_name: string
  profile_path: string | null
}

const BADGE_THRESHOLDS = [
  { name: 'Yeni Üye',          emoji: '🌱', min: 0,   next: 50  },
  { name: 'Film Sever',         emoji: '🎬', min: 50,  next: 150 },
  { name: 'Sinefil',            emoji: '🎭', min: 150, next: 300 },
  { name: 'Film Gurmesi',       emoji: '👑', min: 300, next: 500 },
  { name: 'Efsane Eleştirmen',  emoji: '🏆', min: 500, next: null },
]

const PLATFORMS = ['Netflix', 'Amazon Prime', 'Disney+', 'BluTV', 'MUBI', 'Exxen', 'Gain', 'HBO Max', 'Tabii']

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>
      {rating.toFixed(1)}<span className="text-xs font-normal">/10</span>
    </span>
  )
}

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
  const router = useRouter()

  const [stats, setStats]                 = useState<Stats>({ watchlist: 0, watched: 0, reviews: 0, favoriteActors: 0 })
  const [statsLoading, setStatsLoading]   = useState(false)
  const [points, setPoints]               = useState(0)
  const [badge, setBadge]                 = useState('Yeni Üye')
  const [platforms, setPlatforms]         = useState<string[]>([])
  const [savingPlatforms, setSavingPlatforms] = useState(false)
  const [platformsSaved, setPlatformsSaved]   = useState(false)

  const [nickname, setNickname]           = useState<string | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  const [nicknameSaved, setNicknameSaved]   = useState(false)
  const [nicknameError, setNicknameError]   = useState('')

  // Popup states
  const [reviewsPopup, setReviewsPopup]         = useState(false)
  const [actorsPopup, setActorsPopup]           = useState(false)
  const [userReviews, setUserReviews]           = useState<UserReview[]>([])
  const [favoriteActorsList, setFavoriteActorsList] = useState<FavoriteActor[]>([])
  const [selectedActor, setSelectedActor]       = useState<FavoriteActor | null>(null)

  useEffect(() => {
    if (!user) return
    setStatsLoading(true)

    Promise.all([
      supabase.from('watchlist').select('status').eq('user_id', user.id),
      supabase.from('reviews').select('id, movie_title, movie_type, rating, comment, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_points').select('total_points, badge').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('preferred_platforms, nickname').eq('id', user.id).maybeSingle(),
      supabase.from('favorite_actors').select('id, actor_id, actor_name, profile_path').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]).then(([wlRes, revRes, pointsRes, profileRes, actorsRes]) => {
      const items = wlRes.data || []
      const reviews = revRes.data || []
      const actors = actorsRes.data || []
      setStats({
        watchlist: items.filter(i => i.status === 'saved').length,
        watched:   items.filter(i => i.status === 'watched').length,
        reviews:   reviews.length,
        favoriteActors: actors.length,
      })
      setUserReviews(reviews)
      setFavoriteActorsList(actors)
      if (pointsRes.data) {
        setPoints(pointsRes.data.total_points)
        setBadge(pointsRes.data.badge)
        checkBadgeNotification(pointsRes.data.badge)
      }
      if (profileRes.data?.preferred_platforms) {
        setPlatforms(profileRes.data.preferred_platforms)
      }
      const nick = profileRes.data?.nickname || null
      setNickname(nick)
      if (nick) setNicknameInput(nick)
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

  const saveNickname = async () => {
    if (!user) return
    const trimmed = nicknameInput.trim()
    if (!trimmed || trimmed.length < 3) { setNicknameError('En az 3 karakter olmalı.'); return }
    if (trimmed.length > 20) { setNicknameError('En fazla 20 karakter olabilir.'); return }
    if (!/^[a-zA-Z0-9_çÇğĞıİöÖşŞüÜ]+$/.test(trimmed)) { setNicknameError('Sadece harf, rakam ve _ kullanabilirsin.'); return }
    setSavingNickname(true)
    setNicknameError('')
    const { error } = await supabase.from('profiles').upsert({ id: user.id, nickname: trimmed }, { onConflict: 'id' })
    if (error?.code === '23505') {
      setNicknameError('Bu kullanıcı adı zaten alınmış.')
    } else if (error) {
      setNicknameError('Hata oluştu, tekrar dene.')
    } else {
      setNickname(trimmed)
      setNicknameSaved(true)
      setTimeout(() => setNicknameSaved(false), 2000)
    }
    setSavingNickname(false)
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

      {/* ─── Yorumlar Popup ─── */}
      {reviewsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#000000cc' }} onClick={() => setReviewsPopup(false)}>
          <div className="w-full max-w-md rounded-2xl border" style={{ background: '#12121a', borderColor: '#ffffff15', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#ffffff08' }}>
              <h3 className="font-bold text-lg" style={{ color: '#f1f5f9' }}>Yorumlarım ({userReviews.length})</h3>
              <button onClick={() => setReviewsPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#ffffff10', color: '#94a3b8' }}>✕</button>
            </div>
            {userReviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <p style={{ color: '#64748b' }}>Henüz yorum yazmadın.</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-3">
                {userReviews.map(rev => (
                  <div key={rev.id} className="p-3 rounded-xl border" style={{ background: '#0f172a', borderColor: '#ffffff08' }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm" style={{ color: '#f1f5f9' }}>{rev.movie_title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: rev.movie_type === 'film' ? '#f59e0b22' : '#3b82f622', color: rev.movie_type === 'film' ? '#f59e0b' : '#60a5fa' }}>
                        {rev.movie_type === 'film' ? 'Film' : 'Dizi'}
                      </span>
                    </div>
                    <RatingBadge rating={rev.rating} />
                    {rev.comment && (
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#94a3b8' }}>{rev.comment}</p>
                    )}
                    <p className="text-[10px] mt-2" style={{ color: '#475569' }}>
                      {new Date(rev.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Favori Oyuncular Popup ─── */}
      {actorsPopup && !selectedActor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#000000cc' }} onClick={() => setActorsPopup(false)}>
          <div className="w-full max-w-md rounded-2xl border" style={{ background: '#12121a', borderColor: '#ffffff15', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#ffffff08' }}>
              <h3 className="font-bold text-lg" style={{ color: '#f1f5f9' }}>Favori Oyuncular ({favoriteActorsList.length})</h3>
              <button onClick={() => setActorsPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#ffffff10', color: '#94a3b8' }}>✕</button>
            </div>
            {favoriteActorsList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">❤️</div>
                <p style={{ color: '#64748b' }}>Henüz favori oyuncun yok.</p>
                <p className="text-sm mt-1" style={{ color: '#475569' }}>Oyuncu profillerinde ❤️ butonuna bas!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 p-4">
                {favoriteActorsList.map(actor => (
                  <button
                    key={actor.id}
                    onClick={() => setSelectedActor(actor)}
                    className="rounded-xl border p-3 text-center transition-all hover:scale-[1.02] active:scale-95"
                    style={{ background: '#0f172a', borderColor: '#7F77DD33' }}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-2 border-2" style={{ borderColor: '#7F77DD' }}>
                      {actor.profile_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.actor_name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: '#1e293b' }}>👤</div>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold leading-tight" style={{ color: '#f1f5f9' }}>{actor.actor_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PersonPopup (favori oyuncu seçildiğinde) */}
      {selectedActor && (
        <PersonPopup
          personId={selectedActor.actor_id}
          personName={selectedActor.actor_name}
          personProfile={selectedActor.profile_path ? `https://image.tmdb.org/t/p/w185${selectedActor.profile_path}` : null}
          onClose={() => setSelectedActor(null)}
          zIndex={60}
        />
      )}

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
          {nickname ? (
            <span className="text-sm mt-1 px-3 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b22', color: '#f59e0b' }}>@{nickname}</span>
          ) : (
            <span className="text-xs mt-1" style={{ color: '#475569' }}>Kullanıcı adı belirlenmedi</span>
          )}
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>{user.email}</p>
        </div>

        {/* ─── Nickname Kartı ─── */}
        <div className="rounded-2xl p-5 mb-6 border" style={{ background: '#12121a', borderColor: nickname ? '#f59e0b22' : '#ffffff10' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#f1f5f9' }}>Kullanıcı Adı</p>
          <p className="text-xs mb-3" style={{ color: '#64748b' }}>Diğer kullanıcılar seni bu isimle görür.</p>
          <div className="flex gap-2">
            <input
              value={nicknameInput}
              onChange={e => { setNicknameInput(e.target.value); setNicknameError('') }}
              placeholder="örn: sinefil42"
              maxLength={20}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button
              onClick={saveNickname}
              disabled={savingNickname}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: nicknameSaved ? '#22c55e22' : '#f59e0b', color: nicknameSaved ? '#22c55e' : '#0a0a0f', opacity: savingNickname ? 0.7 : 1 }}
            >
              {nicknameSaved ? '✓' : savingNickname ? '...' : 'Kaydet'}
            </button>
          </div>
          {nicknameError && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{nicknameError}</p>}
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

        {/* ─── İstatistikler (2x2 tıklanabilir grid) ─── */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => router.push('/history?tab=saved')}
            className="text-center p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 border"
            style={{ background: '#12121a', borderColor: '#ffffff08' }}
          >
            <p className="text-2xl font-bold mb-1" style={{ color: '#f59e0b' }}>
              {statsLoading ? '—' : stats.watchlist}
            </p>
            <p className="text-[11px]" style={{ color: '#64748b' }}>İzleme Listem</p>
            <p className="text-[9px] mt-0.5" style={{ color: '#334155' }}>görüntüle →</p>
          </button>
          <button
            onClick={() => router.push('/history?tab=watched')}
            className="text-center p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 border"
            style={{ background: '#12121a', borderColor: '#ffffff08' }}
          >
            <p className="text-2xl font-bold mb-1" style={{ color: '#22c55e' }}>
              {statsLoading ? '—' : stats.watched}
            </p>
            <p className="text-[11px]" style={{ color: '#64748b' }}>İzlediklerim</p>
            <p className="text-[9px] mt-0.5" style={{ color: '#334155' }}>görüntüle →</p>
          </button>
          <button
            onClick={() => { if (!statsLoading) setReviewsPopup(true) }}
            className="text-center p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 border"
            style={{ background: '#12121a', borderColor: '#ffffff08' }}
          >
            <p className="text-2xl font-bold mb-1" style={{ color: '#3b82f6' }}>
              {statsLoading ? '—' : stats.reviews}
            </p>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Yorumlarım</p>
            <p className="text-[9px] mt-0.5" style={{ color: '#334155' }}>görüntüle →</p>
          </button>
          <button
            onClick={() => { if (!statsLoading) setActorsPopup(true) }}
            className="text-center p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 border"
            style={{ background: '#12121a', borderColor: '#ffffff08' }}
          >
            <p className="text-2xl font-bold mb-1" style={{ color: '#a855f7' }}>
              {statsLoading ? '—' : stats.favoriteActors}
            </p>
            <p className="text-[11px]" style={{ color: '#64748b' }}>Favori Oyuncular</p>
            <p className="text-[9px] mt-0.5" style={{ color: '#334155' }}>görüntüle →</p>
          </button>
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
