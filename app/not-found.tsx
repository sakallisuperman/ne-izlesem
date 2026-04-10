import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 pb-20 page-enter" style={{ background: '#0a0a0f' }}>
      <div className="text-6xl mb-4">🎬</div>
      <h1 className="text-6xl font-bold mb-2" style={{ color: '#f59e0b' }}>404</h1>
      <p className="text-xl font-semibold mb-2" style={{ color: '#f1f5f9' }}>Sayfa Bulunamadı</p>
      <p className="text-sm text-center mb-8 max-w-xs" style={{ color: '#64748b' }}>
        Aradığın sayfa yok ya da taşınmış olabilir.
      </p>
      <Link
        href="/"
        className="px-8 py-3 rounded-full font-semibold transition-all hover:scale-105 active:scale-95"
        style={{ background: '#f59e0b', color: '#0a0a0f' }}
      >
        Ana Sayfaya Dön
      </Link>
    </main>
  )
}
