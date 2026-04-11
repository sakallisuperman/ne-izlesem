'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import MovieDetailPopup from '@/components/MovieDetailPopup'

interface Recommendation {
  title: string
  turkish_title: string
  type: string
  year: number
  duration: string
  imdb: number
  platform: string
  reason: string
  tags: string[]
}

interface TMDBResult {
  poster_path: string | null
  trailer_key: string | null
  tmdb_id: number | null
  backdrop: string | null
  overview: string | null
  media_type: 'movie' | 'tv'
}

async function fetchTMDB(title: string, type: string): Promise<TMDBResult> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
  const mediaType = type === 'film' ? 'movie' : 'tv'
  const searchRes = await fetch(
    `https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=tr-TR`
  )
  const searchData = await searchRes.json()
  const item = searchData.results?.[0]
  if (!item) return { poster_path: null, trailer_key: null, tmdb_id: null, backdrop: null, overview: null, media_type: mediaType }
  const videoRes = await fetch(
    `https://api.themoviedb.org/3/${mediaType}/${item.id}/videos?api_key=${apiKey}`
  )
  const videoData = await videoRes.json()
  const trailer = videoData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
  return {
    poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    trailer_key: trailer?.key || null,
    tmdb_id: item.id || null,
    backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
    overview: item.overview || null,
    media_type: mediaType,
  }
}

function getReminderTime(opt: 'tonight' | 'tomorrow' | 'weekend'): number {
  const d = new Date()
  if (opt === 'tonight') {
    d.setHours(20, 0, 0, 0)
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1)
    return d.getTime()
  }
  if (opt === 'tomorrow') {
    d.setDate(d.getDate() + 1)
    d.setHours(20, 0, 0, 0)
    return d.getTime()
  }
  const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + daysUntilSat)
  d.setHours(20, 0, 0, 0)
  return d.getTime()
}

function saveReminder(title: string, opt: 'tonight' | 'tomorrow' | 'weekend', mood?: string) {
  const key = 'ne_izlesem_reminders'
  const list = JSON.parse(localStorage.getItem(key) || '[]')
  list.push({ id: Date.now().toString(), title, reminderTime: getReminderTime(opt), mood })
  localStorage.setItem(key, JSON.stringify(list))
}

const DISLIKE_REASONS = [
  'Daha kısa filmler istiyorum ⏱️',
  'Daha hafif/eğlenceli istiyorum 😊',
  'Farklı türde keşfetmek istiyorum 🎭',
  'Bunları zaten izledim ✅',
]

const REMINDER_OPTIONS: { key: 'tonight' | 'tomorrow' | 'weekend'; label: string }[] = [
  { key: 'tonight', label: 'Bu akşam' },
  { key: 'tomorrow', label: 'Yarın akşam' },
  { key: 'weekend', label: 'Bu hafta sonu' },
]

async function fetchRecs(
  answers: any,
  excludeTitles: string[],
  options?: { feedback?: string[]; previousTitles?: string[]; reverseMode?: boolean }
): Promise<Recommendation[]> {
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, excludeTitles, ...options }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.recommendations
}

async function loadTMDB(recs: Recommendation[]): Promise<Record<number, TMDBResult>> {
  const tmdb: Record<number, TMDBResult> = {}
  await Promise.all(recs.map(async (rec, i) => { tmdb[i] = await fetchTMDB(rec.title, rec.type) }))
  return tmdb
}

export default function Results() {
  const router = useRouter()
  const { user, signInWithGoogle } = useAuth()

  const [quizAnswers, setQuizAnswers] = useState<any>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [tmdbData, setTmdbData] = useState<Record<number, TMDBResult>>({})
  const [reverseRecs, setReverseRecs] = useState<Recommendation[] | null>(null)
  const [reverseTmdb, setReverseTmdb] = useState<Record<number, TMDBResult>>({})
  const [reverseLoading, setReverseLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const [savingTitle, setSavingTitle] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'normal' | 'reverse'>('normal')
  const [dislikeModal, setDislikeModal] = useState(false)
  const [dislikeReasons, setDislikeReasons] = useState<string[]>([])
  const [dislikeCount, setDislikeCount] = useState(0)
  const [dislikeLoading, setDislikeLoading] = useState(false)
  const [reminderOpen, setReminderOpen] = useState<string | null>(null) // title
  const [remindedTitles, setRemindedTitles] = useState<Set<string>>(new Set())
  const [detailPopup, setDetailPopup] = useState<{ rec: Recommendation; tmdb: TMDBResult } | null>(null)

  useEffect(() => {
    const answers = JSON.parse(localStorage.getItem('quiz_answers') || '{}')
    if (!Object.keys(answers).length) { router.push('/quiz'); return }
    setQuizAnswers(answers)
    const excludeTitles = JSON.parse(localStorage.getItem('watched_titles') || '[]')
    fetchRecs(answers, excludeTitles)
      .then(async recs => {
        setRecommendations(recs)
        setTmdbData(await loadTMDB(recs))
      })
      .catch(() => setError('Bir sorun oluştu, tekrar dene'))
      .finally(() => setLoading(false))
  }, [])

  // Close reminder dropdown when clicking outside
  useEffect(() => {
    if (!reminderOpen) return
    const handler = () => setReminderOpen(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [reminderOpen])

  const handleReverseTab = useCallback(async () => {
    setActiveTab('reverse')
    if (reverseRecs !== null) return
    setReverseLoading(true)
    try {
      const excludeTitles = JSON.parse(localStorage.getItem('watched_titles') || '[]')
      const recs = await fetchRecs(quizAnswers, excludeTitles, { reverseMode: true })
      setReverseRecs(recs)
      setReverseTmdb(await loadTMDB(recs))
    } catch {
      setReverseRecs([])
    } finally {
      setReverseLoading(false)
    }
  }, [quizAnswers, reverseRecs])

  const handleDislikeSubmit = async () => {
    if (dislikeLoading) return
    setDislikeLoading(true)
    try {
      const excludeTitles = JSON.parse(localStorage.getItem('watched_titles') || '[]')
      const previousTitles = recommendations.map(r => r.title)
      const recs = await fetchRecs(quizAnswers, excludeTitles, {
        feedback: dislikeReasons,
        previousTitles,
      })
      setRecommendations(recs)
      setTmdbData(await loadTMDB(recs))
      setSavedItems(new Set())
      setActiveTab('normal')
      setDislikeCount(c => c + 1)
    } catch {}
    setDislikeModal(false)
    setDislikeReasons([])
    setDislikeLoading(false)
  }

  const shareRec = async (rec: Recommendation, index: number) => {
    const text = `"${rec.title}" ${rec.type === 'dizi' ? 'dizisini' : 'filmini'} izlemelisin! 🎬`
    const url = `https://ne-izlesemapp.vercel.app/film/${encodeURIComponent(rec.title)}`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: rec.title, text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 2000)
      }
      if (user) { supabase.rpc('award_share_points').then(() => {}) }
    } catch {}
  }

  const saveToWatchlist = async (rec: Recommendation) => {
    if (!user) { signInWithGoogle(); return }
    setSavingTitle(rec.title)
    const { error: err } = await supabase.from('watchlist').insert({
      user_id: user.id, title: rec.title, turkish_title: rec.turkish_title,
      type: rec.type, year: rec.year, duration: rec.duration,
      imdb: rec.imdb, platform: rec.platform, reason: rec.reason, tags: rec.tags,
    })
    if (!err) setSavedItems(prev => new Set([...Array.from(prev), rec.title]))
    setSavingTitle(null)
  }

  const handleReminder = (title: string, opt: 'tonight' | 'tomorrow' | 'weekend', mood?: string) => {
    saveReminder(title, opt, mood)
    setRemindedTitles(prev => new Set([...Array.from(prev), title]))
    setReminderOpen(null)
  }

  const displayRecs = activeTab === 'normal' ? recommendations : (reverseRecs || [])
  const displayTmdb = activeTab === 'normal' ? tmdbData : reverseTmdb

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-6xl mb-6 animate-bounce">🎬</div>
        <p className="text-xl font-medium" style={{ color: '#f59e0b' }}>Sana özel seçkini hazırlıyoruz...</p>
        <p className="text-sm mt-3" style={{ color: '#94a3b8' }}>Bu birkaç saniye sürebilir</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-6xl mb-6">😔</div>
        <p className="text-xl mb-6" style={{ color: '#f1f5f9' }}>{error}</p>
        <button onClick={() => router.push('/quiz')} className="px-8 py-3 rounded-full font-semibold" style={{ background: '#f59e0b', color: '#0a0a0f' }}>
          Tekrar Dene
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-6" style={{ background: '#0a0a0f' }}>
      {/* Film detay popup */}
      {detailPopup && (
        <MovieDetailPopup
          isOpen
          onClose={() => setDetailPopup(null)}
          movieId={detailPopup.tmdb.tmdb_id}
          mediaType={detailPopup.tmdb.media_type}
          title={detailPopup.rec.title}
          turkishTitle={detailPopup.rec.turkish_title !== detailPopup.rec.title ? detailPopup.rec.turkish_title : undefined}
          poster={detailPopup.tmdb.poster_path}
          backdrop={detailPopup.tmdb.backdrop}
          overview={detailPopup.tmdb.overview}
          voteAverage={detailPopup.rec.imdb}
          year={detailPopup.rec.year}
          imdb={detailPopup.rec.imdb}
          contentType={detailPopup.rec.type === 'film' ? 'film' : 'dizi'}
        />
      )}
      {/* Trailer overlay */}
      {activeTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#000000cc' }} onClick={() => setActiveTrailer(null)}>
          <div className="w-full max-w-3xl aspect-video px-4" onClick={e => e.stopPropagation()}>
            <iframe className="w-full h-full rounded-2xl" src={`https://www.youtube.com/embed/${activeTrailer}?autoplay=1`} allowFullScreen allow="autoplay" />
            <button className="mt-4 text-sm w-full text-center" style={{ color: '#94a3b8' }} onClick={() => setActiveTrailer(null)}>Kapat ✕</button>
          </div>
        </div>
      )}

      {/* Beğenmedim modal */}
      {dislikeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => !dislikeLoading && setDislikeModal(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: '#12121a', borderColor: '#ffffff15' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#f1f5f9' }}>Ne arıyorsun? 🎯</h3>
            <p className="text-xs mb-4" style={{ color: '#64748b' }}>Seç, sana daha uygun öneriler getirelim.</p>
            <div className="flex flex-col gap-2 mb-5">
              {DISLIKE_REASONS.map(reason => {
                const active = dislikeReasons.includes(reason)
                return (
                  <button
                    key={reason}
                    onClick={() => setDislikeReasons(prev => active ? prev.filter(r => r !== reason) : [...prev, reason])}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all border"
                    style={{
                      background: active ? '#f59e0b15' : '#0f172a',
                      color: active ? '#f59e0b' : '#94a3b8',
                      borderColor: active ? '#f59e0b44' : '#ffffff10',
                    }}
                  >
                    <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 text-[10px]"
                      style={{ borderColor: active ? '#f59e0b' : '#475569', background: active ? '#f59e0b' : 'transparent', color: '#0a0a0f' }}>
                      {active ? '✓' : ''}
                    </span>
                    {reason}
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleDislikeSubmit}
              disabled={dislikeLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: '#f59e0b', color: '#0a0a0f', opacity: dislikeLoading ? 0.7 : 1 }}
            >
              {dislikeLoading ? '⏳ Yeni öneriler yükleniyor...' : 'Gönder ve Yeni Öneriler Al'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Ana Sayfa geri linki */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 mb-6 text-sm transition-opacity hover:opacity-70"
          style={{ color: '#94a3b8' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Ana Sayfa
        </button>
        <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#f59e0b' }}>Senin İçin Seçtik 🎬</h1>
        <p className="text-center mb-6" style={{ color: '#94a3b8' }}>Ruh haline göre 6 öneri — 3 film, 3 dizi</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{ background: '#12121a' }}>
          <button
            onClick={() => setActiveTab('normal')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === 'normal' ? '#f59e0b' : 'transparent',
              color: activeTab === 'normal' ? '#0a0a0f' : '#64748b',
            }}
          >
            🎯 Senin İçin
          </button>
          <button
            onClick={handleReverseTab}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === 'reverse' ? '#7F77DD' : 'transparent',
              color: activeTab === 'reverse' ? '#fff' : '#64748b',
            }}
          >
            ✨ Ruh Haline İyi Gelecek
          </button>
        </div>

        {/* Reverse loading */}
        {activeTab === 'reverse' && reverseLoading && (
          <div className="flex flex-col items-center py-16">
            <div className="mb-4" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #f59e0b33', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} />
            <p className="text-sm font-medium" style={{ color: '#7F77DD' }}>Tam tersini arıyoruz...</p>
          </div>
        )}

        {/* Cards */}
        {!(activeTab === 'reverse' && reverseLoading) && (
          <div className="flex flex-col gap-6">
            {displayRecs.map((rec, i) => (
              <div key={`${activeTab}-${i}`} className="rounded-2xl overflow-hidden border" style={{ background: '#12121a', borderColor: '#ffffff15' }}>
                {displayTmdb[i]?.poster_path && (
                  <div className="relative cursor-pointer" onClick={() => setDetailPopup({ rec, tmdb: displayTmdb[i] })}>
                    <img src={displayTmdb[i].poster_path!} alt={`${rec.title} posteri`} className="w-full object-cover" style={{ maxHeight: '300px', objectPosition: 'top' }} loading="lazy" />
                    {displayTmdb[i]?.trailer_key && (
                      <button onClick={e => { e.stopPropagation(); setActiveTrailer(displayTmdb[i].trailer_key!) }} className="absolute inset-0 flex items-center justify-center" style={{ background: '#00000066' }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#f59e0b' }}>
                          <span className="text-2xl ml-1">▶</span>
                        </div>
                      </button>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <button className="text-left flex-1" onClick={() => displayTmdb[i] && setDetailPopup({ rec, tmdb: displayTmdb[i] })}>
                      <h2 className="text-xl font-bold hover:opacity-80 transition-opacity" style={{ color: '#f1f5f9' }}>{rec.title}</h2>
                      {rec.turkish_title && rec.turkish_title !== rec.title && (
                        <p className="text-sm" style={{ color: '#94a3b8' }}>{rec.turkish_title}</p>
                      )}
                    </button>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold ml-3 shrink-0"
                      style={{ background: rec.type === 'film' ? '#f59e0b22' : '#3b82f622', color: rec.type === 'film' ? '#f59e0b' : '#3b82f6', border: `1px solid ${rec.type === 'film' ? '#f59e0b44' : '#3b82f644'}` }}>
                      {rec.type === 'film' ? '🎥 Film' : '📺 Dizi'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mb-3 text-sm" style={{ color: '#94a3b8' }}>
                    <span>{rec.year}</span>
                    <span>⏱ {rec.duration}</span>
                    <span>⭐ {rec.imdb}</span>
                    {rec.platform && <span>📺 {rec.platform}</span>}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#cbd5e1' }}>{rec.reason}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {rec.tags?.map((tag, j) => (
                      <span key={j} className="px-2 py-1 rounded-full text-xs" style={{ background: '#ffffff10', color: '#94a3b8' }}>{tag}</span>
                    ))}
                  </div>

                  {/* Butonlar */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => saveToWatchlist(rec)}
                      disabled={savedItems.has(rec.title) || savingTitle === rec.title}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all border"
                      style={{
                        background: savedItems.has(rec.title) ? '#22c55e22' : '#f59e0b11',
                        color: savedItems.has(rec.title) ? '#22c55e' : '#f59e0b',
                        borderColor: savedItems.has(rec.title) ? '#22c55e44' : '#f59e0b33',
                      }}
                    >
                      {savedItems.has(rec.title) ? '✓ Kaydedildi' : savingTitle === rec.title ? 'Kaydediliyor...' : user ? '+ Listeme Ekle' : '+ Kaydet'}
                    </button>

                    {/* Hatırlat butonu */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setReminderOpen(reminderOpen === rec.title ? null : rec.title)}
                        className="px-3 py-3 rounded-xl text-sm font-semibold transition-all border"
                        style={{
                          background: remindedTitles.has(rec.title) ? '#f59e0b22' : '#ffffff08',
                          color: remindedTitles.has(rec.title) ? '#f59e0b' : '#94a3b8',
                          borderColor: remindedTitles.has(rec.title) ? '#f59e0b44' : '#ffffff15',
                        }}
                        title="Hatırlat"
                      >
                        {remindedTitles.has(rec.title) ? '✓ ⏰' : '⏰'}
                      </button>
                      {reminderOpen === rec.title && (
                        <div className="absolute bottom-full right-0 mb-2 rounded-xl overflow-hidden border z-10 min-w-[140px]" style={{ background: '#1e293b', borderColor: '#ffffff15' }}>
                          {REMINDER_OPTIONS.map(opt => (
                            <button
                              key={opt.key}
                              onClick={() => handleReminder(rec.title, opt.key, quizAnswers.mood)}
                              className="w-full px-4 py-2.5 text-left text-xs hover:opacity-80 transition-opacity border-b last:border-b-0"
                              style={{ color: '#f1f5f9', borderColor: '#ffffff10' }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => shareRec(rec, i)}
                      className="px-3 py-3 rounded-xl text-sm font-semibold transition-all border flex items-center gap-1.5"
                      style={{
                        background: copiedIndex === i ? '#22c55e22' : '#ffffff08',
                        color: copiedIndex === i ? '#22c55e' : '#94a3b8',
                        borderColor: copiedIndex === i ? '#22c55e44' : '#ffffff15',
                      }}
                    >
                      {copiedIndex === i ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      )}
                      {copiedIndex === i ? 'Kopyalandı' : 'Öner'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alt butonlar */}
        <div className="flex gap-3 justify-center flex-wrap mt-10">
          <button onClick={() => router.push('/')}
            className="px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 border"
            style={{ background: 'transparent', color: '#94a3b8', borderColor: '#ffffff20' }}>
            Ana Sayfa
          </button>
          {dislikeCount < 2 && (
            <button
              onClick={() => setDislikeModal(true)}
              className="px-8 py-4 rounded-full font-semibold transition-all hover:scale-105 border"
              style={{ background: 'transparent', color: '#94a3b8', borderColor: '#ffffff20' }}
            >
              🎲 Farklı Öneriler Keşfet
            </button>
          )}
          <button onClick={() => router.push('/quiz')}
            className="px-10 py-4 rounded-full font-semibold transition-all hover:scale-105"
            style={{ background: '#f59e0b', color: '#0a0a0f' }}>
            Tekrar Başla
          </button>
        </div>
      </div>
    </main>
  )
}
