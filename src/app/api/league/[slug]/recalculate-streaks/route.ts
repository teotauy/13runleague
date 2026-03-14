import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSeasonYear } from '@/lib/pot'
import { recalculateStreaks } from '@/lib/streaks'

/**
 * POST /api/league/[slug]/recalculate-streaks
 *
 * Commissioner-only endpoint to recompute drought streaks and closest misses
 * for every member in the league.  Call this after importing historical payouts
 * or whenever the streaks table looks stale.
 *
 * Body (all optional):
 *   { year?: number }  — defaults to the current season year
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const body = await req.json().catch(() => ({})) as { year?: number }
    const year = body.year ?? getSeasonYear(new Date())

    // Resolve league id
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('slug', slug)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    await recalculateStreaks(league.id, year, supabase)

    return NextResponse.json({ ok: true, year, message: `Streaks recalculated for ${year} season` })
  } catch (err) {
    console.error('Streak recalculation error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to recalculate streaks'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
