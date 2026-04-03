'use client'

export default function Assistant() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 pb-20" style={{ background: '#0a0a0f' }}>
      <div className="text-5xl mb-6">🤖</div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#f1f5f9' }}>Film Asistanı</h1>
      <p className="text-center max-w-sm" style={{ color: '#94a3b8' }}>
        Yapay zeka asistanımızla sohbet ederek film ve dizi önerisi al. Yakında burada!
      </p>
      <div className="mt-6 px-4 py-2 rounded-full text-sm" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
        Çok Yakında 🚀
      </div>
    </main>
  )
}
