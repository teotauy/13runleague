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
 * Global week counter — monotonically increasing across seasons.
 *
 * Each "year slot" is exactly SEASON_WEEKS (28) playing weeks.  Offseason
 * weeks are NOT counted — the drought clock freezes at end-of-season and
 * resumes at the start of the next season.
 *
 * Examples (base 2018, 28 weeks/slot):
 *   Goldfarb wins week 26 of 2025 → globalWeek(2025, 26) = 7×28 + 26 = 222
 *   Preseason March 2026           → globalWeek(2025, 28) = 7×28 + 28 = 224 (capped at 28)
 *   Drought                        → 224 − 222 = 2 weeks
 */
const BASE_YEAR = 2018
const WEEKS_PER_SLOT = 28  // One slot per season (28 playing weeks); offseason weeks don't count
const SEASON_WEEKS    = 28  // Season runs ~April–October, capped at 28 weeks

function globalWeek(year: number, week: number): number {
  return (year - BASE_YEAR) * WEEKS_PER_SLOT + Math.min(week, SEASON_WEEKS)
}

/**
 * Recalculate streak data for all members of a league and write to the streaks table.
 *
 * current_streak = weeks since the member's team last scored 13 — spans seasons.
 *                  A member who won the final week of last season will have a small
 *                  drought (just the offseason weeks), not a reset to zero.
 * longest_streak = longest consecutive winless run within the given season year.
 * closest_miss   = the game (in the given season year) where the member's team
 *                  came closest to 13 without hitting it.
 *
 * The `year` parameter is used only for the closest-miss window and the
 * longest-drought-within-season calc.  The cross-season drought uses all years.
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

  // 2. ALL payouts across ALL years (for cross-season drought)
  const { data: allPayouts } = await supabase
    .from('payouts')
    .select('member_id, week_number, year')
    .eq('league_id', leagueId)

  // Build per-member win list
  const winsByMember = new Map<string, Array<{ year: number; week: number }>>()
  for (const p of allPayouts ?? []) {
    if (!winsByMember.has(p.member_id)) winsByMember.set(p.member_id, [])
    winsByMember.get(p.member_id)!.push({ year: p.year, week: p.week_number })
  }

  // 3. Current position in time (handles preseason correctly)
  const today             = new Date()
  const currentYear       = getSeasonYear(today)   // e.g. 2025 in March 2026
  const rawWeek           = getWeekNumber(today)
  // Cap at SEASON_WEEKS so offseason weeks (Nov–Mar) don't inflate the drought counter
  const currentWeek       = Math.min(rawWeek, SEASON_WEEKS)
  const currentGlobal     = globalWeek(currentYear, currentWeek)

  // For "never won" case, drought measured from first week of BASE_YEAR
  const neverWonDrought = currentGlobal  // = weeks since the very beginning

  // Determine elapsed weeks in the given season year (for longest-drought-this-season)
  const seasonStart       = new Date(year, 3, 1)  // April 1
  const currentSeasonYear = getSeasonYear(today)
  // If we're viewing a completed season (year < currentSeasonYear, or year === currentSeasonYear
  // but we're already in the offseason), treat it as a full 28-week season.
  const isPreseason       = today < seasonStart
  const calYear           = today.getFullYear()
  const isOffseason       = today < new Date(calYear, 3, 1)  // before April 1 of this calendar year
  const seasonIsComplete  = year < currentSeasonYear || (year === currentSeasonYear && isOffseason)
  const weeksInYear       = seasonIsComplete ? SEASON_WEEKS : Math.min(getWeekNumber(today), SEASON_WEEKS)

  // Season date window for closest-miss query
  const seasonStartStr = `${year}-04-01`
  const seasonEndStr   = `${year}-10-15`

  // 4. Compute per-member data
  const upserts: StreakUpsert[] = await Promise.all(
    members.map(async (member) => {
      const wins = winsByMember.get(member.id) ?? []

      // ── Cross-season drought ───────────────────────────────────────────────
      let drought: number
      if (wins.length === 0) {
        drought = neverWonDrought
      } else {
        const lastWin = wins.reduce((best, w) =>
          globalWeek(w.year, w.week) > globalWeek(best.year, best.week) ? w : best
        )
        drought = currentGlobal - globalWeek(lastWin.year, lastWin.week)
      }

      // ── Longest winless run within the given season year ──────────────────
      let longestDrought = 0
      if (!isPreseason) {
        const winWeeksThisYear = new Set(
          wins.filter((w) => w.year === year).map((w) => w.week)
        )
        let running = 0
        for (let w = 1; w <= weeksInYear; w++) {
          if (winWeeksThisYear.has(w)) {
            running = 0
          } else {
            running++
            if (running > longestDrought) longestDrought = running
          }
        }
      }

      // ── Closest miss (current season) ─────────────────────────────────────
      const teamAbbr = member.assigned_team?.toUpperCase() ?? ''

      const { data: teamGames } = teamAbbr
        ? await supabase
            .from('game_results')
            .select('game_date, home_team, away_team, home_score, away_score, winning_team')
            .eq('was_thirteen', true)
            .gte('game_date', seasonStartStr)
            .lte('game_date', seasonEndStr)
            .or(`home_team.eq.${teamAbbr},away_team.eq.${teamAbbr}`)
            .neq('winning_team', teamAbbr)
        : { data: [] }

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
        if (
          dist < minDist ||
          (dist === minDist && game.game_date > (closestMissDate ?? ''))
        ) {
          minDist          = dist
          closestMissScore = myScore
          closestMissDate  = game.game_date
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

  const { error: delErr } = await supabase
    .from('streaks')
    .delete()
    .in('member_id', memberIds)

  if (delErr) throw new Error(`Failed to clear streaks: ${delErr.message}`)

  const { error: insErr } = await supabase
    .from('streaks')
    .insert(upserts)

  if (insErr) throw new Error(`Failed to insert streaks: ${insErr.message}`)
}
