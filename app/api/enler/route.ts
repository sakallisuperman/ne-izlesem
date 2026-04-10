import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 1800 // 30 dakika cache

interface WatchlistRow { title: string; turkish_title: string; type: string }
interface ReviewRow    { movie_title: string; movie_type: string; rating: number }
interface ActorRow     { actor_id: number; actor_name: string; profile_path: string | null }

async function getTMDBPoster(title: string, type: string, apiKey: string): Promise<string | null> {
  try {
    const mediaType = type === 'film' ? 'movie' : 'tv'
    const res = await fetch(`https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=tr-TR`)
    const data = await res.json()
    const item = data.results?.[0]
    return item?.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY!

    const [wlRes, revRes, actRes] = await Promise.all([
      sb.from('watchlist').select('title, turkish_title, type').limit(2000),
      sb.from('reviews').select('movie_title, movie_type, rating').limit(2000),
      sb.from('favorite_actors').select('actor_id, actor_name, profile_path').limit(2000),
    ])

    // ── En Çok Tavsiye Edilen ──
    const watchMap: Record<string, { title: string; turkish_title: string; type: string; count: number }> = {}
    for (const row of ((wlRes.data || []) as WatchlistRow[])) {
      const key = row.title
      if (!watchMap[key]) watchMap[key] = { title: row.title, turkish_title: row.turkish_title || row.title, type: row.type, count: 0 }
      watchMap[key].count++
    }
    const topWatchlistRaw = Object.values(watchMap).sort((a, b) => b.count - a.count).slice(0, 5)
    const topWatched = await Promise.all(topWatchlistRaw.map(async item => ({
      ...item,
      poster: await getTMDBPoster(item.title, item.type, apiKey),
    })))

    // ── En Çok Yorum Alan & En Yüksek Puanlı ──
    const revMap: Record<string, { title: string; type: string; count: number; total: number }> = {}
    for (const row of ((revRes.data || []) as ReviewRow[])) {
      const key = row.movie_title
      if (!revMap[key]) revMap[key] = { title: row.movie_title, type: row.movie_type || 'film', count: 0, total: 0 }
      revMap[key].count++
      revMap[key].total += row.rating
    }

    const topReviewedRaw = Object.values(revMap).sort((a, b) => b.count - a.count).slice(0, 5)
    const topReviewed = await Promise.all(topReviewedRaw.map(async item => ({
      ...item,
      poster: await getTMDBPoster(item.title, item.type, apiKey),
    })))

    const topRatedRaw = Object.values(revMap)
      .filter(r => r.count >= 2)
      .map(r => ({ ...r, avg: Math.round((r.total / r.count) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
    const topRated = await Promise.all(topRatedRaw.map(async item => ({
      ...item,
      poster: await getTMDBPoster(item.title, item.type, apiKey),
    })))

    // ── En Sevilen Oyuncular ──
    const actMap: Record<number, { actor_id: number; actor_name: string; profile_path: string | null; count: number }> = {}
    for (const row of ((actRes.data || []) as ActorRow[])) {
      const key = row.actor_id
      if (!actMap[key]) actMap[key] = { actor_id: row.actor_id, actor_name: row.actor_name, profile_path: row.profile_path, count: 0 }
      actMap[key].count++
    }
    const topActors = Object.values(actMap).sort((a, b) => b.count - a.count).slice(0, 5)

    return NextResponse.json({ topWatched, topReviewed, topRated, topActors })
  } catch {
    return NextResponse.json({ topWatched: [], topReviewed: [], topRated: [], topActors: [] })
  }
}
