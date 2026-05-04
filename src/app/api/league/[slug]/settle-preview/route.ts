import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  calculateWeeklyPot,
  getWinnersForWeek,
  getWeekCalendarBoundsForSeasonYear,
  type Winner,
  type WeeklyPotResult,
} from '@/lib/pot'
import { fetchWeeklyFinalScores, type ThirteenRunGame } from '@/lib/mlb'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

export interface SettlePreviewResponse {
  ok: true
  weekNumber: number
  year: number
  weekRange: { start: string; end: string }
  /** 13-run Final games found via the MLB Stats API this week — commissioner's cross-reference. */
  mlbGames: ThirteenRunGame[]
  /** Winners derived from game_results table (cron-populated source of truth). */
  dbWinners: Winner[]
  pot: {
    thisWeek: number
    rollover: number
    total: number
    weekly_buy_in: number
    member_count: number
  }
  alreadySettled: boolean
}

export type SettlePreviewErrorResponse = { ok: false; error: string }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie || !isAdmin(authCookie.value)) {
    return NextResponse.json<SettlePreviewErrorResponse>(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(req.url)
  const week_number = parseInt(searchParams.get('week_number') ?? '', 10)
  const year = parseInt(searchParams.get('year') ?? '', 10)

  if (!week_number || !year || week_number < 1 || week_number > 52) {
    return NextResponse.json<SettlePreviewErrorResponse>(
      { ok: false, error: 'week_number (1–52) and year are required' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json<SettlePreviewErrorResponse>(
      { ok: false, error: 'League not found' },
      { status: 404 }
    )
  }

  const leagueId = league.id
  const weekRange = getWeekCalendarBoundsForSeasonYear(year, week_number)

  // Run pot calc, winner lookup, and MLB API fetch in parallel
  const [potResult, dbWinners, mlbGames] = await Promise.all([
    calculateWeeklyPot(leagueId, week_number, year, supabase) as Promise<WeeklyPotResult>,
    getWinnersForWeek(leagueId, week_number, year, supabase),
    fetchWeeklyFinalScores(weekRange.start, weekRange.end),
  ])

  // Check if already settled
  const { data: ledger } = await supabase
    .from('weekly_pot_ledger')
    .select('id')
    .eq('league_id', leagueId)
    .eq('week_number', week_number)
    .eq('year', year)
    .maybeSingle()

  const thisWeek = potResult.weekly_buy_in * potResult.number_of_members

  return NextResponse.json<SettlePreviewResponse>({
    ok: true,
    weekNumber: week_number,
    year,
    weekRange,
    mlbGames,
    dbWinners,
    pot: {
      thisWeek,
      rollover: potResult.rollover_amount,
      total: potResult.pot_amount,
      weekly_buy_in: potResult.weekly_buy_in,
      member_count: potResult.number_of_members,
    },
    alreadySettled: !!ledger,
  })
}
