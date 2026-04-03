'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const suggestions = [
  'Bu akşam ne izlesem? 🎬',
  'Netflix\'te iyi bir dizi öner',
  'Inception gibi filmler öner',
  'Türk dizisi önerir misin?',
]

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: 'assistant', content: data.message }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Bir sorun oluştu, tekrar dener misin? 😔' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#ffffff15' }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: '#f59e0b22', color: '#f59e0b' }}>
            🤖
          </div>
          <div>
            <h1 className="font-bold" style={{ color: '#f1f5f9' }}>Sine</h1>
            <p className="text-xs" style={{ color: '#64748b' }}>Film & Dizi Asistanı</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-5xl mb-4">🎬</div>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#f1f5f9' }}>Merhaba! Ben Sine</h2>
              <p className="text-center text-sm mb-8 max-w-sm" style={{ color: '#94a3b8' }}>
                Film ve dizi konusunda sana yardımcı olabilirim. Ne izlemek istediğini anlat, sana öneriler sunayım!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="px-4 py-2 rounded-full text-xs font-medium transition-all hover:scale-105 border"
                    style={{ background: '#12121a', color: '#f1f5f9', borderColor: '#ffffff20' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2 mt-1 shrink-0"
                  style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                  🤖
                </div>
              )}
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.role === 'user' ? '#f59e0b' : '#12121a',
                  color: msg.role === 'user' ? '#0a0a0f' : '#f1f5f9',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                }}
              >
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex mb-4 justify-start">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2 mt-1 shrink-0"
                style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                🤖
              </div>
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: '#12121a', borderBottomLeftRadius: '4px' }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 border-t" style={{ background: '#0a0a0f', borderColor: '#ffffff15' }}>
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Film veya dizi hakkında sor..."
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none border"
            style={{ background: '#12121a', color: '#f1f5f9', borderColor: '#ffffff20' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-30"
            style={{ background: '#f59e0b', color: '#0a0a0f' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </main>
  )
}
