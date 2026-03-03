import { fetchTodaySchedule, fetchTeamSeasonStats, fetchPitcherEra, fetchLiveFeed, fetchTeamGameLog, currentSeason, fetchLastSeasonRunsPerGame } from '@/lib/mlb'
import { buildLambda, gameThirteenProbability, getConditionalProbability } from '@/lib/probability'
import GameCard from '@/components/GameCard'
import LiveWatchCard from '@/components/LiveWatchCard'
import ScorigramiGrid from '@/components/ScorigramiGrid'
import type { MLBGame, MLBLiveGame } from '@/lib/mlb'
import type { LiveGameState } from '@/lib/probability'

export const revalidate = 60

const WINDOW_OPTIONS = [5, 10, 20, 0] // 0 = full season
const WINDOW_LABELS: Record<number, string> = { 5: '5', 10: '10', 20: '20', 0: 'Season' }

interface PageProps {
  searchParams: Promise<{ window?: string }>
}

async function enrichGame(
  game: MLBGame,
  season: number,
  rollingWindow: number
) {
  try {
    const [awayStats, homeStats] = await Promise.all([
      fetchTeamSeasonStats(game.teams.away.team.id, season, rollingWindow || undefined).catch(
        () => ({ teamId: game.teams.away.team.id, gamesPlayed: 0, runsPerGame: 4.5, totalRuns: 0 })
      ),
      fetchTeamSeasonStats(game.teams.home.team.id, season, rollingWindow || undefined).catch(
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

    const combinedProb = gameThirteenProbability(
      homeLambda.pitcherAdjusted,
      awayLambda.pitcherAdjusted
    )

    return {
      game,
      awayLambda,
      homeLambda,
      combinedProb,
      isBlended: awayLambda.isBlended || homeLambda.isBlended,
      awayPitcherName: game.probablePitchers?.away?.fullName,
      homePitcherName: game.probablePitchers?.home?.fullName,
    }
  } catch {
    // Fall back to pure Poisson with defaults if any fetch fails
    const venueId = String(game.venue.id)
    const defaultLambda = buildLambda({ baseRunsPerGame: 4.5, gamesPlayed: 0, venueId })
    const combinedProb = gameThirteenProbability(
      defaultLambda.pitcherAdjusted,
      defaultLambda.pitcherAdjusted
    )
    return {
      game,
      awayLambda: defaultLambda,
      homeLambda: defaultLambda,
      combinedProb,
      isBlended: false,
      awayPitcherName: undefined,
      homePitcherName: undefined,
    }
  }
}

export default async function HomePage({ searchParams }: PageProps) {
  const { window: windowParam } = await searchParams
  const rollingWindow = (() => {
    const w = parseInt(windowParam ?? '10', 10)
    return WINDOW_OPTIONS.includes(w) ? w : 10
  })()
  const season = currentSeason()

  // Fetch schedule — gracefully handle API failures
  let games: MLBGame[] = []
  let fetchError: string | null = null
  try {
    games = await fetchTodaySchedule()
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'MLB API unavailable'
  }

  const enrichedGames = await Promise.all(
    games.map((game) => enrichGame(game, season, rollingWindow))
  )
  enrichedGames.sort((a, b) => b.combinedProb - a.combinedProb)

  // Live games
  const liveGames = games.filter((g) => g.status.abstractGameState === 'Live')
  const liveFeeds = await Promise.all(
    liveGames.map((g) => fetchLiveFeed(g.gamePk).catch(() => null))
  )
  const activeLiveFeeds = liveFeeds.filter(Boolean) as MLBLiveGame[]
  const watchGames = activeLiveFeeds.filter((feed) => {
    const { away, home } = feed.liveData.linescore.teams
    return away.runs >= 9 || home.runs >= 9
  })

  // Scorigami: top teams from today's highest-probability games
  const topTeamIds = enrichedGames
    .slice(0, 4)
    .flatMap((e) => [e.game.teams.away.team, e.game.teams.home.team])

  const scorigramiData = await Promise.all(
    topTeamIds.map(async (team) => {
      try {
        const log = await fetchTeamGameLog(team.id, season)
        const counts: Record<number, number> = {}
        for (const entry of log) {
          counts[entry.runsScored] = (counts[entry.runsScored] ?? 0) + 1
        }
        return { abbr: team.abbreviation, counts }
      } catch {
        return { abbr: team.abbreviation, counts: {} }
      }
    })
  )

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-[#39ff14]">13</span> Run League
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Live probability dashboard —{' '}
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Rolling window selector */}
          <div className="flex items-center gap-1 bg-[#111] border border-gray-800 rounded p-1">
            <span className="text-xs text-gray-500 px-2">Window:</span>
            {WINDOW_OPTIONS.map((w) => (
              <a
                key={w}
                href={`?window=${w}`}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  rollingWindow === w
                    ? 'bg-[#39ff14] text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {WINDOW_LABELS[w]}
              </a>
            ))}
          </div>
        </header>

        {/* Spring Training banner — shown until Opening Day */}
        {new Date() < new Date('2026-03-25T00:00:00-04:00') && (
          <div className="rounded border border-blue-900 bg-blue-950/30 px-4 py-3 text-blue-300 text-sm flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">⚾</span>
            <div>
              <span className="font-semibold text-blue-200">Spring Training in progress.</span>
              {' '}Probabilities are based on Spring Training stats, which may not reflect regular season performance.
              {' '}<span className="text-blue-400">Opening Day is March 25.</span>
            </div>
          </div>
        )}

        {/* API error banner */}
        {fetchError && (
          <div className="rounded border border-amber-900 bg-amber-950/30 px-4 py-3 text-amber-400 text-sm">
            ⚠ MLB Stats API unavailable: {fetchError}. Showing fallback Poisson estimates.
          </div>
        )}

        {/* Live 13-Watch */}
        {watchGames.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-red-500 animate-pulse">●</span> Live 13-Watch
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchGames.map((feed) => {
                const { linescore } = feed.liveData
                const awayRuns = linescore.teams.away.runs
                const homeRuns = linescore.teams.home.runs
                const inning = linescore.currentInning
                const isTop = linescore.isTopInning
                const isHomeWinning = homeRuns > awayRuns

                const awayState: LiveGameState = {
                  side: 'vis',
                  inningCompleted: isTop ? inning - 1 : inning,
                  currentScore: awayRuns,
                  isHomeTeamWinning: isHomeWinning,
                  inning,
                  isBottom: !isTop,
                }
                const homeState: LiveGameState = {
                  side: 'home',
                  inningCompleted: isTop ? inning - 1 : inning,
                  currentScore: homeRuns,
                  isHomeTeamWinning: isHomeWinning,
                  inning,
                  isBottom: !isTop,
                }

                const enriched = enrichedGames.find((e) => e.game.gamePk === feed.gamePk)
                const awayLambdaVal = enriched?.awayLambda.pitcherAdjusted ?? 4.5
                const homeLambdaVal = enriched?.homeLambda.pitcherAdjusted ?? 4.5

                const awayResult = getConditionalProbability(awayState, awayLambdaVal)
                const homeResult = getConditionalProbability(homeState, homeLambdaVal)

                const innings = linescore.innings.map((inn) => ({
                  num: inn.num,
                  away: inn.away.runs,
                  home: inn.home.runs,
                }))

                return (
                  <LiveWatchCard
                    key={feed.gamePk}
                    gamePk={feed.gamePk}
                    awayTeam={feed.gameData.teams.away.team.abbreviation}
                    homeTeam={feed.gameData.teams.home.team.abbreviation}
                    awayRuns={awayRuns}
                    homeRuns={homeRuns}
                    inning={inning}
                    isTopInning={isTop}
                    inningOrdinal={linescore.currentInningOrdinal}
                    awayProb={awayRuns >= 9 ? awayResult.probability : null}
                    homeProb={homeRuns >= 9 ? homeResult.probability : null}
                    awaySource={awayResult.source}
                    homeSource={homeResult.source}
                    innings={innings}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* Today's Games Heatmap */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">
            Today&apos;s Games — Probability Heatmap
          </h2>
          {enrichedGames.length === 0 ? (
            <div className="rounded border border-gray-800 bg-[#111] px-6 py-16 text-center space-y-2">
              <div className="text-gray-500 font-mono text-lg">No games scheduled today</div>
              <div className="text-gray-700 text-sm">
                Check back during the MLB season (March–October)
              </div>
              <div className="text-gray-700 text-xs mt-4">
                <a href="/history" className="underline hover:text-gray-500">View historical 13-run games →</a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrichedGames.map(
                ({ game, awayLambda, homeLambda, combinedProb, isBlended, awayPitcherName, homePitcherName }) => (
                  <GameCard
                    key={game.gamePk}
                    gamePk={game.gamePk}
                    awayTeam={game.teams.away.team.abbreviation}
                    homeTeam={game.teams.home.team.abbreviation}
                    venueName={game.venue.name}
                    venueId={String(game.venue.id)}
                    awayPitcher={awayPitcherName}
                    homePitcher={homePitcherName}
                    awayLambda={awayLambda}
                    homeLambda={homeLambda}
                    combinedProbability={combinedProb}
                    isBlended={isBlended}
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* Scorigami Squares — only show if we have game data */}
        {scorigramiData.some((d) => Object.keys(d.counts).length > 0) && (
          <section>
            <h2 className="text-lg font-bold text-white mb-1">Scorigami Squares</h2>
            <p className="text-gray-600 text-xs mb-4">
              Run-scoring distribution for today&apos;s highest-probability teams (cell brightness = frequency)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {scorigramiData.map(({ abbr, counts }) => (
                <ScorigramiGrid key={abbr} teamAbbr={abbr} runCounts={counts} />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-900 pt-6 text-gray-600 text-xs space-y-2">
          <p>
            The information used here was obtained free of charge from and is copyrighted by{' '}
            <a
              href="https://www.retrosheet.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-400"
            >
              Retrosheet
            </a>
            . Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
          </p>
          <p className="text-gray-700">
            Live data via MLB Stats API · Probabilities are estimates, not gambling advice.
          </p>
        </footer>
      </div>
    </main>
  )
}
