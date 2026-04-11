'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import PersonPopup from '@/components/PersonPopup'

interface UserProfile {
  id: string
  nickname: string | null
  preferred_platforms: string[] | null
}

interface UserPoints {
  total_points: number
  badge: string
}

interface FavoriteActor {
  actor_id: number
  actor_name: string
  profile_path: string | null
}

interface WatchlistStats {
  watchlist: number
  watched: number
}

const BADGE_EMOJIS: Record<string, string> = {
  'Yeni Üye': '🌱', 'Film Sever': '🎬', 'Sinefil': '🎭',
  'Film Gurmesi': '👑', 'Efsane Eleştirmen': '🏆',
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user: currentUser } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [points, setPoints] = useState<UserPoints | null>(null)
  const [actors, setActors] = useState<FavoriteActor[]>([])
  const [stats, setStats] = useState<WatchlistStats>({ watchlist: 0, watched: 0 })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [following, setFollowing] = useState(false)
  const [selectedActor, setSelectedActor] = useState<FavoriteActor | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('profiles').select('id, nickname, preferred_platforms').eq('id', id).maybeSingle(),
      supabase.from('user_points').select('total_points, badge').eq('user_id', id).maybeSingle(),
      supabase.from('favorite_actors').select('actor_id, actor_name, profile_path').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('watchlist').select('status').eq('user_id', id),
    ]).then(([profileRes, pointsRes, actorsRes, wlRes]) => {
      if (!profileRes.data) { setNotFound(true); setLoading(false); return }
      setProfile(profileRes.data)
      if (pointsRes.data) setPoints(pointsRes.data)
      setActors(actorsRes.data || [])
      const wl = wlRes.data || []
      setStats({
        watchlist: wl.filter(i => i.status === 'saved').length,
        watched: wl.filter(i => i.status === 'watched').length,
      })
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i*150}ms` }} />)}
        </div>
      </main>
    )
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl mb-4">👤</div>
        <p className="text-lg font-semibold mb-2" style={{ color: '#f1f5f9' }}>Kullanıcı bulunamadı</p>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 rounded-full text-sm font-medium" style={{ background: '#12121a', color: '#94a3b8' }}>← Geri</button>
      </main>
    )
  }

  const isOwnProfile = currentUser?.id === id
  const displayName = profile.nickname || 'Anonim'
  const badge = points?.badge || 'Yeni Üye'
  const badgeEmoji = BADGE_EMOJIS[badge] || '🌱'

  return (
    <main className="min-h-screen pt-10 pb-24 px-6" style={{ background: '#0a0a0f' }}>
      {selectedActor && (
        <PersonPopup
          personId={selectedActor.actor_id}
          personName={selectedActor.actor_name}
          personProfile={selectedActor.profile_path ? `https://image.tmdb.org/t/p/w185${selectedActor.profile_path}` : null}
          onClose={() => setSelectedActor(null)}
        />
      )}

      <div className="max-w-md mx-auto">
        {/* Geri butonu */}
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-1 text-sm" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
          ← Geri
        </button>

        {/* Profil başlığı */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-3xl font-bold border-2" style={{ background: '#f59e0b22', color: '#f59e0b', borderColor: '#f59e0b' }}>
            {displayName[0].toUpperCase()}
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#f1f5f9' }}>
            {profile.nickname ? `@${profile.nickname}` : 'Anonim'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm px-3 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
              {badgeEmoji} {badge}
            </span>
            {points && <span className="text-xs" style={{ color: '#475569' }}>{points.total_points} puan</span>}
          </div>

          {/* Takip Et butonu (visual only, kendi profili değilse) */}
          {!isOwnProfile && (
            <button
              onClick={() => setFollowing(f => !f)}
              className="mt-4 px-5 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                background: following ? '#f59e0b22' : '#f59e0b',
                color: following ? '#f59e0b' : '#0a0a0f',
                border: following ? '1px solid #f59e0b44' : 'none',
              }}
            >
              {following ? '✓ Takip Ediliyor' : '+ Takip Et'}
            </button>
          )}
          {isOwnProfile && (
            <button onClick={() => router.push('/profile')} className="mt-4 px-5 py-2 rounded-full text-sm font-medium" style={{ background: '#12121a', color: '#94a3b8', border: '1px solid #ffffff15' }}>
              Profilimi Düzenle
            </button>
          )}
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl p-4 text-center border" style={{ background: '#12121a', borderColor: '#ffffff08' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: '#f59e0b' }}>{stats.watchlist}</p>
            <p className="text-xs" style={{ color: '#64748b' }}>İzleme Listesi</p>
          </div>
          <div className="rounded-xl p-4 text-center border" style={{ background: '#12121a', borderColor: '#ffffff08' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: '#22c55e' }}>{stats.watched}</p>
            <p className="text-xs" style={{ color: '#64748b' }}>İzlenenler</p>
          </div>
        </div>

        {/* Favori Oyuncular */}
        {actors.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-3 tracking-wide" style={{ color: '#64748b' }}>FAVORİ OYUNCULAR</p>
            <div className="grid grid-cols-4 gap-2">
              {actors.slice(0, 8).map(actor => (
                <button
                  key={actor.actor_id}
                  onClick={() => setSelectedActor(actor)}
                  className="rounded-xl p-2 text-center transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: '#12121a', border: 'none', cursor: 'pointer' }}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1 border-2" style={{ borderColor: '#7F77DD' }}>
                    {actor.profile_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.actor_name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg" style={{ background: '#1e293b' }}>👤</div>
                    )}
                  </div>
                  <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{actor.actor_name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
