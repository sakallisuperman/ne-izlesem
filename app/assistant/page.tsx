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

function SineAvatar({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 48 : 28
  return (
    <svg width={px} height={px} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#1a1a2e"/>
      <circle cx="24" cy="24" r="22" fill="#12121a" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="24" cy="16" r="6" fill="#f59e0b" opacity="0.9"/>
      <rect x="14" y="26" width="20" height="3" rx="1.5" fill="#f59e0b" opacity="0.7"/>
      <rect x="16" y="31" width="16" height="2" rx="1" fill="#f59e0b" opacity="0.5"/>
      <rect x="18" y="35" width="12" height="2" rx="1" fill="#f59e0b" opacity="0.3"/>
      <circle cx="21" cy="15" r="1" fill="#12121a"/>
      <circle cx="27" cy="15" r="1" fill="#12121a"/>
      <path d="M22 18.5 Q24 20 26 18.5" stroke="#12121a" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const userMessage: Message = { role: 'user', content: messageText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) throw new Error('API hatası')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6))
                fullText += data.text
                await new Promise(r => setTimeout(r, 30))
                setStreamingText(fullText)
              } catch {}
            }
          }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: fullText }])
      setStreamingText('')
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
          <SineAvatar size="sm" />
          <div>
            <h1 className="font-bold text-sm" style={{ color: '#f1f5f9' }}>Sine</h1>
            <p className="text-xs" style={{ color: loading ? '#f59e0b' : '#64748b' }}>
              {loading ? 'yazıyor...' : 'Film & Dizi Asistanı'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 && !streamingText && (
            <div className="flex flex-col items-center justify-center py-12">
              <SineAvatar size="lg" />
              <h2 className="text-lg font-bold mb-2 mt-4" style={{ color: '#f1f5f9' }}>Merhaba! Ben Sine 👋</h2>
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
                <div className="mr-2 mt-1 shrink-0">
                  <SineAvatar size="sm" />
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

          {/* Streaming message */}
          {streamingText && (
            <div className="flex mb-4 justify-start">
              <div className="mr-2 mt-1 shrink-0">
                <SineAvatar size="sm" />
              </div>
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={{ background: '#12121a', color: '#f1f5f9', borderBottomLeftRadius: '4px' }}
              >
                {streamingText.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < streamingText.split('\n').length - 1 && <br />}
                  </span>
                ))}
                <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: '#f59e0b' }} />
              </div>
            </div>
          )}

          {/* Loading dots (before streaming starts) */}
          {loading && !streamingText && (
            <div className="flex mb-4 justify-start">
              <div className="mr-2 mt-1 shrink-0">
                <SineAvatar size="sm" />
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
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Film veya dizi hakkında sor..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none border disabled:opacity-50"
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
