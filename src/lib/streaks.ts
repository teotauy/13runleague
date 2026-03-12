import type { SupabaseClient } from '@supabase/supabase-js'
import { getWeekNumber, getSeasonYear } from './pot'

interface StreakUpsert {
  member_id: string
  current_streak: number
  longest_streak: number
  closest_miss_score: number | null
  closest_miss_date: string | null
  updated_at: string
}

/**
 * Recalculate streak data for all members of a league and write to the streaks table.
 *
 * current_streak = consecutive weeks WITHOUT a win from the current week backwards
 *                  (the "drought" — how long since the team last scored 13)
 * longest_streak = longest consecutive winless run recorded this season
 * closest_miss   = season game where the member's team came closest to 13 without hitting it
 *                  (sourced from game_results rows where was_thirteen = true but their team lost)
 */
export async function recalculateStreaks(
  leagueId: string,
  year: number,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Members in this league
  const { data: members } = await supabase
    .from('members')
    .select('id, assigned_team')
    .eq('league_id', leagueId)

  if (!members || members.length === 0) return

  // 2. All payouts for this league + year → win-week sets per member
  const { data: allPayouts } = await supabase
    .from('payouts')
    .select('member_id, week_number')
    .eq('league_id', leagueId)
    .eq('year', year)

  const winWeeksByMember = new Map<string, Set<number>>()
  for (const p of allPayouts ?? []) {
    if (!winWeeksByMember.has(p.member_id)) {
      winWeeksByMember.set(p.member_id, new Set())
    }
    winWeeksByMember.get(p.member_id)!.add(p.week_number)
  }

  // 3. Determine how many weeks of the season have elapsed
  const today = new Date()
  const currentSeasonYear = getSeasonYear(today)
  const seasonStart = new Date(year, 3, 1) // April 1

  // Season hasn't started yet — zero everything out and return
  if (today < seasonStart) {
    const resets: StreakUpsert[] = members.map((m) => ({
      member_id: m.id,
      current_streak: 0,
      longest_streak: 0,
      closest_miss_score: null,
      closest_miss_date: null,
      updated_at: new Date().toISOString(),
    }))
    await _writeStreaks(members.map((m) => m.id), resets, supabase)
    return
  }

  // For past seasons treat the whole season as played (≈26 weeks Apr–Sep)
  const currentWeek =
    year === currentSeasonYear ? getWeekNumber(today) : 26

  // Season date window for closest-miss query
  const seasonStartStr = `${year}-04-01`
  const seasonEndStr   = `${year}-10-15`

  // 4. Compute per-member streak data (closest-miss queries are independent → Promise.all)
  const upserts: StreakUpsert[] = await Promise.all(
    members.map(async (member) => {
      const winWeeks = winWeeksByMember.get(member.id) ?? new Set<number>()

      // ── Current drought ──────────────────────────────────────────────────
      // Count backwards from currentWeek until we hit a win or reach week 0.
      let drought = 0
      for (let w = currentWeek; w >= 1; w--) {
        if (winWeeks.has(w)) break
        drought++
      }

      // ── Longest drought ──────────────────────────────────────────────────
      let longestDrought = 0
      let running = 0
      for (let w = 1; w <= currentWeek; w++) {
        if (winWeeks.has(w)) {
          running = 0
        } else {
          running++
          if (running > longestDrought) longestDrought = running
        }
      }

      // ── Closest miss ─────────────────────────────────────────────────────
      // Look at 13-run games this season where the member's team played but
      // DIDN'T score 13.  Among those, find the score closest to 13.
      const teamAbbr = member.assigned_team.toUpperCase()

      const { data: teamGames } = await supabase
        .from('game_results')
        .select('game_date, home_team, away_team, home_score, away_score, winning_team')
        .eq('was_thirteen', true)
        .gte('game_date', seasonStartStr)
        .lte('game_date', seasonEndStr)
        .or(`home_team.eq.${teamAbbr},away_team.eq.${teamAbbr}`)
        .neq('winning_team', teamAbbr)   // team did NOT score 13

      let closestMissScore: number | null = null
      let closestMissDate: string | null  = null
      let minDist = Infinity

      for (const game of teamGames ?? []) {
        const myScore =
          game.home_team === teamAbbr
            ? (game.home_score as number | null)
            : (game.away_score as number | null)
        if (myScore === null || myScore === undefined) continue

        const dist = Math.abs(myScore - 13)
        // Prefer smaller distance; break ties with most-recent date
        if (
          dist < minDist ||
          (dist === minDist && game.game_date > (closestMissDate ?? ''))
        ) {
          minDist            = dist
          closestMissScore   = myScore
          closestMissDate    = game.game_date
        }
      }

      return {
        member_id:          member.id,
        current_streak:     drought,
        longest_streak:     longestDrought,
        closest_miss_score: closestMissScore,
        closest_miss_date:  closestMissDate,
        updated_at:         new Date().toISOString(),
      }
    })
  )

  await _writeStreaks(members.map((m) => m.id), upserts, supabase)
}

/**
 * Delete-then-insert so we don't need a UNIQUE constraint on member_id.
 * Runs as two queries total regardless of member count.
 */
async function _writeStreaks(
  memberIds: string[],
  upserts: StreakUpsert[],
  supabase: SupabaseClient
): Promise<void> {
  if (upserts.length === 0) return

  // Wipe existing rows for these members
  const { error: delErr } = await supabase
    .from('streaks')
    .delete()
    .in('member_id', memberIds)

  if (delErr) throw new Error(`Failed to clear streaks: ${delErr.message}`)

  // Insert fresh rows
  const { error: insErr } = await supabase
    .from('streaks')
    .insert(upserts)

  if (insErr) throw new Error(`Failed to insert streaks: ${insErr.message}`)
}
