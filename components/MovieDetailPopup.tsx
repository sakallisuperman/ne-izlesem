'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFilmAwards } from '@/lib/awards'

interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

interface CollectionMovie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
}

interface EnrichedData {
  trailer_key: string | null
  cast: CastMember[]
  director: string | null
  collection_name: string | null
  collection_movies: CollectionMovie[]
  providers: string[]
}

interface Review {
  id: string
  user_id: string
  user_name: string
  rating: number
  comment: string | null
  created_at: string
}

interface MovieDetailPopupProps {
  isOpen: boolean
  onClose: () => void
  movieId: number | null
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle?: string
  turkishTitle?: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  releaseDate?: string
  voteAverage?: number
  year?: number
  imdb?: number
  contentType?: 'film' | 'dizi'
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

export default function MovieDetailPopup({
  isOpen, onClose, movieId, mediaType,
  title, originalTitle, turkishTitle, poster, backdrop, overview,
  releaseDate, voteAverage, year, imdb, contentType,
}: MovieDetailPopupProps) {
  const { user, signInWithGoogle } = useAuth()

  const [enriched, setEnriched] = useState<EnrichedData | null>(null)
  const [loadingEnrich, setLoadingEnrich] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  const [copied, setCopied] = useState(false)
  const [badgesMap, setBadgesMap] = useState<Record<string, string>>({})

  // Reviews için canonical title
  const reviewKey = (originalTitle && originalTitle !== title) ? originalTitle : title

  const BADGE_EMOJIS: Record<string, string> = {
    'Yeni Üye': '🌱', 'Film Sever': '🎬', 'Sinefil': '🎭',
    'Film Gurmesi': '🏆', 'Efsane Eleştirmen': '⭐',
  }

  const myExistingReview = reviews.find(r => r.user_id === user?.id)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // TMDB verisi çek
  useEffect(() => {
    if (!isOpen || !movieId) return
    setEnriched(null)
    setLoadingEnrich(true)
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    const fetchAll = async () => {
      try {
        const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${apiKey}&language=tr-TR`),
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}/credits?api_key=${apiKey}&language=tr-TR`),
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}/videos?api_key=${apiKey}`),
          fetch(`https://api.themoviedb.org/3/${mediaType}/${movieId}/watch/providers?api_key=${apiKey}`),
        ])
        const [details, credits, videos, providersData] = await Promise.all([
          detailsRes.json(), creditsRes.json(), videosRes.json(), providersRes.json(),
        ])
        const trProviders: string[] = (providersData?.results?.TR?.flatrate || [])
          .map((p: any) => p.provider_name as string)
          .filter(Boolean)
        const trailer = videos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
        const cast: CastMember[] = (credits.cast || []).slice(0, 5).map((c: any) => ({
          id: c.id, name: c.name, character: c.character, profile_path: c.profile_path,
        }))
        const directorEntry = (credits.crew || []).find((c: any) => c.job === 'Director')
        let collection_name: string | null = null
        let collection_movies: CollectionMovie[] = []
        if (details.belongs_to_collection?.id) {
          try {
            const colRes = await fetch(`https://api.themoviedb.org/3/collection/${details.belongs_to_collection.id}?api_key=${apiKey}&language=tr-TR`)
            const colData = await colRes.json()
            collection_name = colData.name || null
            collection_movies = (colData.parts || [])
              .sort((a: any, b: any) => (a.release_date || '').localeCompare(b.release_date || ''))
              .map((p: any) => ({ id: p.id, title: p.title, poster_path: p.poster_path, release_date: p.release_date ? p.release_date.substring(0, 4) : '' }))
          } catch {}
        }
        setEnriched({ trailer_key: trailer?.key || null, cast, director: directorEntry?.name || null, collection_name, collection_movies, providers: trProviders })
      } catch {
        setEnriched({ trailer_key: null, cast: [], director: null, collection_name: null, collection_movies: [], providers: [] })
      } finally {
        setLoadingEnrich(false)
      }
    }
    fetchAll()
  }, [isOpen, movieId, mediaType])

  // Yorumları çek
  useEffect(() => {
    if (!isOpen) return
    setReviewsLoading(true)
    setMyRating(0)
    setMyComment('')
    setSubmitMsg('')
    supabase
      .from('reviews')
      .select('id, user_id, user_name, rating, comment, created_at')
      .eq('movie_title', reviewKey)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const list = data || []
        setReviews(list)
        // Yorumcuların rozetlerini tek sorguda çek
        const userIds = list.map(r => r.user_id).filter((id, i, arr) => arr.indexOf(id) === i)
        if (userIds.length > 0) {
          const { data: pts } = await supabase
            .from('user_points')
            .select('user_id, badge')
            .in('user_id', userIds)
          if (pts) {
            const map: Record<string, string> = {}
            pts.forEach((p: { user_id: string; badge: string }) => { map[p.user_id] = p.badge })
            setBadgesMap(map)
          }
        }
        setReviewsLoading(false)
      })
  }, [isOpen, reviewKey])

  const handleSubmitReview = async () => {
    if (!user || myRating === 0) return
    setSubmitting(true)
    setSubmitMsg('')
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      user_name: userName,
      movie_title: reviewKey,
      movie_type: contentType || (mediaType === 'movie' ? 'film' : 'dizi'),
      rating: myRating,
      comment: myComment.trim() || null,
    })
    if (error) {
      setSubmitMsg('Hata oluştu, tekrar dene.')
    } else {
      const newReview: Review = {
        id: crypto.randomUUID(),
        user_id: user.id,
        user_name: userName,
        rating: myRating,
        comment: myComment.trim() || null,
        created_at: new Date().toISOString(),
      }
      setReviews(prev => [newReview, ...prev])
      // Kendi rozet bilgisini de map'e ekle
      const { data: myPts } = await supabase.from('user_points').select('badge').eq('user_id', user.id).maybeSingle()
      if (myPts) setBadgesMap(prev => ({ ...prev, [user.id]: myPts.badge }))
      setMyRating(0)
      setMyComment('')
      setSubmitMsg('Yorumun eklendi! 🎉')
    }
    setSubmitting(false)
  }

  const handleDeleteReview = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const handleShare = async () => {
    const text = `"${title}" ${contentType === 'dizi' ? 'dizisini' : 'filmini'} izlemelisin! 🎬`
    const url = 'https://ne-izlesemapp.vercel.app'
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      // Paylaşım için puan ver
      if (user) { supabase.rpc('award_share_points').then(() => {}) }
    } catch {}
  }

  if (!isOpen) return null

  const displayOriginal = originalTitle && originalTitle !== title ? originalTitle : null
  const displayTurkish = turkishTitle && turkishTitle !== title ? turkishTitle : null
  const displayRating = voteAverage ?? imdb
  const displayYear = year ?? (releaseDate ? releaseDate.substring(0, 4) : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: '#000000cc' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden relative"
        style={{ background: '#12121a', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: '#00000088', color: '#fff' }}
        >✕</button>

        {backdrop ? (
          <div className="relative" style={{ height: '200px' }}>
            <img src={backdrop} alt={title} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
          </div>
        ) : poster ? (
          <div className="relative" style={{ height: '200px' }}>
            <img src={poster} alt={title} className="w-full h-full object-cover" style={{ objectPosition: 'top' }} loading="lazy" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
          </div>
        ) : null}

        <div className="p-5">
          {/* Başlık satırı */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 pr-2">
              <h2 className="text-xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>{title}</h2>
              {displayOriginal && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayOriginal}</p>}
              {displayTurkish && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayTurkish}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {contentType && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: contentType === 'film' ? '#f59e0b22' : '#3b82f622', color: contentType === 'film' ? '#f59e0b' : '#60a5fa' }}>
                  {contentType === 'film' ? 'Film' : 'Dizi'}
                </span>
              )}
              <button
                onClick={handleShare}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: copied ? '#22c55e22' : '#ffffff12', color: copied ? '#22c55e' : '#94a3b8' }}
                title="Arkadaşına Öner"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-1 text-sm" style={{ color: '#94a3b8' }}>
            {displayYear && <span>📅 {displayYear}</span>}
            {displayRating != null && displayRating > 0 && <span>⭐ {typeof displayRating === 'number' ? displayRating.toFixed(1) : displayRating}</span>}
            {enriched?.director && <span>🎬 {enriched.director}</span>}
            {avgRating && <span style={{ color: '#f59e0b' }}>💬 {avgRating} ({reviews.length})</span>}
          </div>

          {/* Ödül badge'leri */}
          {(() => {
            const awards = getFilmAwards(title, originalTitle)
            return awards.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                {awards.map((a, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: a.color + '22', color: a.color, border: `1px solid ${a.color}44` }}>
                    {a.label}
                  </span>
                ))}
              </div>
            ) : null
          })()}

          {/* Nerede izlenir (TR) */}
          {enriched && enriched.providers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1 items-center">
              <span className="text-[10px]" style={{ color: '#475569' }}>İzle:</span>
              {enriched.providers.map((p, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}>
                  {p}
                </span>
              ))}
            </div>
          )}

          {overview && (
            <p className="text-sm leading-relaxed mt-3 mb-4" style={{ color: '#cbd5e1' }}>{overview}</p>
          )}

          {/* Oyuncular */}
          {enriched && enriched.cast.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#64748b' }}>OYUNCULAR</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {enriched.cast.map(actor => (
                  <div key={actor.id} className="flex-shrink-0 text-center" style={{ width: '60px' }}>
                    <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1" style={{ background: '#1e293b' }}>
                      {actor.profile_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: '#475569', fontSize: '18px' }}>👤</div>
                      )}
                    </div>
                    <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1' }}>{actor.name.split(' ')[0]}</p>
                    <p className="text-[8px] leading-tight mt-0.5 truncate" style={{ color: '#475569', maxWidth: '60px' }}>{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Film Serisi */}
          {enriched && enriched.collection_name && enriched.collection_movies.length > 1 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#64748b' }}>SERİ: {enriched.collection_name.toUpperCase()}</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {enriched.collection_movies.map(cm => (
                  <div key={cm.id} className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: '70px', background: '#0f172a', border: cm.id === movieId ? '2px solid #f59e0b' : '2px solid transparent' }}>
                    {cm.poster_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${cm.poster_path}`} alt={cm.title} className="w-full object-cover" style={{ height: '105px' }} loading="lazy" />
                    ) : (
                      <div style={{ height: '105px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
                    )}
                    <p className="text-[8px] p-1 text-center leading-tight" style={{ color: '#94a3b8' }}>{cm.release_date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingEnrich && !enriched && (
            <div className="flex justify-center py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Fragman */}
          {enriched?.trailer_key && (
            <div className="aspect-video rounded-xl overflow-hidden mt-1 mb-5">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${enriched.trailer_key}`} allowFullScreen allow="autoplay" />
            </div>
          )}

          {/* ─── YORUMLAR ─── */}
          <div className="pt-4 border-t" style={{ borderColor: '#ffffff10' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold tracking-wide" style={{ color: '#64748b' }}>KULLANICI YORUMLARI</p>
              {avgRating && (
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.round(parseFloat(avgRating)) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                  <span className="text-[10px] ml-1" style={{ color: '#94a3b8' }}>{avgRating} ({reviews.length})</span>
                </div>
              )}
            </div>

            {/* Yorum Formu */}
            {user ? (
              myExistingReview ? (
                <div className="rounded-xl p-3 mb-4" style={{ background: '#0f172a' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= myExistingReview.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ))}
                    </div>
                    <button
                      onClick={() => handleDeleteReview(myExistingReview.id)}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: '#ef444422', color: '#ef4444' }}
                    >Sil</button>
                  </div>
                  {myExistingReview.comment && (
                    <p className="text-xs" style={{ color: '#cbd5e1' }}>{myExistingReview.comment}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px]" style={{ color: '#475569' }}>Senin yorumun</p>
                    {badgesMap[user?.id || ''] && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                        {BADGE_EMOJIS[badgesMap[user?.id || '']] || ''} {badgesMap[user?.id || '']}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>Puanın:</p>
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setMyRating(s)}
                        className="transition-transform hover:scale-110"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill={s <= (hoverRating || myRating) ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    placeholder="Yorumunuzu yazın... (isteğe bağlı)"
                    rows={2}
                    className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                    style={{ background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  {submitMsg && (
                    <p className="text-xs mt-1" style={{ color: submitMsg.includes('eklendi') ? '#22c55e' : '#ef4444' }}>{submitMsg}</p>
                  )}
                  <button
                    onClick={handleSubmitReview}
                    disabled={myRating === 0 || submitting}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold mt-2 transition-all"
                    style={{
                      background: myRating > 0 ? '#f59e0b' : '#ffffff10',
                      color: myRating > 0 ? '#0a0a0f' : '#475569',
                    }}
                  >
                    {submitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={signInWithGoogle}
                className="w-full py-3 rounded-xl text-sm font-medium mb-4 transition-all hover:scale-[1.02]"
                style={{ background: '#ffffff10', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Yorum yapmak için giriş yap →
              </button>
            )}

            {/* Yorum Listesi */}
            {reviewsLoading ? (
              <div className="text-center py-4">
                <div className="flex gap-1 justify-center">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#475569', animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            ) : reviews.filter(r => r.user_id !== user?.id).length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: '#475569' }}>
                {reviews.length === 0 ? 'Henüz yorum yok. İlk yorumu sen yap!' : ''}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {reviews.filter(r => r.user_id !== user?.id).map(review => (
                  <div key={review.id} className="rounded-xl p-3" style={{ background: '#0f172a' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                          {review.user_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium" style={{ color: '#cbd5e1' }}>{review.user_name.split(' ')[0]}</span>
                        {badgesMap[review.user_id] && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: '#f59e0b15', color: '#f59e0b' }}
                            title={badgesMap[review.user_id]}
                          >
                            {BADGE_EMOJIS[badgesMap[review.user_id]] || ''} {badgesMap[review.user_id]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= review.rating ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          ))}
                        </div>
                        <span className="text-[10px]" style={{ color: '#475569' }}>{relativeTime(review.created_at)}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
