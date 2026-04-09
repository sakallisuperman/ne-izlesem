import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const revalidate = 1800

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.rpc('get_popular_movies')
    if (error || !data?.length) return NextResponse.json({ movies: [] })

    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    const movies = await Promise.all(
      data.map(async (m: { title: string; turkish_title: string; type: string; watch_count: number }) => {
        try {
          const mediaType = m.type === 'film' ? 'movie' : 'tv'
          const res = await fetch(
            `https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(m.title)}&language=tr-TR`
          )
          const json = await res.json()
          const item = json.results?.[0]
          return {
            title: m.title,
            turkish_title: m.turkish_title,
            type: m.type,
            watch_count: m.watch_count,
            poster: item?.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null,
          }
        } catch {
          return { title: m.title, turkish_title: m.turkish_title, type: m.type, watch_count: m.watch_count, poster: null }
        }
      })
    )

    return NextResponse.json({ movies })
  } catch {
    return NextResponse.json({ movies: [] })
  }
}
