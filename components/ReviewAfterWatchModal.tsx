'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { moderateComment } from '@/lib/moderation'

interface ReviewAfterWatchModalProps {
  title: string
  originalTitle?: string
  mediaType: 'movie' | 'tv'
  onClose: () => void
}

export default function ReviewAfterWatchModal({
  title, originalTitle, mediaType, onClose,
}: ReviewAfterWatchModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(7)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  const reviewKey = originalTitle && originalTitle !== title ? originalTitle : title

  const handleSubmit = async () => {
    if (!user) return
    const modResult = moderateComment(comment)
    if (!modResult.approved) {
      setMsg(modResult.reason)
      return
    }
    setSubmitting(true)
    // Nickname varsa onu kullan
    let userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı'
    try {
      const { data: profileData } = await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()
      if (profileData?.nickname) userName = profileData.nickname
    } catch {}
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      user_name: userName,
      movie_title: reviewKey,
      movie_type: mediaType === 'movie' ? 'film' : 'dizi',
      rating,
      comment: comment.trim() || null,
    })
    if (!error) {
      try { await supabase.rpc('award_review_points') } catch {}
      setDone(true)
      setTimeout(onClose, 1200)
    } else {
      console.error('Review insert error:', error)
      setMsg('Yorum kaydedilemedi, tekrar dene.')
    }
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-4 pb-4"
      style={{ background: '#000000bb' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 border"
        style={{ background: '#12121a', borderColor: '#ffffff15' }}
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold" style={{ color: '#22c55e' }}>Yorumun eklendi!</p>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold mb-1" style={{ color: '#f1f5f9' }}>Bu filmi puanla 🎬</h3>
            <p className="text-xs mb-4" style={{ color: '#64748b' }}>"{title}"</p>

            {/* Slider */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: '#94a3b8' }}>Puanın</span>
                <span className="text-lg font-bold" style={{ color: '#f59e0b' }}>{rating.toFixed(1)}<span className="text-xs font-normal">/10</span></span>
              </div>
              <input
                type="range" min="1" max="10" step="0.5"
                value={rating}
                onChange={e => setRating(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
                style={{ accentColor: '#f59e0b' }}
              />
              <div className="flex justify-between text-[9px] mt-0.5" style={{ color: '#334155' }}>
                <span>1</span><span>5</span><span>10</span>
              </div>
            </div>

            {/* Yorum */}
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Yorumunuzu yazın... (isteğe bağlı)"
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none mb-3"
              style={{ background: '#0f172a', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.08)' }}
            />

            {msg && <p className="text-xs mb-2" style={{ color: '#ef4444' }}>{msg}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={{ background: 'transparent', color: '#94a3b8', borderColor: '#ffffff15' }}
              >
                Şimdi değil
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#f59e0b', color: '#0a0a0f', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? '...' : 'Gönder'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
