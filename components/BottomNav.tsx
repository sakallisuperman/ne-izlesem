'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const tabs = [
  { id: 'home', label: 'Ana Sayfa', path: '/', icon: 'home' },
  { id: 'search', label: 'Arama', path: '/search', icon: 'search' },
  { id: 'vizyon', label: 'Vizyon', path: '/vizyon', icon: 'film' },
  { id: 'history', label: 'Önerilerim', path: '/history', icon: 'list' },
  { id: 'assistant', label: 'Asistan', path: '/assistant', icon: 'bot' },
  { id: 'profile', label: 'Profil', path: '/profile', icon: 'user' },
]

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#f59e0b' : '#64748b'
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (name) {
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    case 'film':
      return <svg {...props}><rect x='2' y='4' width='20' height='16' rx='2'/><path d='M2 8h20M2 12h20M7 4v16M17 4v16'/></svg>
    case 'home':
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'list':
      return <svg {...props}><path d="M4 6h16M4 12h16M4 18h12"/><circle cx="20" cy="18" r="2" fill={color} stroke="none"/></svg>
    case 'bot':
      return <svg {...props}><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8" cy="16" r="1" fill={color} stroke="none"/><circle cx="16" cy="16" r="1" fill={color} stroke="none"/></svg>
    case 'user':
      return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    default:
      return null
  }
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // Quiz ve results sayfalarında gizle
  if (pathname === '/quiz' || pathname === '/results' ) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t" style={{ background: '#0a0a0f', borderColor: '#ffffff15' }}>
      <div className="max-w-lg mx-auto flex justify-around items-center py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tabs.map(tab => {
          const active = pathname === tab.path
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-1 px-3 py-1 transition-all"
            >
              <NavIcon name={tab.icon} active={active} />
              <span className="text-[10px] font-medium" style={{ color: active ? '#f59e0b' : '#64748b' }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
