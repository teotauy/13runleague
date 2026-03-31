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

/**
 * Get the Monday of the week containing a given date.
 * Weeks run Monday–Sunday to align with baseball weekly payouts.
 */
function getWeekMonday(date: Date): Date {
  const dow = date.getDay() // 0=Sun, 1=Mon … 6=Sat
  const daysSinceMon = dow === 0 ? 6 : dow - 1
  const mon = new Date(date)
  mon.setDate(mon.getDate() - daysSinceMon)
  mon.setHours(0, 0, 0, 0)
  return mon
}

/**
 * Calculate week number based on date and season start.
 * Week 1 = the Mon–Sun week containing Opening Day (March 25).
 * Week 2 = the following Mon–Sun week, etc.
 * Season starts March 25 each year (MLB Opening Day)
 */
export function getWeekNumber(date: Date, seasonStartMonth: number = 3, seasonStartDay: number = 25): number {
  const year = date.getFullYear()
  const seasonStart = new Date(year, seasonStartMonth - 1, seasonStartDay)
  const weekOneMonday = getWeekMonday(seasonStart)

  // If date is before Week 1 Monday, fall back to previous year
  if (date < weekOneMonday) {
    const prevYearStart = new Date(year - 1, seasonStartMonth - 1, seasonStartDay)
    const prevWeekOneMonday = getWeekMonday(prevYearStart)
    const daysDiff = Math.floor((date.getTime() - prevWeekOneMonday.getTime()) / (1000 * 60 * 60 * 24))
    return Math.floor(daysDiff / 7) + 1
  }

  const daysDiff = Math.floor((date.getTime() - weekOneMonday.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor(daysDiff / 7) + 1
}

/**
 * Get the current year for the season
 * If date is before April 1, return previous year
 */
export function getSeasonYear(date: Date, seasonStartMonth: number = 3): number {
  const year = date.getFullYear()
  const seasonStart = new Date(year, seasonStartMonth - 1, 1)

  if (date < seasonStart) {
    return year - 1
  }
  return year
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

  // Count active members only (exclude alumni/inactive)
  const { data: members } = await supabase
    .from('members')
    .select('id, is_active')
    .eq('league_id', league_id)

  const memberCount = (members ?? []).filter((m) => m.is_active !== false).length
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
      .single()

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
 * Find all winners for a given week (teams that scored 13)
 * Returns array of member owners of those teams
 */
export async function getWinnersForWeek(
  league_id: string,
  week_number: number,
  year: number,
  supabase: SupabaseClient
): Promise<Winner[]> {
  // Get the week boundaries (Monday–Sunday, aligned to opening-day week)
  const seasonStart = new Date(year, 2, 25) // March 25 (MLB Opening Day)
  const weekOneMonday = getWeekMonday(seasonStart)
  const weekStart = new Date(weekOneMonday)
  weekStart.setDate(weekStart.getDate() + (week_number - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Find all games with 13-run results this week
  const { data: gameResults } = await supabase
    .from('game_results')
    .select('winning_team, game_date')
    .eq('was_thirteen', true)
    .gte('game_date', weekStart.toISOString().split('T')[0])
    .lte('game_date', weekEnd.toISOString().split('T')[0])

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

  const { error: payoutError } = await supabase
    .from('payouts')
    .insert(payoutRecords)

  if (payoutError) {
    throw new Error(`Failed to insert payouts: ${payoutError.message}`)
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
      payout_per_share: Math.floor(pot_amount / (winners.length || 1)),
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

  // 4. Update leagues.pot_total (reset to 0 if winners, keep amount if no rollover)
  // If there are winners, pot resets to 0 (next week will have fresh pot)
  // If no winners, pot stays as is (handled by next week's calculation with rollover)
  if (winners.length > 0) {
    const { error: leagueError } = await supabase
      .from('leagues')
      .update({ pot_total: 0 })
      .eq('id', league_id)

    if (leagueError) {
      throw new Error(`Failed to update league pot_total: ${leagueError.message}`)
    }
  }
}
