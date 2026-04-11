'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getFilmAwards } from '@/lib/awards'
import PersonPopup from '@/components/PersonPopup'
import type { FilmNavItem } from '@/components/PersonPopup'
import { formatDateTR } from '@/lib/utils'
import { fetchCached } from '@/lib/tmdbCache'
import { moderateComment } from '@/lib/moderation'
import WatchedReviewModal from '@/components/WatchedReviewModal'

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
  directorId: number | null
  collection_name: string | null
  collection_movies: CollectionMovie[]
  providers: string[]
  fetchedBackdrop: string | null
  fetchedOverview: string | null
}

interface Review {
  id: string
  user_id: string
  user_name: string
  rating: number
  comment: string | null
  created_at: string
  parent_id: string | null
}

interface NavItem {
  movieId: number
  mediaType: 'movie' | 'tv'
  title: string
  originalTitle?: string
  turkishTitle?: string
  poster: string | null
  backdrop: string | null
  overview: string | null
  releaseDate?: string
  voteAverage?: number
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
  zIndex?: number
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
  releaseDate, voteAverage, year, imdb, contentType, zIndex = 50,
}: MovieDetailPopupProps) {
  const { user, signInWithGoogle } = useAuth()

  // Navigation stack
  const [navStack, setNavStack] = useState<NavItem[]>([])
  const [currentOverride, setCurrentOverride] = useState<NavItem | null>(null)

  // Derived current values
  const cur = currentOverride
  const currentMovieId = cur?.movieId ?? movieId
  const currentMediaType = cur?.mediaType ?? mediaType
  const currentTitle = cur?.title ?? title
  const currentOriginalTitle = cur?.originalTitle ?? originalTitle
  const currentTurkishTitle = cur?.turkishTitle ?? turkishTitle
  const currentPoster = cur?.poster ?? poster
  const currentBackdrop = cur?.backdrop ?? backdrop
  const currentOverview = cur?.overview ?? overview
  const currentReleaseDate = cur?.releaseDate ?? releaseDate
  const currentVoteAverage = cur?.voteAverage ?? voteAverage

  const [enriched, setEnriched] = useState<EnrichedData | null>(null)
  const [loadingEnrich, setLoadingEnrich] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [myRating, setMyRating] = useState(7)
  const [myComment, setMyComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [reviewSort, setReviewSort] = useState<'newest' | 'liked'>('newest')
  const [likesMap, setLikesMap] = useState<Record<string, number>>({})
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set())
  const [likingId, setLikingId] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)
  const [badgesMap, setBadgesMap] = useState<Record<string, string>>({})
  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminded, setReminded] = useState(false)

  // Reply states
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())

  // Watchlist
  const [watchlistStatus, setWatchlistStatus] = useState<null | 'saved' | 'watched'>(null)
  const [watchlistItemId, setWatchlistItemId] = useState<string | null>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  // Popups
  const [actorPopup, setActorPopup] = useState<{ id: number; name: string; profile: string | null } | null>(null)
  const [directorPopup, setDirectorPopup] = useState<{ id: number; name: string } | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  // Reviews için canonical title
  const reviewKey = (currentOriginalTitle && currentOriginalTitle !== currentTitle) ? currentOriginalTitle : currentTitle

  const BADGE_EMOJIS: Record<string, string> = {
    'Yeni Üye': '🌱', 'Film Sever': '🎬', 'Sinefil': '🎭',
    'Film Gurmesi': '👑', 'Efsane Eleştirmen': '🏆',
  }

  const myExistingReview = reviews.find(r => r.user_id === user?.id)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // Body scroll kilidi
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  // Popup kapandığında/sıfırlandığında navStack temizle
  useEffect(() => {
    if (!isOpen) {
      setNavStack([])
      setCurrentOverride(null)
      setActorPopup(null)
      setDirectorPopup(null)
      setReviewModalOpen(false)
    }
  }, [isOpen])

  // TMDB verisi çek
  useEffect(() => {
    if (!isOpen || !currentMovieId) return
    setEnriched(null)
    setLoadingEnrich(true)
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    const fetchAll = async () => {
      try {
        const [details, credits, videos, providersData] = await Promise.all([
          fetchCached(`https://api.themoviedb.org/3/${currentMediaType}/${currentMovieId}?api_key=${apiKey}&language=tr-TR`) as Promise<any>,
          fetchCached(`https://api.themoviedb.org/3/${currentMediaType}/${currentMovieId}/credits?api_key=${apiKey}&language=tr-TR`) as Promise<any>,
          fetchCached(`https://api.themoviedb.org/3/${currentMediaType}/${currentMovieId}/videos?api_key=${apiKey}`) as Promise<any>,
          fetchCached(`https://api.themoviedb.org/3/${currentMediaType}/${currentMovieId}/watch/providers?api_key=${apiKey}`) as Promise<any>,
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
            const colData = await fetchCached(`https://api.themoviedb.org/3/collection/${details.belongs_to_collection.id}?api_key=${apiKey}&language=tr-TR`) as any
            collection_name = colData.name || null
            collection_movies = (colData.parts || [])
              .sort((a: any, b: any) => (a.release_date || '').localeCompare(b.release_date || ''))
              .map((p: any) => ({ id: p.id, title: p.title, poster_path: p.poster_path, release_date: p.release_date ? p.release_date.substring(0, 4) : '' }))
          } catch {}
        }
        const fetchedBackdrop = details.backdrop_path ? `https://image.tmdb.org/t/p/w780${details.backdrop_path}` : null
        const fetchedOverview = details.overview || null
        setEnriched({ trailer_key: trailer?.key || null, cast, director: directorEntry?.name || null, directorId: directorEntry?.id || null, collection_name, collection_movies, providers: trProviders, fetchedBackdrop, fetchedOverview })
      } catch {
        setEnriched({ trailer_key: null, cast: [], director: null, directorId: null, collection_name: null, collection_movies: [], providers: [], fetchedBackdrop: null, fetchedOverview: null })
      } finally {
        setLoadingEnrich(false)
      }
    }
    fetchAll()
  }, [isOpen, currentMovieId, currentMediaType])

  // Yorumları çek
  useEffect(() => {
    if (!isOpen) return
    setReviewsLoading(true)
    setMyRating(7)
    setMyComment('')
    setSubmitMsg('')
    setLikesMap({})
    setMyLikes(new Set())
    supabase
      .from('reviews')
      .select('id, user_id, user_name, rating, comment, created_at, parent_id')
      .eq('movie_title', reviewKey)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const list = data || []
        setReviews(list)
        const userIds = list.map(r => r.user_id).filter((id, i, arr) => arr.indexOf(id) === i)
        const reviewIds = list.map(r => r.id)
        const fetches: PromiseLike<void>[] = []
        if (userIds.length > 0) {
          fetches.push(supabase.from('user_points').select('user_id, badge').in('user_id', userIds)
            .then(({ data: pts }) => {
              if (pts) {
                const map: Record<string, string> = {}
                pts.forEach((p: { user_id: string; badge: string }) => { map[p.user_id] = p.badge })
                setBadgesMap(map)
              }
            }))
        }
        if (reviewIds.length > 0) {
          fetches.push(supabase.from('comment_likes').select('review_id, user_id').in('review_id', reviewIds)
            .then(({ data: likes }) => {
              if (likes) {
                const counts: Record<string, number> = {}
                const mine = new Set<string>()
                likes.forEach((l: { review_id: string; user_id: string }) => {
                  counts[l.review_id] = (counts[l.review_id] || 0) + 1
                  if (user && l.user_id === user.id) mine.add(l.review_id)
                })
                setLikesMap(counts)
                setMyLikes(mine)
              }
            }))
        }
        await Promise.all(fetches)
        setReviewsLoading(false)
      })
  }, [isOpen, reviewKey])

  // Watchlist durumu kontrol et
  useEffect(() => {
    if (!isOpen || !user || !currentTitle) return
    setWatchlistStatus(null)
    setWatchlistItemId(null)
    supabase
      .from('watchlist')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('title', currentTitle)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWatchlistItemId(data.id)
          setWatchlistStatus((data.status as 'saved' | 'watched') || 'saved')
        }
      })
  }, [isOpen, user, currentTitle])

  // Navigation
  const navigateTo = (next: NavItem) => {
    const current: NavItem = {
      movieId: currentMovieId!,
      mediaType: currentMediaType,
      title: currentTitle,
      originalTitle: currentOriginalTitle,
      turkishTitle: currentTurkishTitle,
      poster: enriched?.fetchedBackdrop ? currentPoster : currentPoster,
      backdrop: currentBackdrop,
      overview: enriched?.fetchedOverview ?? currentOverview,
      releaseDate: currentReleaseDate,
      voteAverage: currentVoteAverage,
    }
    setNavStack(prev => [...prev, current])
    setCurrentOverride(next)
    setEnriched(null)
    setWatchlistStatus(null)
    setWatchlistItemId(null)
    setReminded(false)
    setReminderOpen(false)
  }

  const navigateBack = () => {
    if (navStack.length === 0) { onClose(); return }
    const prev = navStack[navStack.length - 1]
    setNavStack(s => s.slice(0, -1))
    setCurrentOverride(navStack.length === 1 ? null : prev)
    if (navStack.length === 1) {
      setCurrentOverride(null)
    } else {
      setCurrentOverride(prev)
    }
    setEnriched(null)
    setWatchlistStatus(null)
    setWatchlistItemId(null)
    setReminded(false)
    setReminderOpen(false)
  }

  const handleSubmitReview = async () => {
    if (!user) return
    const modResult = moderateComment(myComment)
    if (!modResult.approved) { setSubmitMsg(modResult.reason); return }
    setSubmitting(true)
    setSubmitMsg('')
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      user_name: userName,
      movie_title: reviewKey,
      movie_type: contentType || (currentMediaType === 'movie' ? 'film' : 'dizi'),
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
        parent_id: null,
      }
      setReviews(prev => [newReview, ...prev])
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

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyText.trim() || replySubmitting) return
    setReplySubmitting(true)
    const modResult = (await import('@/lib/moderation')).moderateComment(replyText)
    if (!modResult.approved) { setReplySubmitting(false); return }
    let userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'
    try {
      const { data: pd } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()
      if (pd?.nickname) userName = pd.nickname
    } catch {}
    const { data, error } = await supabase.from('reviews').insert({
      user_id: user.id,
      user_name: userName,
      movie_title: reviewKey,
      movie_type: contentType || (currentMediaType === 'movie' ? 'film' : 'dizi'),
      rating: 5,
      comment: replyText.trim(),
      parent_id: parentId,
    }).select('id, user_id, user_name, rating, comment, created_at, parent_id').single()
    if (!error && data) {
      setReviews(prev => [...prev, data as Review])
      setExpandedReplies(prev => new Set(Array.from(prev).concat(parentId)))
    }
    setReplyText('')
    setReplyingTo(null)
    setReplySubmitting(false)
  }

  const handleToggleLike = async (reviewId: string) => {
    if (!user || likingId) return
    setLikingId(reviewId)
    const liked = myLikes.has(reviewId)
    if (liked) {
      await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('review_id', reviewId)
      setMyLikes(prev => { const s = new Set(prev); s.delete(reviewId); return s })
      setLikesMap(prev => ({ ...prev, [reviewId]: Math.max(0, (prev[reviewId] || 1) - 1) }))
    } else {
      await supabase.from('comment_likes').insert({ user_id: user.id, review_id: reviewId })
      setMyLikes(prev => new Set(Array.from(prev).concat(reviewId)))
      setLikesMap(prev => ({ ...prev, [reviewId]: (prev[reviewId] || 0) + 1 }))
    }
    setLikingId(null)
  }

  const handleShare = async () => {
    const shareTitle = currentTitle
    const text = `"${shareTitle}" ${contentType === 'dizi' ? 'dizisini' : 'filmini'} izlemelisin! 🎬`
    const url = `https://ne-izlesemapp.vercel.app/film/${encodeURIComponent(shareTitle)}`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: shareTitle, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      if (user) { supabase.rpc('award_share_points').then(() => {}) }
    } catch {}
  }

  const handleReminder = (opt: 'tonight' | 'tomorrow' | 'weekend') => {
    const d = new Date()
    let ts: number
    if (opt === 'tonight') {
      d.setHours(20, 0, 0, 0)
      if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
      ts = d.getTime()
    } else if (opt === 'tomorrow') {
      d.setDate(d.getDate() + 1); d.setHours(20, 0, 0, 0); ts = d.getTime()
    } else {
      const dSat = (6 - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + dSat); d.setHours(20, 0, 0, 0); ts = d.getTime()
    }
    try {
      const list = JSON.parse(localStorage.getItem('ne_izlesem_reminders') || '[]')
      list.push({ id: Date.now().toString(), title: currentTitle, reminderTime: ts })
      localStorage.setItem('ne_izlesem_reminders', JSON.stringify(list))
    } catch {}
    setReminded(true)
    setReminderOpen(false)
  }

  const handleAddToList = async () => {
    if (!user) { signInWithGoogle(); return }
    if (watchlistStatus) return
    setWatchlistLoading(true)
    const { data, error } = await supabase.from('watchlist').insert({
      user_id: user.id,
      title: currentTitle,
      turkish_title: currentTurkishTitle || null,
      type: contentType || (currentMediaType === 'movie' ? 'film' : 'dizi'),
      year: year ?? (currentReleaseDate ? parseInt(currentReleaseDate.substring(0, 4)) : null),
      imdb: currentVoteAverage ?? imdb ?? null,
      status: 'saved',
    }).select('id').single()
    if (!error && data) { setWatchlistStatus('saved'); setWatchlistItemId(data.id) }
    setWatchlistLoading(false)
  }

  const handleMarkWatched = async () => {
    if (!user) { signInWithGoogle(); return }
    setWatchlistLoading(true)
    if (watchlistStatus === 'watched') {
      setWatchlistLoading(false)
      return
    }
    if (watchlistItemId) {
      await supabase.from('watchlist').update({ status: 'watched' }).eq('id', watchlistItemId)
      setWatchlistStatus('watched')
    } else {
      const { data, error } = await supabase.from('watchlist').insert({
        user_id: user.id,
        title: currentTitle,
        turkish_title: currentTurkishTitle || null,
        type: contentType || (currentMediaType === 'movie' ? 'film' : 'dizi'),
        year: year ?? (currentReleaseDate ? parseInt(currentReleaseDate.substring(0, 4)) : null),
        imdb: currentVoteAverage ?? imdb ?? null,
        status: 'watched',
      }).select('id').single()
      if (!error && data) { setWatchlistStatus('watched'); setWatchlistItemId(data.id) }
    }
    setWatchlistLoading(false)
    setReviewModalOpen(true)
  }

  if (!isOpen) return null

  // Görüntülenecek değerler (override'dan veya prop'tan)
  const displayBackdrop = enriched?.fetchedBackdrop ?? currentBackdrop
  const displayOverview = enriched?.fetchedOverview ?? currentOverview
  const displayOriginal = currentOriginalTitle && currentOriginalTitle !== currentTitle ? currentOriginalTitle : null
  const displayTurkish = currentTurkishTitle && currentTurkishTitle !== currentTitle ? currentTurkishTitle : null
  const displayRating = currentVoteAverage ?? imdb
  const displayYear = year ?? (currentReleaseDate ? currentReleaseDate.substring(0, 4) : null)

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center px-4"
        style={{ background: '#000000cc', zIndex }}
        onClick={actorPopup || directorPopup || reviewModalOpen ? undefined : onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden relative popup-enter"
          style={{ background: '#12121a', maxHeight: '85vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Geri / Kapat butonları */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
            {navStack.length > 0 ? (
              <button
                onClick={navigateBack}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#00000088', color: '#f1f5f9' }}
              >
                ← Geri
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: '#00000088', color: '#fff' }}
            >✕</button>
          </div>

          {displayBackdrop ? (
            <div className="relative" style={{ height: '200px' }}>
              <img src={displayBackdrop} alt={currentTitle} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
            </div>
          ) : currentPoster ? (
            <div className="relative" style={{ height: '200px' }}>
              <img src={currentPoster} alt={currentTitle} className="w-full h-full object-cover" style={{ objectPosition: 'top' }} loading="lazy" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, #12121a)' }} />
            </div>
          ) : null}

          <div className="p-5">
            {/* Başlık satırı */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 pr-2">
                <h2 className="text-xl font-bold leading-tight" style={{ color: '#f1f5f9' }}>{currentTitle}</h2>
                {displayOriginal && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayOriginal}</p>}
                {displayTurkish && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{displayTurkish}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {contentType && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: contentType === 'film' ? '#f59e0b22' : '#3b82f622', color: contentType === 'film' ? '#f59e0b' : '#60a5fa' }}>
                    {contentType === 'film' ? 'Film' : 'Dizi'}
                  </span>
                )}
                {/* Hatırlat butonu */}
                <div className="relative">
                  <button
                    onClick={() => setReminderOpen(o => !o)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-sm"
                    style={{ background: reminded ? '#f59e0b22' : '#ffffff12', color: reminded ? '#f59e0b' : '#94a3b8' }}
                    title="Hatırlat"
                  >
                    {reminded ? '✓' : '⏰'}
                  </button>
                  {reminderOpen && (
                    <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden border z-10 min-w-[130px]" style={{ background: '#1e293b', borderColor: '#ffffff15' }}>
                      {(['tonight', 'tomorrow', 'weekend'] as const).map((opt, idx) => (
                        <button
                          key={opt}
                          onClick={() => handleReminder(opt)}
                          className="w-full px-3 py-2 text-left text-xs hover:opacity-80 border-b last:border-b-0"
                          style={{ color: '#f1f5f9', borderColor: '#ffffff10' }}
                        >
                          {['Bu akşam', 'Yarın akşam', 'Bu hafta sonu'][idx]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
              {currentReleaseDate && <span>{formatDateTR(currentReleaseDate)}</span>}
              {!currentReleaseDate && displayYear && <span>{displayYear}</span>}
              {displayRating != null && displayRating > 0 && <span>⭐ {typeof displayRating === 'number' ? displayRating.toFixed(1) : displayRating}</span>}
              {enriched?.director && (
                enriched.directorId ? (
                  <button
                    onClick={() => setDirectorPopup({ id: enriched.directorId!, name: enriched.director! })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', fontSize: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(148,163,184,0.4)' }}
                  >
                    🎬 {enriched.director}
                  </button>
                ) : <span>🎬 {enriched.director}</span>
              )}
              {avgRating && <span style={{ color: '#f59e0b' }}>💬 {avgRating} ({reviews.length})</span>}
            </div>

            {/* Listeme Ekle / İzledim butonları */}
            <div className="mt-2 mb-2 flex gap-2">
              <button
                onClick={handleAddToList}
                disabled={!!watchlistStatus || watchlistLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: watchlistStatus ? '#f59e0b22' : '#ffffff10',
                  color: watchlistStatus ? '#f59e0b' : '#94a3b8',
                  border: watchlistStatus ? '1px solid #f59e0b44' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {watchlistStatus ? '✓ Listede' : watchlistLoading ? '...' : '⏳ Listeme Ekle'}
              </button>
              <button
                onClick={handleMarkWatched}
                disabled={watchlistStatus === 'watched' || watchlistLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: watchlistStatus === 'watched' ? '#22c55e22' : '#ffffff10',
                  color: watchlistStatus === 'watched' ? '#22c55e' : '#94a3b8',
                  border: watchlistStatus === 'watched' ? '1px solid #22c55e44' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {watchlistStatus === 'watched' ? '✓ İzlendi' : '✓ İzledim'}
              </button>
            </div>

            {/* Ödül badge'leri */}
            {(() => {
              const awards = getFilmAwards(currentTitle, currentOriginalTitle)
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
                {enriched.providers.map((p, i) => {
                  const enc = encodeURIComponent(currentTitle)
                  const urls: Record<string, string> = {
                    'Netflix': `https://www.netflix.com/search?q=${enc}`,
                    'Amazon Prime': `https://www.primevideo.com/search?phrase=${enc}`,
                    'Disney+': `https://www.disneyplus.com/search?q=${enc}`,
                    'BluTV': `https://www.blutv.com/arama?q=${enc}`,
                    'MUBI': `https://mubi.com/tr/search?query=${enc}`,
                    'Exxen': `https://www.exxen.com/search?q=${enc}`,
                    'Gain': `https://www.gain.tv/search?q=${enc}`,
                    'HBO Max': `https://www.max.com/search?q=${enc}`,
                    'Tabii': `https://www.tabii.com/search?q=${enc}`,
                  }
                  const href = urls[p]
                  return href ? (
                    <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5 transition-opacity hover:opacity-80"
                      style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33', textDecoration: 'none' }}>
                      {p}
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  ) : (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}>
                      {p}
                    </span>
                  )
                })}
              </div>
            )}

            {displayOverview && (
              <p className="text-sm leading-relaxed mt-3 mb-4" style={{ color: '#cbd5e1' }}>{displayOverview}</p>
            )}

            {/* Oyuncular */}
            {enriched && enriched.cast.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2 tracking-wide" style={{ color: '#64748b' }}>OYUNCULAR</p>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {enriched.cast.map(actor => (
                    <button
                      key={actor.id}
                      onClick={() => setActorPopup({ id: actor.id, name: actor.name, profile: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null })}
                      className="flex-shrink-0 text-center transition-all hover:opacity-80"
                      style={{ width: '60px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden mx-auto mb-1" style={{ background: '#1e293b' }}>
                        {actor.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ color: '#475569', fontSize: '18px' }}>👤</div>
                        )}
                      </div>
                      <p className="text-[9px] leading-tight font-medium" style={{ color: '#cbd5e1' }}>{actor.name.split(' ')[0]}</p>
                      <p className="text-[8px] leading-tight mt-0.5 truncate" style={{ color: '#475569', maxWidth: '60px' }}>{actor.character}</p>
                    </button>
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
                    <button
                      key={cm.id}
                      onClick={() => {
                        if (cm.id === currentMovieId) return
                        navigateTo({
                          movieId: cm.id,
                          mediaType: 'movie',
                          title: cm.title,
                          poster: cm.poster_path ? `https://image.tmdb.org/t/p/w500${cm.poster_path}` : null,
                          backdrop: null,
                          overview: null,
                          releaseDate: cm.release_date,
                        })
                      }}
                      className="flex-shrink-0 rounded-lg overflow-hidden transition-all hover:opacity-80"
                      style={{
                        width: '70px',
                        background: '#0f172a',
                        border: cm.id === currentMovieId ? '2px solid #f59e0b' : '2px solid transparent',
                        cursor: cm.id === currentMovieId ? 'default' : 'pointer',
                        padding: 0,
                      }}
                    >
                      {cm.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${cm.poster_path}`} alt={cm.title} className="w-full object-cover" style={{ height: '105px' }} loading="lazy" />
                      ) : (
                        <div style={{ height: '105px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎬</div>
                      )}
                      <p className="text-[8px] p-1 text-center leading-tight" style={{ color: '#94a3b8' }}>{cm.release_date}</p>
                    </button>
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold tracking-wide" style={{ color: '#64748b' }}>KULLANICI YORUMLARI</p>
                {avgRating && (
                  <span className="text-[10px]" style={{ color: '#f59e0b' }}>⭐ {avgRating} / 10 ({reviews.length} yorum)</span>
                )}
              </div>
              {reviews.length > 1 && (
                <div className="flex gap-1.5 mb-3">
                  {(['newest', 'liked'] as const).map(s => (
                    <button key={s} onClick={() => setReviewSort(s)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                      style={{ background: reviewSort === s ? '#f59e0b' : '#ffffff10', color: reviewSort === s ? '#0a0a0f' : '#64748b' }}>
                      {s === 'newest' ? '🕐 En yeni' : '❤️ En beğenilen'}
                    </button>
                  ))}
                </div>
              )}

              {/* Yorum Formu */}
              {user ? (
                myExistingReview ? (
                  <div className="rounded-xl p-3 mb-4" style={{ background: '#0f172a' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{myExistingReview.rating.toFixed(1)}<span className="text-xs font-normal">/10</span></span>
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
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs" style={{ color: '#94a3b8' }}>Puanın</p>
                      <span className="text-base font-bold" style={{ color: '#f59e0b' }}>{myRating.toFixed(1)}<span className="text-xs font-normal">/10</span></span>
                    </div>
                    <input
                      type="range" min="1" max="10" step="0.5"
                      value={myRating}
                      onChange={e => setMyRating(parseFloat(e.target.value))}
                      className="w-full mb-3"
                      style={{ accentColor: '#f59e0b' }}
                    />
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
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold mt-2 transition-all"
                      style={{ background: '#f59e0b', color: '#0a0a0f', opacity: submitting ? 0.7 : 1 }}
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
              ) : (() => {
                const topLevel = reviews.filter(r => !r.parent_id && r.user_id !== user?.id)
                const repliesMap = reviews.reduce<Record<string, Review[]>>((acc, r) => {
                  if (r.parent_id) { if (!acc[r.parent_id]) acc[r.parent_id] = []; acc[r.parent_id].push(r) }
                  return acc
                }, {})
                if (topLevel.length === 0) return (
                  <p className="text-xs text-center py-3" style={{ color: '#475569' }}>
                    {reviews.filter(r => !r.parent_id).length === 0 ? 'Henüz yorum yok. İlk yorumu sen yap!' : ''}
                  </p>
                )
                return (
                  <div className="flex flex-col gap-3">
                    {[...topLevel]
                      .sort((a, b) => reviewSort === 'liked'
                        ? (likesMap[b.id] || 0) - (likesMap[a.id] || 0)
                        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      )
                      .map(review => {
                        const reviewReplies = repliesMap[review.id] || []
                        const isExpanded = expandedReplies.has(review.id)
                        return (
                          <div key={review.id} className="rounded-xl p-3" style={{ background: '#0f172a' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                                  {review.user_name.charAt(0).toUpperCase()}
                                </div>
                                <a href={`/user/${review.user_id}`} onClick={e => e.stopPropagation()} className="text-xs font-medium hover:underline" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{review.user_name.split(' ')[0]}</a>
                                {badgesMap[review.user_id] && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#f59e0b15', color: '#f59e0b' }} title={badgesMap[review.user_id]}>
                                    {BADGE_EMOJIS[badgesMap[review.user_id]] || ''} {badgesMap[review.user_id]}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{review.rating.toFixed(1)}/10</span>
                                <span className="text-[10px]" style={{ color: '#475569' }}>{relativeTime(review.created_at)}</span>
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-xs leading-relaxed mb-2" style={{ color: '#94a3b8' }}>{review.comment}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleLike(review.id)}
                                disabled={!user || likingId === review.id}
                                className="flex items-center gap-1 transition-all"
                                style={{ background: 'none', border: 'none', cursor: user ? 'pointer' : 'default', padding: 0 }}
                              >
                                <span style={{ fontSize: '12px', opacity: likingId === review.id ? 0.5 : 1 }}>{myLikes.has(review.id) ? '❤️' : '🤍'}</span>
                                <span className="text-[10px]" style={{ color: myLikes.has(review.id) ? '#f43f5e' : '#475569' }}>{likesMap[review.id] || 0}</span>
                              </button>
                              {user && (
                                <button
                                  onClick={() => { setReplyingTo(replyingTo === review.id ? null : review.id); setReplyText('') }}
                                  className="text-[10px] transition-all"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: replyingTo === review.id ? '#f59e0b' : '#475569', padding: 0 }}
                                >
                                  ↩ Yanıtla
                                </button>
                              )}
                              {reviewReplies.length > 0 && (
                                <button
                                  onClick={() => setExpandedReplies(prev => {
                                    const s = new Set(Array.from(prev))
                                    if (s.has(review.id)) s.delete(review.id); else s.add(review.id)
                                    return s
                                  })}
                                  className="text-[10px] transition-all"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                                >
                                  {isExpanded ? '▲ Yanıtları gizle' : `▼ ${reviewReplies.length} yanıt göster`}
                                </button>
                              )}
                            </div>

                            {/* Reply textarea */}
                            {replyingTo === review.id && (
                              <div className="mt-2 pl-4 border-l" style={{ borderColor: '#f59e0b44' }}>
                                <textarea
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  placeholder="Yanıtınızı yazın..."
                                  rows={2}
                                  autoFocus
                                  className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none mb-1.5"
                                  style={{ background: '#0a0a0f', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => { setReplyingTo(null); setReplyText('') }}
                                    className="text-[10px] px-2.5 py-1 rounded-full"
                                    style={{ background: '#ffffff10', color: '#64748b' }}
                                  >İptal</button>
                                  <button
                                    onClick={() => handleSubmitReply(review.id)}
                                    disabled={!replyText.trim() || replySubmitting}
                                    className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                                    style={{ background: '#f59e0b', color: '#0a0a0f', opacity: (!replyText.trim() || replySubmitting) ? 0.5 : 1 }}
                                  >{replySubmitting ? '...' : 'Gönder'}</button>
                                </div>
                              </div>
                            )}

                            {/* Nested replies */}
                            {isExpanded && reviewReplies.length > 0 && (
                              <div className="mt-2 flex flex-col gap-2 pl-4 border-l" style={{ borderColor: '#ffffff10' }}>
                                {reviewReplies
                                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                  .map(reply => (
                                  <div key={reply.id} className="rounded-lg p-2.5" style={{ background: '#0a0a0f' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: '#7F77DD22', color: '#7F77DD' }}>
                                        {reply.user_name.charAt(0).toUpperCase()}
                                      </div>
                                      <a href={`/user/${reply.user_id}`} onClick={e => e.stopPropagation()} className="text-[10px] font-medium hover:underline" style={{ color: '#cbd5e1', textDecoration: 'none' }}>{reply.user_name.split(' ')[0]}</a>
                                      <span className="text-[9px]" style={{ color: '#334155' }}>{relativeTime(reply.created_at)}</span>
                                    </div>
                                    {reply.comment && <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: '#94a3b8' }}>{reply.comment}</p>}
                                    <button
                                      onClick={() => handleToggleLike(reply.id)}
                                      disabled={!user || likingId === reply.id}
                                      className="flex items-center gap-1"
                                      style={{ background: 'none', border: 'none', cursor: user ? 'pointer' : 'default', padding: 0 }}
                                    >
                                      <span style={{ fontSize: '11px', opacity: likingId === reply.id ? 0.5 : 1 }}>{myLikes.has(reply.id) ? '❤️' : '🤍'}</span>
                                      <span className="text-[9px]" style={{ color: myLikes.has(reply.id) ? '#f43f5e' : '#475569' }}>{likesMap[reply.id] || 0}</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Oyuncu popup — z-[60] */}
      {actorPopup && (
        <PersonPopup
          personId={actorPopup.id}
          personName={actorPopup.name}
          personProfile={actorPopup.profile}
          onClose={() => setActorPopup(null)}
          onSelectFilm={(film: FilmNavItem) => {
            setActorPopup(null)
            navigateTo({
              movieId: film.movieId,
              mediaType: film.mediaType,
              title: film.title,
              originalTitle: film.originalTitle,
              poster: film.poster,
              backdrop: film.backdrop,
              overview: film.overview,
              releaseDate: film.releaseDate,
              voteAverage: film.voteAverage,
            })
          }}
          zIndex={60}
        />
      )}

      {/* Yönetmen popup — z-[60] */}
      {directorPopup && (
        <PersonPopup
          personId={directorPopup.id}
          personName={directorPopup.name}
          onClose={() => setDirectorPopup(null)}
          mode="director"
          onSelectFilm={(film: FilmNavItem) => {
            setDirectorPopup(null)
            navigateTo({
              movieId: film.movieId,
              mediaType: film.mediaType,
              title: film.title,
              originalTitle: film.originalTitle,
              poster: film.poster,
              backdrop: film.backdrop,
              overview: film.overview,
              releaseDate: film.releaseDate,
              voteAverage: film.voteAverage,
            })
          }}
          zIndex={60}
        />
      )}

      {/* İzledim sonrası yorum popup — z-[70] */}
      {reviewModalOpen && (
        <WatchedReviewModal
          title={currentTitle}
          originalTitle={currentOriginalTitle}
          mediaType={currentMediaType}
          onClose={() => setReviewModalOpen(false)}
          onSubmitted={({ rating, comment }) => {
            const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'
            const newReview: Review = {
              id: crypto.randomUUID(),
              user_id: user!.id,
              user_name: userName,
              rating,
              comment,
              created_at: new Date().toISOString(),
              parent_id: null,
            }
            setReviews(prev => [newReview, ...prev])
          }}
          zIndex={zIndex + 20}
        />
      )}
    </>
  )
}
