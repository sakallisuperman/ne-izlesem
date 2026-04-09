export interface AppNotification {
  id: string
  message: string
  read: boolean
  createdAt: string
}

const KEY = 'ne_izlesem_notifications'
const VIZYON_KEY = 'ne_izlesem_vizyon_notified'
const BADGE_KEY = 'ne_izlesem_last_badge'

export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function addNotification(message: string): void {
  if (typeof window === 'undefined') return
  const existing = getNotifications()
  // Aynı mesajı 24 saat içinde tekrar ekleme
  const alreadyRecent = existing.find(
    n => n.message === message && Date.now() - new Date(n.createdAt).getTime() < 86400000
  )
  if (alreadyRecent) return
  const notif: AppNotification = {
    id: Date.now().toString(),
    message,
    read: false,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify([notif, ...existing].slice(0, 20)))
}

export function markAllRead(): void {
  if (typeof window === 'undefined') return
  const existing = getNotifications()
  localStorage.setItem(KEY, JSON.stringify(existing.map(n => ({ ...n, read: true }))))
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length
}

/** Vizyon bildirimi: 7 günde bir tetiklenir */
export function checkVizyonNotification(): void {
  if (typeof window === 'undefined') return
  const last = localStorage.getItem(VIZYON_KEY)
  const now = Date.now()
  if (!last || now - parseInt(last) > 7 * 24 * 60 * 60 * 1000) {
    addNotification('Vizyonda yeni filmler var! 🎬 Haftanın gösterimlerine bak.')
    localStorage.setItem(VIZYON_KEY, now.toString())
  }
}

/** Rozet bildirimi: yeni rozet kazanıldığında */
export function checkBadgeNotification(currentBadge: string): void {
  if (typeof window === 'undefined') return
  const lastBadge = localStorage.getItem(BADGE_KEY)
  if (lastBadge && lastBadge !== currentBadge) {
    addNotification(`Yeni rozet kazandın! ${badgeEmoji(currentBadge)} ${currentBadge} oldun 🎉`)
  }
  localStorage.setItem(BADGE_KEY, currentBadge)
}

function badgeEmoji(badge: string): string {
  const map: Record<string, string> = {
    'Yeni Üye': '🌱', 'Film Sever': '🎬', 'Sinefil': '🎭',
    'Film Gurmesi': '🏆', 'Efsane Eleştirmen': '⭐',
  }
  return map[badge] || ''
}
