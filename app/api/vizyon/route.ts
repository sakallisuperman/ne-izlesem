import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
    if (!apiKey) return NextResponse.json({ now_playing: [], upcoming: [] })

    const [nowRes, upRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${apiKey}&language=tr-TR&region=TR&page=1`),
      fetch(`https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=tr-TR&region=TR&page=1`),
    ])

    const nowData = await nowRes.json()
    const upData = await upRes.json()

    const format = (item: any) => ({
      id: item.id,
      title: item.title,
      original_title: item.original_title,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
      overview: item.overview,
      release_date: item.release_date,
      vote_average: Math.round(item.vote_average * 10) / 10,
    })

    return NextResponse.json({
      now_playing: (nowData.results || []).slice(0, 10).map(format),
      upcoming: (upData.results || []).slice(0, 10).map(format),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ now_playing: [], upcoming: [] })
  }
}
