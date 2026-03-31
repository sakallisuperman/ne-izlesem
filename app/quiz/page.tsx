'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const questions = [
  { id: 'mood', text: 'Şu an nasıl hissediyorsun?', type: 'single', options: ['Mutlu', 'Melankolik', 'Stresli', 'Heyecanlı', 'Yorgun', 'Meraklı'] },
  { id: 'time', text: 'Bu akşam ne kadar vaktın var?', type: 'single', options: ['1 saatten az', '1-2 saat', '2+ saat', 'Fark etmez'] },
  { id: 'style', text: 'Nasıl izlemek istiyorsun?', type: 'single', options: ['Derin odaklanarak', 'Yarı uykuda rahatça', 'Heyecanla kenarında oturarak', 'Ağlayarak', 'Gülerek'] },
  { id: 'ending', text: 'Son izlemek istediğin şey ne olsun?', type: 'single', options: ['Mutlu son', 'Açık uçlu final', 'Beni şaşırtsın', 'Hüzünlü ama güzel'] },
  { id: 'language', text: 'Hangi dili tercih edersin?', type: 'single', options: ['Türkçe', 'İngilizce', 'Fark etmez', 'Alt yazı olsun yeter'] },
  { id: 'company', text: 'Kaç kişiyle izliyorsun?', type: 'single', options: ['Yalnız', 'Sevgilimle', 'Arkadaşlarla', 'Aileyle'] },
  { id: 'genres', text: 'Favori türün nedir? (En fazla 3)', type: 'multi', options: ['Gerilim', 'Komedi', 'Drama', 'Sci-Fi', 'Suç/Polisiye', 'Romantik', 'Belgesel', 'Animasyon', 'Korku', 'Tarihî'] },
  { id: 'lastWatched', text: 'Son izlediğin ve sevdiğin bir şey var mı?', type: 'text', options: [] },
]

export default function Quiz() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [textVal, setTextVal] = useState('')

  const q = questions[current]
  const progress = ((current) / questions.length) * 100

  const handleSingle = (opt: string) => {
    const newAnswers = { ...answers, [q.id]: opt }
    setAnswers(newAnswers)
    setTimeout(() => next(newAnswers), 300)
  }

  const handleMulti = (opt: string) => {
    if (selected.includes(opt)) {
      setSelected(selected.filter(s => s !== opt))
    } else if (selected.length < 3) {
      setSelected([...selected, opt])
    }
  }

  const next = (ans = answers) => {
    if (current < questions.length - 1) {
      setCurrent(current + 1)
      setSelected([])
      setTextVal('')
    } else {
      localStorage.setItem('quiz_answers', JSON.stringify(ans))
      router.push('/results')
    }
  }

  const handleMultiNext = () => {
    const newAnswers = { ...answers, [q.id]: selected }
    setAnswers(newAnswers)
    next(newAnswers)
  }

  const handleTextNext = () => {
    const newAnswers = { ...answers, [q.id]: textVal }
    setAnswers(newAnswers)
    next(newAnswers)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{background: '#0a0a0f'}}>
      <div className="h-1 transition-all duration-500" style={{width: `${progress}%`, background: '#f59e0b'}} />
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <p className="text-sm mb-8" style={{color: '#94a3b8'}}>{current + 1} / {questions.length}</p>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{color: '#f1f5f9'}}>
          {q.text}
        </h2>
        {q.type === 'single' && (
          <div className="grid grid-cols-2 gap-3 w-full max-w-md">
            {q.options.map(opt => (
              <button key={opt} onClick={() => handleSingle(opt)}
                className="py-4 px-4 rounded-xl text-sm font-medium transition-all hover:scale-105 border"
                style={{background: '#12121a', color: '#f1f5f9', borderColor: '#ffffff20'}}>
                {opt}
              </button>
            ))}
          </div>
        )}
        {q.type === 'multi' && (
          <div className="w-full max-w-md">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {q.options.map(opt => (
                <button key={opt} onClick={() => handleMulti(opt)}
                  className="py-4 px-4 rounded-xl text-sm font-medium transition-all border"
                  style={{
                    background: selected.includes(opt) ? '#f59e0b' : '#12121a',
                    color: selected.includes(opt) ? '#0a0a0f' : '#f1f5f9',
                    borderColor: selected.includes(opt) ? '#f59e0b' : '#ffffff20'
                  }}>
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={handleMultiNext} disabled={selected.length === 0}
              className="w-full py-4 rounded-full font-semibold transition-all hover:scale-105 disabled:opacity-40"
              style={{background: '#f59e0b', color: '#0a0a0f'}}>
              Devam →
            </button>
          </div>
        )}
        {q.type === 'text' && (
          <div className="w-full max-w-md">
            <input value={textVal} onChange={e => setTextVal(e.target.value)}
              placeholder="Örn: Breaking Bad, Inception..."
              className="w-full py-4 px-5 rounded-xl mb-4 text-sm border outline-none"
              style={{background: '#12121a', color: '#f1f5f9', borderColor: '#ffffff20'}} />
            <button onClick={handleTextNext}
              className="w-full py-4 rounded-full font-semibold transition-all hover:scale-105"
              style={{background: '#f59e0b', color: '#0a0a0f'}}>
              {textVal ? 'Devam →' : 'Atla →'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
