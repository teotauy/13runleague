import type { MLBGame } from '@/lib/mlb'
import {
  fetchLastSeasonRunsPerGame,
  fetchPitcherEra,
  fetchTeamSeasonStats,
} from '@/lib/mlb'
import { buildLambda, type LambdaBreakdown } from '@/lib/probability'

/**
 * Pitcher-adjusted λ for both sides of a scheduled game — same inputs as the homepage
 * probability pipeline (season stats, park, opposing starter ERA).
 */
export async function buildPitcherAdjustedLambdasForGame(
  game: MLBGame,
  season: number,
  rollingWindow?: number
): Promise<{ awayLambda: LambdaBreakdown; homeLambda: LambdaBreakdown }> {
  try {
    const [awayStats, homeStats] = await Promise.all([
      fetchTeamSeasonStats(game.teams.away.team.id, season, rollingWindow).catch(
        () => ({ teamId: game.teams.away.team.id, gamesPlayed: 0, runsPerGame: 4.5, totalRuns: 0 })
      ),
      fetchTeamSeasonStats(game.teams.home.team.id, season, rollingWindow).catch(
        () => ({ teamId: game.teams.home.team.id, gamesPlayed: 0, runsPerGame: 4.5, totalRuns: 0 })
      ),
    ])

    const [awayLastSeason, homeLastSeason] = await Promise.all([
      awayStats.gamesPlayed < 10
        ? fetchLastSeasonRunsPerGame(game.teams.away.team.id, season).catch(() => null)
        : Promise.resolve(null),
      homeStats.gamesPlayed < 10
        ? fetchLastSeasonRunsPerGame(game.teams.home.team.id, season).catch(() => null)
        : Promise.resolve(null),
    ])

    const awayPitcherId = game.probablePitchers?.away?.id
    const homePitcherId = game.probablePitchers?.home?.id

    const [awayPitcherEra, homePitcherEra] = await Promise.all([
      awayPitcherId ? fetchPitcherEra(awayPitcherId, season).catch(() => null) : Promise.resolve(null),
      homePitcherId ? fetchPitcherEra(homePitcherId, season).catch(() => null) : Promise.resolve(null),
    ])

    const venueId = String(game.venue.id)

    const awayLambda = buildLambda({
      baseRunsPerGame: awayStats.runsPerGame,
      gamesPlayed: awayStats.gamesPlayed,
      lastSeasonRunsPerGame: awayLastSeason ?? undefined,
      venueId,
      starterEra: homePitcherEra ?? undefined,
    })

    const homeLambda = buildLambda({
      baseRunsPerGame: homeStats.runsPerGame,
      gamesPlayed: homeStats.gamesPlayed,
      lastSeasonRunsPerGame: homeLastSeason ?? undefined,
      venueId,
      starterEra: awayPitcherEra ?? undefined,
    })

    return { awayLambda, homeLambda }
  } catch {
    const venueId = String(game.venue.id)
    const defaultLambda = buildLambda({ baseRunsPerGame: 4.5, gamesPlayed: 0, venueId })
    return { awayLambda: defaultLambda, homeLambda: defaultLambda }
  }
}
