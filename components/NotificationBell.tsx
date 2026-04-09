'use client'
import { useEffect, useRef, useState } from 'react'
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  AppNotification,
} from '@/lib/notifications'

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  return `${Math.floor(hours / 24)} gün önce`
}

export default function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread]       = useState(0)
  const [mounted, setMounted]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Sadece client'ta çalıştır (localStorage)
  useEffect(() => {
    setMounted(true)
    refresh()
  }, [])

  // Dropdown açıldığında yenile
  useEffect(() => {
    if (open) refresh()
  }, [open])

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const refresh = () => {
    setNotifications(getNotifications())
    setUnread(getUnreadCount())
  }

  const handleOpen = () => {
    setOpen(o => !o)
    if (!open) {
      // 300ms sonra okundu işaretle (dropdown animasyonu bitince)
      setTimeout(() => {
        markAllRead()
        setUnread(0)
        setNotifications(getNotifications().map(n => ({ ...n, read: true })))
      }, 300)
    }
  }

  if (!mounted) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{ background: open ? '#f59e0b22' : '#ffffff0a', color: open ? '#f59e0b' : '#94a3b8' }}
        aria-label="Bildirimler"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full border border-[#0a0a0f]"
            style={{ background: '#ef4444' }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 rounded-2xl border overflow-hidden shadow-2xl"
          style={{
            background: '#12121a',
            borderColor: '#ffffff15',
            width: '280px',
            zIndex: 60,
            top: '100%',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#ffffff0a' }}>
            <p className="text-xs font-semibold" style={{ color: '#f1f5f9' }}>Bildirimler</p>
            {notifications.length > 0 && (
              <button
                onClick={() => { markAllRead(); refresh() }}
                className="text-[10px]"
                style={{ color: '#64748b' }}
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-xs" style={{ color: '#475569' }}>Henüz bildirim yok</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b flex gap-3 items-start"
                  style={{
                    borderColor: '#ffffff08',
                    background: n.read ? 'transparent' : '#f59e0b08',
                  }}
                >
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#f59e0b' }} />
                  )}
                  {n.read && <div className="w-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed" style={{ color: n.read ? '#94a3b8' : '#f1f5f9' }}>
                      {n.message}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                      {relTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
