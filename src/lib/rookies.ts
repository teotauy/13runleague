export interface RookieEntry {
  name: string
  totalWon: number
  shares: number
  isROTY: boolean  // true for the winner (most $$ this season, tie → most wins)
}

/**
 * Compute rookies for the current season.
 *
 * A member is a rookie if their name appears in historicalRaw ONLY for
 * currentYear (no rows for any prior year).
 *
 * Returns [] if currentYear === leagueStartYear (inaugural season — everyone
 * is technically a rookie so we skip the award).
 */
export function computeRookies(
  historicalRaw: Array<{ member_name: string; year: number; total_won: number; shares: number }>,
  activeMembers: Array<{ name: string }>,
  currentYear: number
): RookieEntry[] {
  // Find the earliest year in the league's history
  const allYears = historicalRaw.map((r) => r.year)
  const leagueStartYear = allYears.length > 0 ? Math.min(...allYears) : currentYear

  // Inaugural season — skip ROTY
  if (currentYear === leagueStartYear) return []

  // Names that have history in ANY year before currentYear
  const veteranNames = new Set(
    historicalRaw.filter((r) => r.year < currentYear).map((r) => r.member_name)
  )

  // Active members whose name is NOT in veteranNames
  const rookieNames = activeMembers
    .map((m) => m.name)
    .filter((name) => !veteranNames.has(name))

  if (rookieNames.length === 0) return []

  // Get current season stats for each rookie (may be 0 if no wins yet)
  const rookieEntries: RookieEntry[] = rookieNames.map((name) => {
    const row = historicalRaw.find((r) => r.member_name === name && r.year === currentYear)
    return {
      name,
      totalWon: row?.total_won ?? 0,
      shares: row?.shares ?? 0,
      isROTY: false,
    }
  })

  // Sort: most $$ first, then most wins
  rookieEntries.sort((a, b) =>
    b.totalWon !== a.totalWon ? b.totalWon - a.totalWon : b.shares - a.shares
  )

  // Crown the leader (only if they have at least 1 win)
  if (rookieEntries[0]?.shares > 0) {
    rookieEntries[0].isROTY = true
  }

  return rookieEntries
}
