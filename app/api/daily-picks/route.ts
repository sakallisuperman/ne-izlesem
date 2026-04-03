import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 3600

export async function GET() {
  try {
    const today = new Date().getDay()
    const { data } = await supabase
      .from('daily_picks')
      .select('*')
      .eq('day_of_week', today)

    if (!data || data.length === 0) {
      return NextResponse.json({ film: null, dizi: null })
    }

    const film = data.find(d => d.type === 'film') || null
    const dizi = data.find(d => d.type === 'dizi') || null

    const filmPoster = film ? await fetchPoster(film.title, 'movie') : null
    const diziPoster = dizi ? await fetchPoster(dizi.title, 'tv') : null

    return NextResponse.json({
      film: film ? { ...film, poster: filmPoster } : null,
      dizi: dizi ? { ...dizi, poster: diziPoster } : null,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ film: null, dizi: null })
  }
}

async function fetchPoster(title: string, type: 'movie' | 'tv') {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
  if (!apiKey) return null
  const res = await fetch(
    `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=tr-TR`
  )
  const data = await res.json()
  const item = data.results?.[0]
  return item?.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null
}
