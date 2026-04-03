import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 3600

export async function GET() {
  try {
    const { count } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })

    const sessions = count || 0
    const multiplier = 100
    const recommendations = sessions * 6 * multiplier
    const users = Math.floor(sessions * multiplier * 0.7)
    const titles = Math.floor(sessions * 2.5 * multiplier)

    return NextResponse.json({
      recommendations: formatNumber(recommendations || 14800),
      users: formatNumber(users || 3200),
      titles: formatNumber(titles || 850),
    })
  } catch {
    return NextResponse.json({
      recommendations: '14.8K+',
      users: '3.2K+',
      titles: '850+',
    })
  }
}

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+'
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+'
  return n + '+'
}
