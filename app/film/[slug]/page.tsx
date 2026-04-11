'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFilmAwards } from '@/lib/awards'
import { formatDateTR } from '@/lib/utils'
import { fetchCached } from '@/lib/tmdbCache'
import { moderateComment } from '@/lib/moderation'

interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
}

interface Review {
  id: string
  user_id: string
  user_name: string
  rating: number
  comment: string | null
  created_at: string
}

interface FilmData {
  id: number
  media_type: 'movie' | 'tv'
  title: string
  original_title: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  release_date: string
  vote_average: number
  director: string | null
  cast: CastMember[]
  trailer_key: string | null
  providers: string[]
}

const BADGE_EMOJIS: Record<string, string> = {
  'Yeni Üye': '🌱', 'Film Sever': '🎬', 'Sinefil': '🎭',
  'Film Gurmesi': '👑', 'Efsane Eleştirmen': '🏆',
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

export default function FilmPage() {
  const params = useParams()
  const router = useRouter()
  const { user, signInWithGoogle } = useAuth()
  const slug = decodeURIComponent((params.slug as string) || '')

  const [film, setFilm] = useState<FilmData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [myRating, setMyRating] = useState(7)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [badgesMap, setBadgesMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slug) return
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    const search = async () => {
      try {
        // Film + dizi ara
        const [movieData, tvData] = await Promise.all([
          fetchCached(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(slug)}&language=tr-TR`) as Promise<any>,
          fetchCached(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(slug)}&language=tr-TR`) as Promise<any>,
        ])
        const movieResult = movieData?.results?.[0]
        const tvResult = tvData?.results?.[0]
        const item = movieResult || tvResult
        if (!item) { setNotFound(true); setLoading(false); return }
        const mediaType: 'movie' | 'tv' = movieResult ? 'movie' : 'tv'
        const id = item.id

        const [credits, videos, providersData] = await Promise.all([
          fetchCached(`https://api.themoviedb.org/3/${mediaType}/${id}/credits?api_key=${apiKey}&language=tr-TR`) as Promise<any>,
          fetchCached(`https://api.themoviedb.org/3/${mediaType}/${id}/videos?api_key=${apiKey}`) as Promise<any>,
          fetchCached(`https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${apiKey}`) as Promise<any>,
        ])
        const cast: CastMember[] = (credits?.cast || []).slice(0, 6).map((c: any) => ({
          id: c.id, name: c.name, character: c.character, profile_path: c.profile_path,
        }))
        const director = (credits?.crew || []).find((c: any) => c.job === 'Director')?.name || null
        const trailer = videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
        const trProviders: string[] = (providersData?.results?.TR?.flatrate || [])
          .map((p: any) => p.provider_name as string).filter(Boolean)

        setFilm({
          id,
          media_type: mediaType,
          title: item.title || item.name || slug,
          original_title: item.original_title || item.original_name || '',
          poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
          overview: item.overview || null,
          release_date: item.release_date || item.first_air_date || '',
          vote_average: item.vote_average || 0,
          director,
          cast,
          trailer_key: trailer?.key || null,
          providers: trProviders,
        })
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    search()
  }, [slug])

  useEffect(() => {
    if (!film) return
    const reviewKey = film.original_title && film.original_title !== film.title ? film.original_title : film.title
    supabase.from('reviews')
      .select('id, user_id, user_name, rating, comment, created_at')
      .eq('movie_title', reviewKey)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const list = data || []
        setReviews(list)
        const userIds = list.map((r: Review) => r.user_id).filter((id: string, i: number, arr: string[]) => arr.indexOf(id) === i)
        if (userIds.length > 0) {
          const { data: pts } = await supabase.from('user_points').select('user_id, badge').in('user_id', userIds)
          if (pts) {
            const map: Record<string, string> = {}
            pts.forEach((p: { user_id: string; badge: string }) => { map[p.user_id] = p.badge })
            setBadgesMap(map)
          }
        }
      })
  }, [film])

  const handleSubmitReview = async () => {
    if (!user || !film) return
    const modResult = moderateComment(myComment)
    if (!modResult.approved) { setSubmitMsg(modResult.reason); return }
    setSubmitting(true)
    const reviewKey = film.original_title && film.original_title !== film.title ? film.original_title : film.title
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id, user_name: userName, movie_title: reviewKey,
      movie_type: film.media_type === 'movie' ? 'film' : 'dizi',
      rating: myRating, comment: myComment.trim() || null,
    })
    if (!error) {
      setReviews(prev => [{
        id: crypto.randomUUID(), user_id: user.id, user_name: userName,
        rating: myRating, comment: myComment.trim() || null, created_at: new Date().toISOString(),
      }, ...prev])
      setMyRating(7); setMyComment(''); setSubmitMsg('Yorumun eklendi! 🎉')
    } else {
      setSubmitMsg('Hata oluştu, tekrar dene.')
    }
    setSubmitting(false)
  }

  const handleDeleteReview = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const myExistingReview = reviews.find(r => r.user_id === user?.id)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </main>
    )
  }

  if (notFound || !film) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0a0a0f' }}>
        <div className="text-5xl mb-4">🎬</div>
        <h1 className="text-xl font-bold mb-2 text-center" style={{ color: '#f1f5f9' }}>Film bulunamadı</h1>
        <p className="text-sm mb-6 text-center" style={{ color: '#94a3b8' }}>"{slug}" için sonuç bulunamadı.</p>
        <button onClick={() => router.push('/')} className="px-8 py-3 rounded-full font-semibold" style={{ background: '#f59e0b', color: '#0a0a0f' }}>
          Ana Sayfaya Dön
        </button>
      </main>
    )
  }

  const displayOriginal = film.original_title && film.original_title !== film.title ? film.original_title : null
  const awards = getFilmAwards(film.title, film.original_title)

  return (
    <main className="min-h-screen pb-16" style={{ background: '#0a0a0f' }}>
      {/* Backdrop */}
      {film.backdrop && (
        <div className="relative w-full" style={{ height: '260px' }}>
          <img src={film.backdrop} alt={`${film.title} afişi`} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 20%, #0a0a0f)' }} />
        </div>
      )}

      <div className="max-w-lg mx-auto px-5">
        {/* Poster + Başlık */}
        <div className="flex gap-4 -mt-16 relative z-10 mb-5">
          {film.poster && !film.backdrop && (
            <div className="rounded-xl overflow-hidden flex-shrink-0 border" style={{ width: '110px', height: '160px', borderColor: '#ffffff15' }}>
              <img src={film.poster} alt={`${film.title} posteri`} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className={film.poster && !film.backdrop ? 'flex flex-col justify-end' : ''}>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>{film.title}</h1>
            {displayOriginal && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayOriginal}</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 mb-2 text-sm" style={{ color: '#94a3b8' }}>
          {film.release_date && <span>{formatDateTR(film.release_date)}</span>}
          {film.vote_average > 0 && <span>⭐ {film.vote_average.toFixed(1)}</span>}
          {film.director && <span>🎬 {film.director}</span>}
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: film.media_type === 'movie' ? '#f59e0b22' : '#3b82f622', color: film.media_type === 'movie' ? '#f59e0b' : '#60a5fa' }}>
            {film.media_type === 'movie' ? 'Film' : 'Dizi'}
          </span>
        </div>

        {/* Ödüller */}
        {awards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {awards.map((a, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: a.color + '22', color: a.color, border: `1px solid ${a.color}44` }}>
                {a.label}
              </span>
            ))}
          </div>
        )}

        {/* Platformlar */}
        {film.providers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
            <span className="text-[10px]" style={{ color: '#475569' }}>İzle:</span>
            {film.providers.map((p, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}>{p}</span>
            ))}
          </div>
        )}

        {/* Özet */}
        {film.overview && (
          <p className="text-sm leading-relaxed mb-5" style={{ color: '#cbd5e1' }}>{film.overview}</p>
        )}

        {/* Oyuncular */}
        {film.cast.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#64748b' }}>OYUNCULAR</p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {film.cast.map(actor => (
                <div key={actor.id} className="flex-shrink-0 text-center" style={{ width: '64px' }}>
                  <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1" style={{ background: '#1e293b' }}>
                    {actor.profile_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: '#475569', fontSize: '20px' }}>👤</div>
                    )}
                  </div>
                  <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1' }}>{actor.name.split(' ')[0]}</p>
                  <p className="text-[8px] leading-tight mt-0.5 truncate" style={{ color: '#475569' }}>{actor.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fragman */}
        {film.trailer_key && (
          <div className="aspect-video rounded-xl overflow-hidden mb-6">
            <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${film.trailer_key}`} allowFullScreen allow="autoplay" title={`${film.title} fragmanı`} />
          </div>
        )}

        {/* Yorumlar */}
        <div className="pt-4 border-t mb-8" style={{ borderColor: '#ffffff10' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-wide" style={{ color: '#64748b' }}>KULLANICI YORUMLARI</p>
            {avgRating && (
              <span className="text-xs" style={{ color: '#f59e0b' }}>⭐ {avgRating} ({reviews.length})</span>
            )}
          </div>

          {user ? (
            myExistingReview ? (
              <div className="rounded-xl p-3 mb-4" style={{ background: '#12121a' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{myExistingReview.rating.toFixed(1)}<span className="text-xs font-normal">/10</span></span>
                  <button onClick={() => handleDeleteReview(myExistingReview.id)} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#ef444422', color: '#ef4444' }}>Sil</button>
                </div>
                {myExistingReview.comment && <p className="text-xs" style={{ color: '#cbd5e1' }}>{myExistingReview.comment}</p>}
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Puanın</p>
                  <span className="text-base font-bold" style={{ color: '#f59e0b' }}>{myRating.toFixed(1)}<span className="text-xs font-normal">/10</span></span>
                </div>
                <input type="range" min="1" max="10" step="0.5" value={myRating} onChange={e => setMyRating(parseFloat(e.target.value))}
                  className="w-full mb-3" style={{ accentColor: '#f59e0b' }} />
                <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="Yorumunuzu yazın... (isteğe bağlı)" rows={2}
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                  style={{ background: '#12121a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }} />
                {submitMsg && <p className="text-xs mt-1" style={{ color: submitMsg.includes('eklendi') ? '#22c55e' : '#ef4444' }}>{submitMsg}</p>}
                <button onClick={handleSubmitReview} disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold mt-2"
                  style={{ background: '#f59e0b', color: '#0a0a0f', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                </button>
              </div>
            )
          ) : (
            <button onClick={signInWithGoogle} className="w-full py-3 rounded-xl text-sm font-medium mb-4 border"
              style={{ background: '#ffffff10', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)' }}>
              Yorum yapmak için giriş yap →
            </button>
          )}

          {reviews.filter(r => r.user_id !== user?.id).length > 0 && (
            <div className="flex flex-col gap-3">
              {reviews.filter(r => r.user_id !== user?.id).map(review => (
                <div key={review.id} className="rounded-xl p-3" style={{ background: '#12121a' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                        {review.user_name.charAt(0).toUpperCase()}
                      </div>
                      <a href={`/user/${review.user_id}`} className="text-xs font-medium hover:underline" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{review.user_name.split(' ')[0]}</a>
                      {badgesMap[review.user_id] && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                          {BADGE_EMOJIS[badgesMap[review.user_id]] || ''} {badgesMap[review.user_id]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{review.rating.toFixed(1)}/10</span>
                      <span className="text-[10px]" style={{ color: '#475569' }}>{relativeTime(review.created_at)}</span>
                    </div>
                  </div>
                  {review.comment && <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center pb-8">
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Ruh haline göre öneri almak ister misin?</p>
          <button onClick={() => router.push('/')} className="px-8 py-4 rounded-full font-semibold text-base transition-all hover:scale-105"
            style={{ background: '#f59e0b', color: '#0a0a0f' }}>
            🎬 Sen de Keşfet
          </button>
        </div>
      </div>
    </main>
  )
}
