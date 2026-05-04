import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  calculateWeeklyPot,
  getWinnersForWeek,
  calculatePayouts,
  recordPayouts,
  getSeasonYear,
  type OverrideGame,
} from '@/lib/pot'
import { recalculateStreaks } from '@/lib/streaks'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

interface CalculatePayoutsRequest {
  week_number: number
  year: number
  manual?: boolean
  /**
   * When provided (from the settlement modal), skip the game_results DB query and
   * use this explicit list of winning games instead. An empty array means no winners
   * — the pot will roll over.
   */
  override_games?: OverrideGame[]
}

interface PayoutResponse {
  week_number: number
  year: number
  pot_amount: number
  winners: Array<{
    member_id: string
    member_name: string
    team: string
  }>
  payouts: Array<{
    member_name: string
    payout_amount: number
    deducted_buy_in?: number
    team: string
  }>
  total_distributed: number
  rollover_to_next_week: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie || !isAdmin(authCookie.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const body = (await req.json()) as CalculatePayoutsRequest

  try {
    // Find league by slug
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('slug', slug)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const leagueId = league.id
    const { week_number, year } = body

    // Validate inputs
    if (!week_number || !year) {
      return NextResponse.json(
        { error: 'week_number and year are required' },
        { status: 400 }
      )
    }

    if (week_number < 1 || week_number > 52) {
      return NextResponse.json(
        { error: 'week_number must be between 1 and 52' },
        { status: 400 }
      )
    }

    // Calculate pot for this week (includes rollover)
    const potResult = await calculateWeeklyPot(leagueId, week_number, year, supabase)

    // Get winners for this week — use commissioner override list if provided
    const winners = await getWinnersForWeek(
      leagueId,
      week_number,
      year,
      supabase,
      body.override_games !== undefined ? { overrideGames: body.override_games } : undefined
    )

    // Calculate payouts — nets unpaid buy-in from each winner's gross share (Option A)
    const payouts = calculatePayouts(potResult.pot_amount, winners, potResult.weekly_buy_in)

    // Record payouts in database
    await recordPayouts(
      {
        league_id: leagueId,
        week_number,
        year,
        pot_amount: potResult.pot_amount,
        payouts,
        winners,
      },
      supabase
    )

    // Recalculate streaks (drought) for all members — runs after every settlement
    await recalculateStreaks(leagueId, year, supabase)

    // Calculate total distributed
    const totalDistributed = payouts.reduce((sum, p) => sum + p.payout_amount, 0)

    // Determine rollover (if no winners, pot rolls to next week)
    const rolloverToNext = winners.length === 0 ? potResult.pot_amount : 0

    const response: PayoutResponse = {
      week_number,
      year,
      pot_amount: potResult.pot_amount,
      winners: winners.map((w) => ({
        member_id: w.member_id,
        member_name: w.member_name,
        team: w.team,
      })),
      payouts: payouts.map((p) => ({
        member_name: p.member_name,
        payout_amount: p.payout_amount,
        ...(p.deducted_buy_in > 0 && { deducted_buy_in: p.deducted_buy_in }),
        team: p.team,
      })),
      total_distributed: totalDistributed,
      rollover_to_next_week: rolloverToNext,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Payout calculation error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to calculate payouts'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
