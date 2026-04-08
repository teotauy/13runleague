import type { SupabaseClient } from '@supabase/supabase-js'
import { getWeekNumber, getSeasonYear } from './pot'

interface StreakUpsert {
  member_id: string
  current_streak: number
  longest_streak: number
  closest_miss_score: null
  closest_miss_date: null
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
 *
 * The `year` parameter is used for the longest-drought-within-season calc.
 * The cross-season drought uses all years.
 */
export async function recalculateStreaks(
  leagueId: string,
  year: number,
  supabase: SupabaseClient
): Promise<void> {
  // 1. Members in this league
  const { data: members } = await supabase
    .from('members')
    .select('id, assigned_team, created_at')
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
  const currentYear       = getSeasonYear(today)
  const rawWeek           = getWeekNumber(today)
  // Cap at SEASON_WEEKS so offseason weeks (Nov–Mar) don't inflate the drought counter
  const currentWeek       = Math.min(rawWeek, SEASON_WEEKS)
  const currentGlobal     = globalWeek(currentYear, currentWeek)

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

  // 4. Compute per-member data
  const upserts: StreakUpsert[] = await Promise.all(
    members.map(async (member) => {
      const wins = winsByMember.get(member.id) ?? []

      // ── Cross-season drought ───────────────────────────────────────────────
      // For never-won members, count from when they joined — not from BASE_YEAR.
      // If created_at is before that calendar year's Opening Day (March 25),
      // treat them as joining at Week 1 of that year's season rather than the
      // tail of the prior season (which getSeasonYear/getWeekNumber would return).
      const joinDate     = member.created_at ? new Date(member.created_at) : new Date(BASE_YEAR, 2, 25)
      const joinCalYear  = joinDate.getFullYear()
      const openingDay   = new Date(joinCalYear, 2, 25) // March 25 of their join calendar year
      let joinGlobal: number
      if (joinDate < openingDay) {
        // Pre-season join → first eligible week is Week 1 of that calendar year's season
        joinGlobal = globalWeek(joinCalYear, 1)
      } else {
        const joinYear = getSeasonYear(joinDate)
        const joinWeek = Math.max(1, Math.min(getWeekNumber(joinDate), SEASON_WEEKS))
        joinGlobal = globalWeek(joinYear, joinWeek)
      }
      // drought = weeks elapsed since join week without a win (0 = won this week)
      const neverWonDrought = Math.max(0, currentGlobal - joinGlobal)

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

      return {
        member_id:            member.id,
        current_streak:       drought,
        longest_streak:       longestDrought,
        closest_miss_score:   null,
        closest_miss_date:    null,
        updated_at:           new Date().toISOString(),
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
