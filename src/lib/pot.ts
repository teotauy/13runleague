import { createClient } from './supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface Winner {
  member_id: string
  member_name: string
  team: string
  game_date: string
}

interface PayoutRecord {
  member_id: string
  payout_amount: number
  shares_count: number
  member_name: string
  team: string
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Sunday 00:00 local on or before the given calendar day (for Sunday-based playing weeks). */
function sundayOnOrBefore(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  out.setDate(out.getDate() - out.getDay())
  return out
}

/**
 * Playing week number within the season year.
 *
 * On/after March 25: week 1 is the Sunday-through-Saturday span that contains Opening Week
 * (Sunday on or before March 25 → the following Saturday). Week 2 starts the next Sunday.
 * Example 2026: March 22–28 = week 1, March 29+ = week 2.
 *
 * Before March 25 in a calendar year: still the prior season year’s grid (weeks since previous
 * March 25 anchor), same as historical behavior.
 */
export function getWeekNumber(date: Date, seasonStartMonth: number = 3, seasonStartDay: number = 25): number {
  const year = date.getFullYear()
  const seasonStart = new Date(year, seasonStartMonth - 1, seasonStartDay)

  if (date < seasonStart) {
    const prevYearStart = new Date(year - 1, seasonStartMonth - 1, seasonStartDay)
    const daysDiff = Math.floor((date.getTime() - prevYearStart.getTime()) / MS_PER_DAY)
    return Math.ceil((daysDiff + 1) / 7)
  }

  const week1Sunday = sundayOnOrBefore(seasonStart)
  const daysDiff = Math.floor((date.getTime() - week1Sunday.getTime()) / MS_PER_DAY)
  return Math.floor(daysDiff / 7) + 1
}

/**
 * Season year for league data (payouts, tabs, pot). Uses the same March 25 anchor as
 * {@link getWeekNumber} — not April 1 — so late-March games count in the new season.
 */
export function getSeasonYear(date: Date, seasonStartMonth: number = 3, seasonStartDay: number = 25): number {
  const year = date.getFullYear()
  const seasonStart = new Date(year, seasonStartMonth - 1, seasonStartDay)
  if (date < seasonStart) {
    return year - 1
  }
  return year
}

/**
 * Inclusive YYYY-MM-DD bounds for a playing week (same Sunday-based grid as {@link getWeekNumber}).
 */
export function getWeekCalendarBoundsForSeasonYear(
  seasonYear: number,
  weekNumber: number,
  seasonStartMonth: number = 3,
  seasonStartDay: number = 25
): { start: string; end: string } {
  const anchor = new Date(seasonYear, seasonStartMonth - 1, seasonStartDay)
  const week1Sunday = sundayOnOrBefore(anchor)
  const start = new Date(week1Sunday)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(start), end: fmt(end) }
}

interface WeeklyPotResult {
  pot_amount: number
  rollover_from: number | null
  number_of_members: number
}

/**
 * Calculate the weekly pot amount including rollover from previous weeks
 */
export async function calculateWeeklyPot(
  league_id: string,
  week_number: number,
  year: number,
  supabase: SupabaseClient
): Promise<WeeklyPotResult> {
  // Get league settings
  const { data: league } = await supabase
    .from('leagues')
    .select('id, weekly_buy_in, pot_total')
    .eq('id', league_id)
    .single()

  if (!league) {
    throw new Error('League not found')
  }

  // Active roster only (matches dashboard PotBreakdown)
  const { data: members } = await supabase
    .from('members')
    .select('id')
    .eq('league_id', league_id)
    .or('is_active.is.null,is_active.eq.true')

  const memberCount = members?.length || 0
  const basePot = (league.weekly_buy_in || 10) * memberCount

  // Check for rollover from previous week
  let rolloverFromWeek: number | null = null
  let rolloverAmount = 0

  if (week_number > 1) {
    const { data: prevWeekLedger } = await supabase
      .from('weekly_pot_ledger')
      .select('id, number_of_winners, pot_amount')
      .eq('league_id', league_id)
      .eq('year', year)
      .eq('week_number', week_number - 1)
      .maybeSingle()

    // If previous week had no winners, we have a rollover
    if (prevWeekLedger && prevWeekLedger.number_of_winners === 0) {
      rolloverFromWeek = week_number - 1
      rolloverAmount = prevWeekLedger.pot_amount || 0
    }
  }

  return {
    pot_amount: basePot + rolloverAmount,
    rollover_from: rolloverFromWeek,
    number_of_members: memberCount,
  }
}

/**
 * Rollover stored on `leagues.pot_total` after a no-winner settlement. If that was never written
 * (older bug), derive the same amount from the prior week's ledger for the dashboard.
 */
export async function getEffectiveRolloverPotForDashboard(
  leagueId: string,
  storedPotTotal: number | null,
  seasonYear: number,
  currentWeekNumber: number,
  supabase: SupabaseClient
): Promise<number> {
  const stored = storedPotTotal ?? 0
  if (stored > 0 || currentWeekNumber <= 1) return stored

  const { data: prev } = await supabase
    .from('weekly_pot_ledger')
    .select('pot_amount, number_of_winners')
    .eq('league_id', leagueId)
    .eq('year', seasonYear)
    .eq('week_number', currentWeekNumber - 1)
    .maybeSingle()

  if (prev && prev.number_of_winners === 0 && (prev.pot_amount ?? 0) > 0) {
    return prev.pot_amount
  }
  return 0
}

/**
 * Find all winners for a given week (teams that scored 13)
 * Returns array of member owners of those teams
 */
export async function getWinnersForWeek(
  league_id: string,
  week_number: number,
  year: number,
  supabase: SupabaseClient
): Promise<Winner[]> {
  const { start, end } = getWeekCalendarBoundsForSeasonYear(year, week_number)

  // Find all games with 13-run results this week
  const { data: gameResults } = await supabase
    .from('game_results')
    .select('winning_team, game_date')
    .eq('was_thirteen', true)
    .gte('game_date', start)
    .lte('game_date', end)

  if (!gameResults || gameResults.length === 0) {
    return []
  }

  // Find members who own these winning teams
  const winningTeams = gameResults.map((g) => g.winning_team)
  const { data: winners } = await supabase
    .from('members')
    .select('id, name, assigned_team')
    .eq('league_id', league_id)
    .in('assigned_team', winningTeams)

  if (!winners) {
    return []
  }

  // Map game results to member winners
  const winnerMap: { [key: string]: Winner } = {}

  winners.forEach((member) => {
    gameResults.forEach((game) => {
      if (member.assigned_team === game.winning_team) {
        // Use member_id as key to avoid duplicates if they have multiple 13-run games
        if (!winnerMap[member.id]) {
          winnerMap[member.id] = {
            member_id: member.id,
            member_name: member.name,
            team: member.assigned_team,
            game_date: game.game_date,
          }
        }
      }
    })
  })

  return Object.values(winnerMap)
}

/**
 * Calculate payout amounts based on pot and winners
 * Splits pot equally among all winners
 */
export function calculatePayouts(pot_amount: number, winners: Winner[]): PayoutRecord[] {
  if (winners.length === 0) {
    return []
  }

  const payoutPerShare = Math.floor(pot_amount / winners.length)

  return winners.map((winner) => ({
    member_id: winner.member_id,
    payout_amount: payoutPerShare,
    shares_count: winners.length,
    member_name: winner.member_name,
    team: winner.team,
  }))
}

interface RecordPayoutsParams {
  league_id: string
  week_number: number
  year: number
  pot_amount: number
  payouts: PayoutRecord[]
  winners: Winner[]
}

/**
 * Record payouts in database and update related records
 * - Insert into payouts table
 * - Update weekly_pot_ledger
 * - Update historical_results with earnings
 * - Update leagues.pot_total for rollover tracking
 */
export async function recordPayouts(
  {
    league_id,
    week_number,
    year,
    pot_amount,
    payouts,
    winners,
  }: RecordPayoutsParams,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Insert payout records
  const payoutRecords = payouts.map((payout) => ({
    league_id,
    member_id: payout.member_id,
    week_number,
    year,
    winning_team: payout.team,
    payout_amount: payout.payout_amount,
    shares_count: payout.shares_count,
    game_date: winners.find((w) => w.member_id === payout.member_id)?.game_date || new Date().toISOString().split('T')[0],
  }))

  if (payoutRecords.length > 0) {
    const { error: payoutError } = await supabase.from('payouts').insert(payoutRecords)

    if (payoutError) {
      throw new Error(`Failed to insert payouts: ${payoutError.message}`)
    }
  }

  // 2. Update weekly_pot_ledger
  const { error: ledgerError } = await supabase
    .from('weekly_pot_ledger')
    .upsert({
      league_id,
      week_number,
      year,
      pot_amount,
      number_of_winners: winners.length,
      payout_per_share:
        winners.length > 0 ? Math.floor(pot_amount / winners.length) : 0,
      calculated_at: new Date().toISOString(),
    })

  if (ledgerError) {
    throw new Error(`Failed to update pot ledger: ${ledgerError.message}`)
  }

  // 3. Update historical_results for each winner
  for (const payout of payouts) {
    // Get current historical record
    const { data: existing } = await supabase
      .from('historical_results')
      .select('*')
      .eq('league_id', league_id)
      .eq('year', year)
      .eq('member_name', payout.member_name)
      .single()

    const newTotalWon = (existing?.total_won || 0) + payout.payout_amount
    const newShares = (existing?.shares || 0) + 1
    const weekWins = existing?.week_wins || []
    if (!weekWins.includes(week_number)) {
      weekWins.push(week_number)
    }

    const { error: histError } = await supabase
      .from('historical_results')
      .upsert({
        league_id,
        year,
        member_name: payout.member_name,
        team: payout.team,
        total_won: newTotalWon,
        shares: newShares,
        week_wins: weekWins,
      })

    if (histError) {
      throw new Error(`Failed to update historical results: ${histError.message}`)
    }
  }

  // 4. leagues.pot_total — dashboard shows pot_total + this week's buy-ins
  if (winners.length > 0) {
    const { error: leagueError } = await supabase
      .from('leagues')
      .update({ pot_total: 0 })
      .eq('id', league_id)

    if (leagueError) {
      throw new Error(`Failed to update league pot_total: ${leagueError.message}`)
    }
  } else {
    const { error: leagueError } = await supabase
      .from('leagues')
      .update({ pot_total: pot_amount })
      .eq('id', league_id)

    if (leagueError) {
      throw new Error(`Failed to update league pot_total: ${leagueError.message}`)
    }
  }
}
