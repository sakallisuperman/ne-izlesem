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
  const [selectedActor, setSelectedActor] = useState<FavoriteActor | null>(null)

  // Follow state
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [theyFollowMe, setTheyFollowMe] = useState(false) // mutual follow check

  // Message state
  const [msgModalOpen, setMsgModalOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgSent, setMsgSent] = useState(false)

  // Followers / Following list popups
  const [followersPopup, setFollowersPopup] = useState(false)
  const [followingPopup, setFollowingPopup] = useState(false)
  const [followersList, setFollowersList] = useState<{ id: string; nickname: string | null; badge: string | null }[]>([])
  const [followingList, setFollowingList] = useState<{ id: string; nickname: string | null; badge: string | null }[]>([])
  const [listLoading, setListLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('profiles').select('id, nickname, preferred_platforms').eq('id', id).maybeSingle(),
      supabase.from('user_points').select('total_points, badge').eq('user_id', id).maybeSingle(),
      supabase.from('favorite_actors').select('actor_id, actor_name, profile_path').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('watchlist').select('status').eq('user_id', id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
    ]).then(([profileRes, pointsRes, actorsRes, wlRes, followersRes, followingRes]) => {
      if (!profileRes.data && !pointsRes.data) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setProfile(profileRes.data || { id, nickname: null, preferred_platforms: null })
      if (pointsRes.data) setPoints(pointsRes.data)
      setActors(actorsRes.data || [])
      const wl = wlRes.data || []
      setStats({
        watchlist: wl.filter(i => i.status === 'saved').length,
        watched: wl.filter(i => i.status === 'watched').length,
      })
      setFollowerCount(followersRes.count || 0)
      setFollowingCount(followingRes.count || 0)
      setLoading(false)
    })
  }, [id])

  // Check if current user follows this profile
  useEffect(() => {
    if (!currentUser || !id || currentUser.id === id) return
    supabase.from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', id)
      .maybeSingle()
      .then(({ data }) => { if (data) setFollowing(true) })
    // Check if they follow me (for mutual follow / messaging)
    supabase.from('follows')
      .select('id')
      .eq('follower_id', id)
      .eq('following_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setTheyFollowMe(true) })
  }, [currentUser, id])

  const openFollowers = async () => {
    setFollowersPopup(true)
    if (followersList.length > 0) return
    setListLoading(true)
    const { data } = await supabase
      .from('follows')
      .select('profiles!follows_follower_id_fkey(id, nickname)')
      .eq('following_id', id)
    const users = (data || []).map((r: any) => ({ id: r.profiles.id, nickname: r.profiles.nickname, badge: null }))
    if (users.length > 0) {
      const { data: pts } = await supabase.from('user_points').select('user_id, badge').in('user_id', users.map(u => u.id))
      const bmap: Record<string, string> = {}
      if (pts) pts.forEach((p: any) => { bmap[p.user_id] = p.badge })
      setFollowersList(users.map(u => ({ ...u, badge: bmap[u.id] || null })))
    } else {
      setFollowersList([])
    }
    setListLoading(false)
  }

  const openFollowing = async () => {
    setFollowingPopup(true)
    if (followingList.length > 0) return
    setListLoading(true)
    const { data } = await supabase
      .from('follows')
      .select('profiles!follows_following_id_fkey(id, nickname)')
      .eq('follower_id', id)
    const users = (data || []).map((r: any) => ({ id: r.profiles.id, nickname: r.profiles.nickname, badge: null }))
    if (users.length > 0) {
      const { data: pts } = await supabase.from('user_points').select('user_id, badge').in('user_id', users.map(u => u.id))
      const bmap: Record<string, string> = {}
      if (pts) pts.forEach((p: any) => { bmap[p.user_id] = p.badge })
      setFollowingList(users.map(u => ({ ...u, badge: bmap[u.id] || null })))
    } else {
      setFollowingList([])
    }
    setListLoading(false)
  }

  const handleFollowToggle = async () => {
    if (!currentUser || followLoading) return
    setFollowLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', id)
      setFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: id })
      setFollowing(true)
      setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  const handleSendMessage = async () => {
    if (!currentUser || !msgText.trim() || msgSending) return
    setMsgSending(true)
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: id,
      content: msgText.trim(),
    })
    setMsgSent(true)
    setMsgText('')
    setMsgSending(false)
    setTimeout(() => { setMsgModalOpen(false); setMsgSent(false) }, 1500)
  }

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
  const isMutualFollow = following && theyFollowMe

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

      {/* Takipçiler Popup */}
      {followersPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#000000cc' }} onClick={() => setFollowersPopup(false)}>
          <div className="w-full max-w-sm rounded-2xl border" style={{ background: '#12121a', borderColor: '#ffffff15', maxHeight: '75vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#ffffff08' }}>
              <h3 className="font-bold text-base" style={{ color: '#f1f5f9' }}>Takipçiler ({followerCount})</h3>
              <button onClick={() => setFollowersPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#ffffff10', color: '#94a3b8' }}>✕</button>
            </div>
            {listLoading ? (
              <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full" style={{ border: '2px solid #f59e0b33', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : followersList.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>Henüz takipçi yok.</p>
            ) : (
              <div className="flex flex-col p-3 gap-2">
                {followersList.map(u => (
                  <button key={u.id} onClick={() => { setFollowersPopup(false); router.push(`/user/${u.id}`) }}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: '#0f172a' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2" style={{ background: '#f59e0b22', color: '#f59e0b', borderColor: '#f59e0b44' }}>
                      {(u.nickname || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>@{u.nickname || 'Anonim'}</p>
                      {u.badge && <span className="text-[9px]" style={{ color: '#f59e0b' }}>{BADGE_EMOJIS[u.badge] || ''} {u.badge}</span>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Takip Edilenler Popup */}
      {followingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#000000cc' }} onClick={() => setFollowingPopup(false)}>
          <div className="w-full max-w-sm rounded-2xl border" style={{ background: '#12121a', borderColor: '#ffffff15', maxHeight: '75vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#ffffff08' }}>
              <h3 className="font-bold text-base" style={{ color: '#f1f5f9' }}>Takip Edilenler ({followingCount})</h3>
              <button onClick={() => setFollowingPopup(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#ffffff10', color: '#94a3b8' }}>✕</button>
            </div>
            {listLoading ? (
              <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full" style={{ border: '2px solid #f59e0b33', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : followingList.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#64748b' }}>Henüz kimse takip edilmiyor.</p>
            ) : (
              <div className="flex flex-col p-3 gap-2">
                {followingList.map(u => (
                  <button key={u.id} onClick={() => { setFollowingPopup(false); router.push(`/user/${u.id}`) }}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{ background: '#0f172a' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2" style={{ background: '#f59e0b22', color: '#f59e0b', borderColor: '#f59e0b44' }}>
                      {(u.nickname || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>@{u.nickname || 'Anonim'}</p>
                      {u.badge && <span className="text-[9px]" style={{ color: '#f59e0b' }}>{BADGE_EMOJIS[u.badge] || ''} {u.badge}</span>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mesaj Modal */}
      {msgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: '#000000cc' }} onClick={() => setMsgModalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 border popup-enter" style={{ background: '#12121a', borderColor: '#ffffff15' }} onClick={e => e.stopPropagation()}>
            {msgSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">✉️</div>
                <p className="font-semibold" style={{ color: '#22c55e' }}>Mesaj gönderildi!</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold mb-1" style={{ color: '#f1f5f9' }}>@{displayName}'e Mesaj Gönder</h3>
                <p className="text-xs mb-4" style={{ color: '#64748b' }}>Mesajın sadece siz ikiniz görebilirsiniz.</p>
                <textarea
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  rows={3}
                  autoFocus
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none mb-3"
                  style={{ background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <div className="flex gap-2">
                  <button onClick={() => setMsgModalOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ background: 'transparent', color: '#94a3b8', borderColor: '#ffffff15' }}>İptal</button>
                  <button onClick={handleSendMessage} disabled={!msgText.trim() || msgSending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f59e0b', color: '#0a0a0f', opacity: (!msgText.trim() || msgSending) ? 0.6 : 1 }}>
                    {msgSending ? '...' : 'Gönder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
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

          {/* Takipçi / Takip */}
          <div className="flex gap-6 mt-3">
            <button onClick={openFollowers} className="text-center btn-press" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <p className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{followerCount}</p>
              <p className="text-[11px]" style={{ color: '#64748b' }}>Takipçi</p>
            </button>
            <button onClick={openFollowing} className="text-center btn-press" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <p className="text-lg font-bold" style={{ color: '#f1f5f9' }}>{followingCount}</p>
              <p className="text-[11px]" style={{ color: '#64748b' }}>Takip</p>
            </button>
          </div>

          {!isOwnProfile && currentUser && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all btn-press"
                style={{
                  background: 'transparent',
                  color: following ? '#ef4444' : '#f59e0b',
                  border: following ? '1px solid #ef444466' : '1px solid #f59e0b',
                  opacity: followLoading ? 0.7 : 1,
                }}
              >
                {following ? '✕ Takipten Çık' : '+ Takip Et'}
              </button>
              {isMutualFollow && (
                <button
                  onClick={() => setMsgModalOpen(true)}
                  className="px-4 py-2 rounded-full text-sm font-semibold btn-press"
                  style={{ background: '#3b82f622', color: '#60a5fa', border: '1px solid #3b82f644' }}
                >
                  ✉️ Mesaj At
                </button>
              )}
            </div>
          )}
          {isOwnProfile && (
            <button onClick={() => router.push('/profile')} className="mt-4 px-5 py-2 rounded-full text-sm font-medium btn-press" style={{ background: '#12121a', color: '#94a3b8', border: '1px solid #ffffff15' }}>
              Profilimi Düzenle
            </button>
          )}
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl p-4 text-center border card-hover" style={{ background: '#12121a', borderColor: '#ffffff08' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: '#f59e0b' }}>{stats.watchlist}</p>
            <p className="text-xs" style={{ color: '#64748b' }}>İzleme Listesi</p>
          </div>
          <div className="rounded-xl p-4 text-center border card-hover" style={{ background: '#12121a', borderColor: '#ffffff08' }}>
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
