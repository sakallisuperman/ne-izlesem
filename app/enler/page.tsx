'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PersonPopup from '@/components/PersonPopup'

interface FilmItem {
  title: string
  turkish_title?: string
  type: string
  count: number
  poster: string | null
}

interface RatedItem extends FilmItem {
  avg: number
}

interface ActorItem {
  actor_id: number
  actor_name: string
  profile_path: string | null
  count: number
}

interface EnlerData {
  topWatched: FilmItem[]
  topReviewed: FilmItem[]
  topRated: RatedItem[]
  topActors: ActorItem[]
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  )
}

function FilmCard({ item, badge }: { item: FilmItem | RatedItem; badge: string }) {
  return (
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden border"
      style={{ width: '100px', background: '#12121a', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {item.poster ? (
        <div className="relative" style={{ height: '140px' }}>
          <img src={item.poster} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: '#000000bb', color: '#f59e0b' }}>
            {badge}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ height: '140px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
          <span style={{ fontSize: '28px' }}>🎬</span>
        </div>
      )}
      <div className="px-2 py-2">
        <p className="text-[10px] font-medium leading-tight" style={{ color: '#cbd5e1', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
          {item.turkish_title && item.turkish_title !== item.title ? item.turkish_title : item.title}
        </p>
        <p className="text-[9px] mt-1" style={{ color: '#475569' }}>
          {item.type === 'film' ? 'Film' : 'Dizi'}
        </p>
      </div>
    </div>
  )
}

function SectionHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-0.5">
        <span style={{ fontSize: '18px' }}>{emoji}</span>
        <h2 className="text-base font-bold" style={{ color: '#f1f5f9' }}>{title}</h2>
      </div>
      <p className="text-[11px]" style={{ color: '#475569' }}>{subtitle}</p>
    </div>
  )
}

export default function EnlerPage() {
  const router = useRouter()
  const [data, setData] = useState<EnlerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedActor, setSelectedActor] = useState<ActorItem | null>(null)

  useEffect(() => {
    fetch('/api/enler')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen pt-8 px-6 pb-24" style={{ background: '#0a0a0f' }}>

      {selectedActor && (
        <PersonPopup
          personId={selectedActor.actor_id}
          personName={selectedActor.actor_name}
          personProfile={selectedActor.profile_path ? `https://image.tmdb.org/t/p/w185${selectedActor.profile_path}` : null}
          onClose={() => setSelectedActor(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Başlık */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: '#94a3b8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f59e0b' }}>Enler 🏆</h1>
            <p className="text-xs" style={{ color: '#64748b' }}>Topluluğun en çok sevdikleri</p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-20">
            <div className="flex gap-2 mb-4">
              {[0,1,2].map(i => <div key={i} className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i*150}ms` }} />)}
            </div>
            <p className="text-sm" style={{ color: '#64748b' }}>Veriler toplanıyor...</p>
          </div>
        )}

        {!loading && data && (
          <div className="flex flex-col gap-8">

            {/* En Çok Tavsiye Edilen */}
            <section>
              <SectionHeader emoji="📋" title="En Çok Tavsiye Edilen" subtitle="İzleme listelerine en çok eklenen filmler" />
              {data.topWatched.length === 0 ? (
                <p className="text-sm" style={{ color: '#475569' }}>Henüz yeterli veri yok.</p>
              ) : (
                <HorizontalScroll>
                  {data.topWatched.map((item, i) => (
                    <FilmCard key={item.title} item={item} badge={`${item.count}x`} />
                  ))}
                </HorizontalScroll>
              )}
            </section>

            {/* En Çok Yorum Alan */}
            <section>
              <SectionHeader emoji="💬" title="En Çok Yorum Alan" subtitle="Kullanıcıların en çok yorum yaptığı yapımlar" />
              {data.topReviewed.length === 0 ? (
                <p className="text-sm" style={{ color: '#475569' }}>Henüz yeterli veri yok.</p>
              ) : (
                <HorizontalScroll>
                  {data.topReviewed.map((item, i) => (
                    <FilmCard key={item.title} item={item} badge={`${item.count} yorum`} />
                  ))}
                </HorizontalScroll>
              )}
            </section>

            {/* En Yüksek Puanlı */}
            <section>
              <SectionHeader emoji="⭐" title="En Yüksek Puanlı" subtitle="En az 2 yorum alan, en yüksek puanlı yapımlar" />
              {data.topRated.length === 0 ? (
                <p className="text-sm" style={{ color: '#475569' }}>Henüz yeterli değerlendirme yok (min. 2 yorum).</p>
              ) : (
                <HorizontalScroll>
                  {data.topRated.map((item, i) => (
                    <FilmCard key={item.title} item={item} badge={`★${(item as RatedItem).avg}`} />
                  ))}
                </HorizontalScroll>
              )}
            </section>

            {/* En Sevilen Oyuncular */}
            <section>
              <SectionHeader emoji="❤️" title="En Sevilen Oyuncular" subtitle="Kullanıcıların en çok favorilediği oyuncular" />
              {data.topActors.length === 0 ? (
                <p className="text-sm" style={{ color: '#475569' }}>Henüz yeterli veri yok.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {data.topActors.map(actor => (
                    <button
                      key={actor.actor_id}
                      onClick={() => setSelectedActor(actor)}
                      className="flex-shrink-0 text-center rounded-xl p-3 border transition-all hover:scale-[1.02] active:scale-95"
                      style={{ width: '90px', background: '#12121a', borderColor: '#7F77DD33' }}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-2 border-2" style={{ borderColor: '#7F77DD' }}>
                        {actor.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} alt={actor.actor_name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: '#1e293b' }}>👤</div>
                        )}
                      </div>
                      <p className="text-[10px] font-semibold leading-tight" style={{ color: '#f1f5f9' }}>{actor.actor_name}</p>
                      <p className="text-[9px] mt-1" style={{ color: '#7F77DD' }}>❤️ {actor.count}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {!loading && !data && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">😔</div>
            <p style={{ color: '#94a3b8' }}>Veriler yüklenemedi.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 rounded-full text-sm font-semibold" style={{ background: '#f59e0b', color: '#0a0a0f' }}>
              Tekrar Dene
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
