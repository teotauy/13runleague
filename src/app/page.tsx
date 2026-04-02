import { fetchTodaySchedule, fetchTeamSeasonStats, fetchPitcherEra, fetchLiveFeed, fetchTeamGameLog, currentSeason, fetchLastSeasonRunsPerGame, baseballToday, fetchOnThisDayThirteens } from '@/lib/mlb'
import {
  buildLambda,
  calculateThirteenProbability,
  gameThirteenProbability,
  getLiveConditionalProbs,
} from '@/lib/probability'
import CollapsibleGameCard from '@/components/CollapsibleGameCard'
import LiveRankTable from '@/components/LiveRankTable'
import LiveWatchCard from '@/components/LiveWatchCard'
import ScorigramiGrid from '@/components/ScorigramiGrid'
import LeagueExplainer from '@/components/LeagueExplainer'
import ThirteenRunLore from '@/components/ThirteenRunLore'
import ThirteenCelebration from '@/components/ThirteenCelebration'
import OnThisDayMLB from '@/components/OnThisDayMLB'
import ThirteenRunHistoryCard from '@/components/ThirteenRunHistoryCard'
import SiteFooter from '@/components/SiteFooter'
import type { SeasonState } from '@/components/SeasonBanner'
import { getFestiveTheme } from '@/lib/festiveThemes'
import { createServiceClient } from '@/lib/supabase/server'
import type { MLBGame, MLBLiveGame } from '@/lib/mlb'
import AddToHomeScreenBanner from "@/components/AddToHomeScreenBanner"

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

  // Scoreboard data for ALL live games
  const scoreboardGames = activeLiveFeeds.flatMap((feed) => {
    try {
      return [{
        gamePk: feed.gamePk,
        away: {
          team: feed.gameData.teams.away.abbreviation,
          runs: feed.liveData.linescore.teams.away.runs ?? 0,
        },
        home: {
          team: feed.gameData.teams.home.abbreviation,
          runs: feed.liveData.linescore.teams.home.runs ?? 0,
        },
        inning: feed.liveData.linescore.currentInning ?? 1,
        isTopInning: feed.liveData.linescore.isTopInning ?? true,
        outs: feed.liveData.linescore.outs ?? 0,
        runners: {
          first: !!feed.liveData.linescore.runners?.first,
          second: !!feed.liveData.linescore.runners?.second,
          third: !!feed.liveData.linescore.runners?.third,
        },
      }]
    } catch {
      return []
    }
  })

  // Watch games: 9+ runs (high probability of exactly 13)
  const watchGames = activeLiveFeeds.filter((feed) => {
    const { away, home } = feed.liveData.linescore.teams
    return (away?.runs ?? 0) >= 9 || (home?.runs ?? 0) >= 9
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

  // On This Day — historical MLB 13-run games
  const todayMonthDay = baseballToday().slice(5) // MM-DD
  const onThisDayGames = await fetchOnThisDayThirteens(todayMonthDay).catch(() => [])

  // Historical 13-run games for lore section
  const supabase = createServiceClient()
  const { data: thirteenHistory } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, winning_team, home_score, away_score')
    .eq('was_thirteen', true)
    .order('game_date', { ascending: false })

  const todayStr = baseballToday()
  const todayThirteens = (thirteenHistory ?? []).filter((g) => g.game_date === todayStr)

  // ── Season state for banner ──
  const bannerTodayStr = baseballToday()
  const [bY, bMo, bDy] = bannerTodayStr.split('-').map(Number)
  const bMonth = bMo - 1 // 0-indexed
  const bDay = bDy

  // Opening Day is March 25 of the current or next year
  const openingYear = (bMonth > 2 || (bMonth === 2 && bDay >= 25)) ? bY + 1 : bY
  const openingDayDate = new Date(`${openingYear}-03-25T00:00:00-04:00`)
  const nowForBanner = new Date(bannerTodayStr + 'T12:00:00-04:00')
  const daysToOpening = Math.max(0, Math.ceil((openingDayDate.getTime() - nowForBanner.getTime()) / (1000 * 60 * 60 * 24)))
  const openingDateStr = openingDayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

  // Offseason: Oct 5 → ~Feb 19 (before spring training camps open)
  const isOffseason = (bMonth > 9) || (bMonth === 9 && bDay >= 5) || bMonth === 0 || (bMonth === 1 && bDay < 20)
  // Spring Training: ~Feb 20 → Opening Day
  const isSpring = !isOffseason && nowForBanner < openingDayDate
  // Opening Day: March 25–26 (day of + one grace day)
  const isOpeningDay = bMonth === 2 && (bDay === 25 || bDay === 26)
  // Opening Week: March 27 → March 29 (until Sunday)
  const isOpeningWeek = bMonth === 2 && bDay >= 27 && bDay <= 29
  // Regular Season: March 30+ → Oct 4
  const isSeason = !isOffseason && !isSpring && !isOpeningDay && !isOpeningWeek
  // Week number: days since Opening Day / 7, starting at 1
  const openingDayThisYear = new Date(`${bY}-03-25T00:00:00-04:00`)
  const weekNumber = isSeason ? Math.floor((nowForBanner.getTime() - openingDayThisYear.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1 : undefined
  const seasonState: SeasonState = isOffseason ? 'offseason' : isSpring ? 'spring' : isOpeningDay ? 'opening-day' : isOpeningWeek ? 'opening-week' : isSeason ? 'season' : null
  const festiveTheme = getFestiveTheme(nowForBanner)

  return (
    <div className="min-h-screen bg-[#0f1115] stadium-texture text-white">

      {todayThirteens.length > 0 && (
        <ThirteenCelebration games={todayThirteens} />
      )}

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">

        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-white/5">
          <div>
            <p className="section-label mb-1">Live Probability Dashboard</p>
            <h1 className="text-5xl font-black tracking-tight leading-none">
              <span className="text-[#39ff14]">13</span> Run League
            </h1>
            <p className="text-gray-600 mt-2 text-sm">
              {new Date(baseballToday() + 'T12:00:00-04:00').toLocaleDateString('en-US', {
                timeZone: 'America/New_York',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <a
              href={process.env.NEXT_PUBLIC_LEAGUE_SLUG ? `/league/${process.env.NEXT_PUBLIC_LEAGUE_SLUG}` : '/league'}
              className="self-start sm:self-auto px-4 py-2 bg-[#39ff14] text-black text-sm font-bold rounded-lg hover:bg-[#2de010] transition-colors"
            >
              My League →
            </a>
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-lg p-1">
              <span className="section-label px-2">Window</span>
              {WINDOW_OPTIONS.map((w) => (
                <a
                  key={w}
                  href={`?window=${w}`}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                    rollingWindow === w
                      ? 'bg-[#39ff14] text-black font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {WINDOW_LABELS[w]}
                </a>
              ))}
            </div>
          </div>
        </header>

        {/* API error banner */}
        {fetchError && (
          <div className="rounded-xl border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-amber-400 text-sm">
            ⚠ MLB Stats API unavailable: {fetchError}. Showing fallback Poisson estimates.
          </div>
        )}

        {/* ── Live 13-Watch ── */}
        {watchGames.length > 0 && (
          <section className="module-card">
            <p className="section-label mb-1">In Progress</p>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-red-500 animate-pulse">●</span> Live 13-Watch
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watchGames.map((feed) => {
                const { linescore } = feed.liveData
                const awayRuns = linescore.teams.away.runs
                const homeRuns = linescore.teams.home.runs
                const inning = linescore.currentInning
                const isTop = linescore.isTopInning

                const enriched = enrichedGames.find((e) => e.game.gamePk === feed.gamePk)
                const awayLambdaVal = enriched?.awayLambda.pitcherAdjusted ?? 4.5
                const homeLambdaVal = enriched?.homeLambda.pitcherAdjusted ?? 4.5

                const liveProbs = getLiveConditionalProbs(
                  awayRuns,
                  homeRuns,
                  inning,
                  isTop,
                  awayLambdaVal,
                  homeLambdaVal
                )
                const awayResult = liveProbs.away
                const homeResult = liveProbs.home

                const innings = linescore.innings.map((inn) => ({
                  num: inn.num,
                  away: inn.away?.runs,
                  home: inn.home?.runs,
                }))

                return (
                  <LiveWatchCard
                    key={feed.gamePk}
                    gamePk={feed.gamePk}
                    awayTeam={feed.gameData.teams.away.abbreviation ?? '???'}
                    homeTeam={feed.gameData.teams.home.abbreviation ?? '???'}
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
                    awayLambda={awayLambdaVal}
                    homeLambda={homeLambdaVal}
                  />
                )
              })}
            </div>
          </section>
        )}

        {/* ── Live Rankings ── */}
        {enrichedGames.length === 0 ? (
          <section className="module-card">
            <div className="px-6 py-16 text-center space-y-2">
              <div className="text-gray-500 font-mono text-lg">No games scheduled today</div>
              <div className="text-gray-700 text-sm">
                Check back during the MLB season (March–October)
              </div>
            </div>
          </section>
        ) : (
          <LiveRankTable
            games={enrichedGames.map(({ game, awayLambda, homeLambda }) => {
              const status = game.status.abstractGameState
              const liveFeed = activeLiveFeeds.find((f) => f.gamePk === game.gamePk)
              const awayL = awayLambda.pitcherAdjusted
              const homeL = homeLambda.pitcherAdjusted

              let awayScore = game.teams.away.score
              let homeScore = game.teams.home.score
              let inning: number | undefined
              let isTopInning: boolean | undefined
              let awayProb: number
              let homeProb: number

              if (status === 'Final') {
                const ar = game.teams.away.score ?? 0
                const hr = game.teams.home.score ?? 0
                awayScore = ar
                homeScore = hr
                awayProb = ar === 13 ? 1 : 0
                homeProb = hr === 13 ? 1 : 0
              } else if (status === 'Live' && liveFeed) {
                const ls = liveFeed.liveData.linescore
                const ar = ls.teams.away.runs ?? 0
                const hr = ls.teams.home.runs ?? 0
                awayScore = ar
                homeScore = hr
                inning = ls.currentInning
                isTopInning = ls.isTopInning
                const live = getLiveConditionalProbs(
                  ar,
                  hr,
                  ls.currentInning,
                  ls.isTopInning,
                  awayL,
                  homeL
                )
                awayProb = live.away.probability
                homeProb = live.home.probability
              } else if (status === 'Live') {
                // Feed missing (rare): fall back to pre-game marginal
                awayProb = calculateThirteenProbability(awayL)
                homeProb = calculateThirteenProbability(homeL)
              } else {
                awayProb = calculateThirteenProbability(awayL)
                homeProb = calculateThirteenProbability(homeL)
              }

              return {
                gamePk: game.gamePk,
                awayTeam: game.teams.away.team.abbreviation,
                homeTeam: game.teams.home.team.abbreviation,
                awayScore,
                homeScore,
                gameStatus: status,
                inning,
                isTopInning,
                awayProb,
                homeProb,
              }
            })}
          />
        )}

        {/* ── On This Day in MLB History ── */}
        <section className="module-card">
          <p className="section-label mb-1">On This Day</p>
          <OnThisDayMLB games={onThisDayGames} monthDay={todayMonthDay} />
        </section>

        {/* ── Scorigami Squares ── */}
        {scorigramiData.some((d) => Object.keys(d.counts).length > 0) && (
          <section className="module-card">
            <p className="section-label mb-1">Scoring Patterns</p>
            <h2 className="text-xl font-bold text-white mb-1">Scorigami Squares</h2>
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

        {/* ── 13-Run History ── */}
        {thirteenHistory && thirteenHistory.length > 0 && (
          <section className="module-card">
            <p className="section-label mb-1">League History</p>
            <h2 className="text-xl font-bold mb-4"><span className="text-[#39ff14]">13</span>-Run History</h2>
            <ThirteenRunHistoryCard games={thirteenHistory} />
          </section>
        )}

        {/* ── 13-Run Lore ── */}
        {thirteenHistory && thirteenHistory.length > 0 && (
          <section className="module-card">
            <p className="section-label mb-1">The Lore</p>
            <ThirteenRunLore games={thirteenHistory} />
          </section>
        )}

        {/* ── Explainer ── */}
        <section className="module-card">
          <p className="section-label mb-1">How It Works</p>
          <LeagueExplainer />
        </section>

        {/* Footer */}
        <SiteFooter />
      </div>
    </div>
  )
}
