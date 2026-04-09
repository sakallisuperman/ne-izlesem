'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const questions = [
  { id: 'mood',     text: 'Şu an kendini nasıl hissediyorsun?',     type: 'single', options: ['Neşeli', 'Heyecanlı', 'Meraklı', 'Sakin', 'Duygusal', 'Yorgun', 'Canı sıkkın', 'Stresli'] },
  { id: 'time',     text: 'Ne kadar zaman ayırmak istiyorsun?',      type: 'single', options: ['1 saatten az', '1-2 saat', '2-3 saat', '3+ saat (Maraton!)'] },
  { id: 'style',    text: 'Nasıl bir deneyim arıyorsun?',            type: 'single', options: ['Kafamı dağıtmak istiyorum', 'Kendimi kaptırmak istiyorum', 'Düşünmek istiyorum', 'Heyecan yaşamak istiyorum', 'Gülmek istiyorum', 'Ağlamak istiyorum'] },
  { id: 'ending',   text: 'Nasıl bir final olsun?',                  type: 'single', options: ['Mutlu son', 'Açık uçlu', 'Ters köşe', 'Hüzünlü ama güzel', 'Fark etmez'] },
  { id: 'era',      text: 'Hangi dönemden olsun?',                   type: 'single', options: ['1990 öncesi', '1991-2000', '2001-2010', '2011-2020', '2021-2026', 'Fark etmez'] },
  { id: 'language', text: 'Dil tercihin?',                           type: 'single', options: ['Türkçe yapım', 'Yabancı (Altyazılı)', 'Yabancı (Dublajlı)', 'Fark etmez'] },
  { id: 'company',  text: 'Kimlerle izliyorsun?',                    type: 'single', options: ['Yalnız', 'Sevgilimle', 'Arkadaşlarla', 'Aileyle'] },
  { id: 'platform', text: 'Hangi platformları kullanıyorsun?',       type: 'multi',  maxSelect: 4, options: ['Netflix', 'Amazon Prime', 'Disney+', 'BluTV', 'MUBI', 'Exxen', 'Gain', 'HBO Max', 'Tabii', 'Fark etmez'] },
  { id: 'genres',   text: 'Favori türlerin? (En fazla 3)',           type: 'multi',  maxSelect: 3, options: ['Aksiyon', 'Macera', 'Komedi', 'Dram', 'Korku', 'Bilim Kurgu', 'Fantastik', 'Gerilim', 'Suç', 'Romantik', 'Animasyon', 'Belgesel', 'Savaş', 'Tarih', 'Müzikal', 'Gizem'] },
]

const PLATFORM_QUESTION_INDEX = questions.findIndex(q => q.id === 'platform')

export default function Quiz() {
  const router = useRouter()
  const { user } = useAuth()

  const [current, setCurrent]     = useState(0)
  const [answers, setAnswers]     = useState<Record<string, any>>({})
  const [selected, setSelected]   = useState<string[]>([])
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [savedPlatforms, setSavedPlatforms] = useState<string[]>([])

  // Kullanıcının kayıtlı platform tercihlerini çek
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('preferred_platforms')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferred_platforms?.length) {
          setSavedPlatforms(data.preferred_platforms)
        }
      })
  }, [user])

  const q = questions[current]
  const progress = ((current + 1) / questions.length) * 100
  const maxSelect = (q as any).maxSelect || 3

  const getInitialSelected = (idx: number, curAnswers: Record<string, any>): string[] => {
    const q = questions[idx]
    if (!q) return []
    const prev = curAnswers[q.id]
    if (Array.isArray(prev)) return prev
    // Platform sorusu için kayıtlı tercihleri ön-seç (ilk kez geliyorsa)
    if (q.id === 'platform' && savedPlatforms.length > 0) return savedPlatforms
    return []
  }

  const animateTransition = (nextIndex: number, dir: 'forward' | 'back', newAnswers?: Record<string, any>) => {
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setCurrent(nextIndex)
      setSelected(getInitialSelected(nextIndex, newAnswers || answers))
      setAnimating(false)
    }, 200)
  }

  // savedPlatforms yüklenince platform sorusunda zaten seçili gelsin
  useEffect(() => {
    if (current === PLATFORM_QUESTION_INDEX && savedPlatforms.length > 0 && !answers['platform']) {
      setSelected(savedPlatforms)
    }
  }, [savedPlatforms])

  const handleSingle = (opt: string) => {
    const newAnswers = { ...answers, [q.id]: opt }
    setAnswers(newAnswers)
    if (current < questions.length - 1) {
      setTimeout(() => animateTransition(current + 1, 'forward', newAnswers), 150)
    } else {
      localStorage.setItem('quiz_answers', JSON.stringify(newAnswers))
      router.push('/results')
    }
  }

  const handleMulti = (opt: string) => {
    if (opt === 'Fark etmez') {
      setSelected(selected.includes('Fark etmez') ? [] : ['Fark etmez'])
      return
    }
    const withoutFarketmez = selected.filter(s => s !== 'Fark etmez')
    if (withoutFarketmez.includes(opt)) {
      setSelected(withoutFarketmez.filter(s => s !== opt))
    } else if (withoutFarketmez.length < maxSelect) {
      setSelected([...withoutFarketmez, opt])
    }
  }

  const handleMultiNext = () => {
    const newAnswers = { ...answers, [q.id]: selected }
    setAnswers(newAnswers)
    if (current < questions.length - 1) {
      animateTransition(current + 1, 'forward', newAnswers)
    } else {
      localStorage.setItem('quiz_answers', JSON.stringify(newAnswers))
      router.push('/results')
    }
  }

  const handleBack = () => {
    if (current > 0) {
      animateTransition(current - 1, 'back', answers)
    } else {
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
      <div className="w-full h-1" style={{ background: '#ffffff10' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, background: '#f59e0b' }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto w-full">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: '#94a3b8' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {current === 0 ? 'Ana Sayfa' : 'Geri'}
        </button>
        <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
          {current + 1} / {questions.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div
          className={`w-full max-w-md transition-all duration-200 ${
            animating
              ? direction === 'forward' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{ color: '#f1f5f9' }}>
            {q.text}
          </h2>

          {q.id === 'platform' && savedPlatforms.length > 0 && (
            <p className="text-center text-xs mb-4" style={{ color: '#64748b' }}>
              ✨ Profil tercihleriniz otomatik seçildi
            </p>
          )}

          {q.type === 'single' && (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => handleSingle(opt)}
                  className="py-4 px-4 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] active:scale-95 border"
                  style={{
                    background:   answers[q.id] === opt ? '#f59e0b' : '#12121a',
                    color:        answers[q.id] === opt ? '#0a0a0f' : '#f1f5f9',
                    borderColor:  answers[q.id] === opt ? '#f59e0b' : '#ffffff20',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {q.type === 'multi' && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {q.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleMulti(opt)}
                    className="py-4 px-4 rounded-xl text-sm font-medium transition-all active:scale-95 border"
                    style={{
                      background:  selected.includes(opt) ? '#f59e0b' : '#12121a',
                      color:       selected.includes(opt) ? '#0a0a0f' : '#f1f5f9',
                      borderColor: selected.includes(opt) ? '#f59e0b' : '#ffffff20',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-center text-xs mb-4" style={{ color: '#64748b' }}>
                {selected.includes('Fark etmez') ? 'Tümü seçildi' : `${selected.length}/${maxSelect} seçildi`}
              </p>
              <button
                onClick={handleMultiNext}
                disabled={selected.length === 0}
                className="w-full py-4 rounded-full font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                style={{ background: '#f59e0b', color: '#0a0a0f' }}
              >
                Devam →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
