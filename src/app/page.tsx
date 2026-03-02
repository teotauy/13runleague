import { fetchTodaySchedule, fetchTeamSeasonStats, fetchPitcherEra, fetchLiveFeed, fetchTeamGameLog, currentSeason, fetchLastSeasonRunsPerGame } from '@/lib/mlb'
import { buildLambda, gameThirteenProbability, getConditionalProbability } from '@/lib/probability'
import GameCard from '@/components/GameCard'
import LiveWatchCard from '@/components/LiveWatchCard'
import ScorigramiGrid from '@/components/ScorigramiGrid'
import type { MLBLiveGame } from '@/lib/mlb'
import type { LiveGameState } from '@/lib/probability'

export const revalidate = 60

const WINDOW_OPTIONS = [5, 10, 20, 0] // 0 = full season
const WINDOW_LABELS: Record<number, string> = { 5: '5', 10: '10', 20: '20', 0: 'Season' }

interface PageProps {
  searchParams: Promise<{ window?: string }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const { window: windowParam } = await searchParams
  const rollingWindow = (() => {
    const w = parseInt(windowParam ?? '10', 10)
    return WINDOW_OPTIONS.includes(w) ? w : 10
  })()
  const season = currentSeason()

  const games = await fetchTodaySchedule()

  // Build enriched game data with probabilities
  const enrichedGames = await Promise.all(
    games.map(async (game) => {
      const [awayStats, homeStats] = await Promise.all([
        fetchTeamSeasonStats(game.teams.away.team.id, season, rollingWindow || undefined),
        fetchTeamSeasonStats(game.teams.home.team.id, season, rollingWindow || undefined),
      ])

      const [awayLastSeason, homeLastSeason] = await Promise.all([
        awayStats.gamesPlayed < 10
          ? fetchLastSeasonRunsPerGame(game.teams.away.team.id, season)
          : Promise.resolve(null),
        homeStats.gamesPlayed < 10
          ? fetchLastSeasonRunsPerGame(game.teams.home.team.id, season)
          : Promise.resolve(null),
      ])

      // Pitcher ERA: away pitcher affects home team's expected runs (and vice versa)
      const awayPitcherId = game.probablePitchers?.away?.id
      const homePitcherId = game.probablePitchers?.home?.id

      const [awayPitcherEra, homePitcherEra] = await Promise.all([
        awayPitcherId ? fetchPitcherEra(awayPitcherId, season) : Promise.resolve(null),
        homePitcherId ? fetchPitcherEra(homePitcherId, season) : Promise.resolve(null),
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
    })
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
      const log = await fetchTeamGameLog(team.id, season)
      const counts: Record<number, number> = {}
      for (const entry of log) {
        counts[entry.runsScored] = (counts[entry.runsScored] ?? 0) + 1
      }
      return { abbr: team.abbreviation, counts }
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

                const enriched = enrichedGames.find(
                  (e) => e.game.gamePk === feed.gamePk
                )
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
            <div className="text-gray-600 text-center py-16 font-mono">
              No games scheduled today.
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

        {/* Scorigami Squares */}
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
