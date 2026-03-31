import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center" style={{background: '#0a0a0f'}}>
      <div className="text-center px-6">
        <div className="text-6xl mb-6">🎬</div>
        <h1 className="text-5xl font-bold mb-4" style={{color: '#f59e0b'}}>
          Ne İzlesem?
        </h1>
        <p className="text-xl mb-12" style={{color: '#94a3b8'}}>
          Ruh haline göre sana özel film ve dizi önerileri
        </p>
        <Link href="/quiz">
          <button className="px-10 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105" style={{background: '#f59e0b', color: '#0a0a0f'}}>
            Başla →
          </button>
        </Link>
      </div>
    </main>
  )
}
