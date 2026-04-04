'use client'
import { useState } from 'react'

export default function StarRating({ onRate }: { onRate: (rating: number) => void }) {
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(0)

  const handleRate = (value: number) => {
    setRating(value)
    onRate(value)
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-lg transition-all hover:scale-110"
          style={{ color: star <= (hover || rating) ? '#f59e0b' : '#ffffff20' }}
        >
          ★
        </button>
      ))}
      {rating > 0 && (
        <span className="text-[10px] ml-1" style={{ color: '#64748b' }}>{rating}/5</span>
      )}
    </div>
  )
}
