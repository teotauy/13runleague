import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchTodaySchedule, fetchLiveFeed, fetchDateRangeSchedule, currentSeason, type MLBLiveGame, type MLBGame } from '@/lib/mlb'
import { calculateThirteenProbability, getLiveConditionalProbs } from '@/lib/probability'
import { buildPitcherAdjustedLambdasForGame } from '@/lib/scheduledGameLambdas'
import {
  getWeekNumber,
  getSeasonYear,
  getWinnersForWeek,
  getEffectiveRolloverPotForDashboard,
} from '@/lib/pot'
import RankingsTabs, { type AllTimeEntry, type TeamEntry } from '@/components/RankingsTabs'
import PotBreakdown from '@/components/PotBreakdown'
import LeaderboardTable, { type LeaderboardRow } from '@/components/LeaderboardTable'
import LeagueDashboardHeader from '@/components/LeagueDashboardHeader'
import WinCelebration, { type WinCelebrationPayout } from '@/components/WinCelebration'
import LeagueTabs from '@/components/LeagueTabs'
import LeagueExplainer from '@/components/LeagueExplainer'
import ThirteenRunLore from '@/components/ThirteenRunLore'
import { normalizeTeamAbbr } from '@/lib/teamColors'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LeagueDashboard({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceClient()
  const season = currentSeason()

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  const role: 'admin' | 'member' =
    authCookie?.value === 'admin' || authCookie?.value === 'authenticated' ? 'admin' : 'member'

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, pot_total, weekly_buy_in, rules')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  const { data: members } = await supabase
    .from('members')
    .select('id, name, assigned_team, phone, is_active, pre_season_paid')
    .eq('league_id', league.id)
    .order('name')

  const { data: streaks } = await supabase
    .from('streaks')
    .select('member_id, current_streak, longest_streak')

  // Fetch ALL 13-run games — small dataset, used for both the recent list and lore stats
  const { data: thirteenHistory } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, winning_team, home_score, away_score')
    .eq('was_thirteen', true)
    .order('game_date', { ascending: false })

  const games = await fetchTodaySchedule()

  // Week remaining schedule (today → Saturday) for games-left count + sweat factor
  const nowForWeek = new Date()
  const daysToSat = nowForWeek.getDay() === 6 ? 0 : 6 - nowForWeek.getDay()
  const satDate = new Date(nowForWeek)
  satDate.setDate(nowForWeek.getDate() + daysToSat)
  const todayStr = nowForWeek.toISOString().slice(0, 10)
  const satStr   = satDate.toISOString().slice(0, 10)
  const weekSchedule = await fetchDateRangeSchedule(todayStr, satStr)

  const liveGames = games.filter((g) => g.status.abstractGameState === 'Live')
  const liveFeeds = await Promise.all(
    liveGames.map((g) => fetchLiveFeed(g.gamePk).catch(() => null))
  )
  const liveFeedByPk = new Map<number, MLBLiveGame>()
  for (const feed of liveFeeds) {
    if (feed) liveFeedByPk.set(feed.gamePk, feed)
  }

  const lambdasByGamePk = new Map<
    number,
    ReturnType<typeof buildPitcherAdjustedLambdasForGame>
  >()
  function lambdasForGame(game: MLBGame) {
    let p = lambdasByGamePk.get(game.gamePk)
    if (!p) {
      p = buildPitcherAdjustedLambdasForGame(game, season)
      lambdasByGamePk.set(game.gamePk, p)
    }
    return p
  }

  const activeMembers = (members ?? []).filter((m) => m.is_active !== false)

  // Games remaining this week per member (non-Final games today → Saturday)
  const memberGamesLeft = new Map<string, number>()
  const assignedTeamSet = new Set(
    activeMembers.map((m) => normalizeTeamAbbr(m.assigned_team.toUpperCase()))
  )
  for (const member of activeMembers) {
    const canonTeam = normalizeTeamAbbr(member.assigned_team.toUpperCase())
    const count = weekSchedule.filter(
      (g) =>
        g.status.abstractGameState !== 'Final' &&
        (normalizeTeamAbbr(g.teams.home.team.abbreviation) === canonTeam ||
          normalizeTeamAbbr(g.teams.away.team.abbreviation) === canonTeam)
    ).length
    memberGamesLeft.set(member.id, count)
  }

  // Sweat Factor = P(at least one league team scores 13 in remaining games this week).
  // Uses base Poisson lambda (no pitcher adjustment) since future-game pitchers aren't known.
  const BASE_LAMBDA = 4.7
  const baseP13 = calculateThirteenProbability(BASE_LAMBDA)
  let pNoThirteen = 1
  let totalGamesLeft = 0
  for (const g of weekSchedule) {
    if (g.status.abstractGameState === 'Final') continue
    if (assignedTeamSet.has(normalizeTeamAbbr(g.teams.home.team.abbreviation))) {
      pNoThirteen *= 1 - baseP13
      totalGamesLeft++
    }
    if (assignedTeamSet.has(normalizeTeamAbbr(g.teams.away.team.abbreviation))) {
      pNoThirteen *= 1 - baseP13
      totalGamesLeft++
    }
  }
  const sweatPct = totalGamesLeft > 0 ? 1 - pNoThirteen : 0

  // Enrich each active member with today's game info and P(13) (live conditional when in progress)
  const enrichedMembers = await Promise.all(
    activeMembers.map(async (member) => {
      const canonMemberTeam = normalizeTeamAbbr(member.assigned_team.toUpperCase())

      const todayGame = games.find(
        (g) =>
          normalizeTeamAbbr(g.teams.home.team.abbreviation) === canonMemberTeam ||
          normalizeTeamAbbr(g.teams.away.team.abbreviation) === canonMemberTeam
      )

      const streak = streaks?.find((s) => s.member_id === member.id)

      if (!todayGame) {
        return { member, streak, todayGame: null, todayProb: null }
      }

      const isHome = normalizeTeamAbbr(todayGame.teams.home.team.abbreviation) === canonMemberTeam
      const { awayLambda, homeLambda } = await lambdasForGame(todayGame)
      const awayAdj = awayLambda.pitcherAdjusted
      const homeAdj = homeLambda.pitcherAdjusted
      const status = todayGame.status.abstractGameState
      const feed = liveFeedByPk.get(todayGame.gamePk)

      let prob: number
      if (status === 'Final') {
        const runs = isHome
          ? (todayGame.teams.home.score ?? 0)
          : (todayGame.teams.away.score ?? 0)
        prob = runs === 13 ? 1 : 0
      } else if (status === 'Live' && feed) {
        const ls = feed.liveData.linescore
        const live = getLiveConditionalProbs(
          ls.teams.away.runs ?? 0,
          ls.teams.home.runs ?? 0,
          ls.currentInning,
          ls.isTopInning,
          awayAdj,
          homeAdj
        )
        prob = isHome ? live.home.probability : live.away.probability
      } else {
        prob = calculateThirteenProbability(isHome ? homeAdj : awayAdj)
      }

      return { member, streak, todayGame, todayProb: prob }
    })
  )

  // Current week data
  const today = new Date()
  const currentWeekNumber = getWeekNumber(today)
  const seasonYear = getSeasonYear(today)
  const calendarYear = today.getFullYear()
  const alumniNamesLower = (members ?? [])
    .filter((m) => m.is_active === false)
    .map((m) => m.name.trim().toLowerCase())

  // Fetch weekly payments for current week
  const { data: currentWeekPayments } = await supabase
    .from('weekly_payments')
    .select('member_id, week_number, payment_status')
    .eq('week_number', currentWeekNumber)

  // Fetch payouts for current week (settled end-of-week amounts)
  const { data: currentWeekPayouts } = await supabase
    .from('payouts')
    .select('member_id, payout_amount, week_number, winning_team')
    .eq('week_number', currentWeekNumber)
    .eq('year', seasonYear)

  // Winners this week from game_results — available as soon as a team scores 13,
  // before payouts are settled on Sunday
  const thisWeekWinners = await getWinnersForWeek(
    league.id,
    currentWeekNumber,
    seasonYear,
    supabase
  )

  const potTotalForDisplay = await getEffectiveRolloverPotForDashboard(
    league.id,
    league.pot_total,
    seasonYear,
    currentWeekNumber,
    supabase
  )

  // Recent payouts — for win celebration banner (show within 72 hours)
  // Fetch all payouts from the most recently settled week so multi-winner weeks show everyone
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const { data: recentPayouts } = await supabase
    .from('payouts')
    .select('id, member_id, week_number, year, winning_team, payout_amount, game_date, created_at')
    .eq('year', seasonYear)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })

  let winCelebrationPayouts: WinCelebrationPayout[] = []
  if (recentPayouts && recentPayouts.length > 0) {
    // All payouts from the most recently settled week
    const newestWeek = recentPayouts[0].week_number
    const newestYear = recentPayouts[0].year
    winCelebrationPayouts = recentPayouts
      .filter((p) => p.week_number === newestWeek && p.year === newestYear)
      .flatMap((p) => {
        const memberRecord = (members ?? []).find((m) => m.id === p.member_id)
        if (!memberRecord) return []
        return [{
          id: p.id,
          member_name: memberRecord.name,
          week_number: p.week_number,
          year: p.year,
          winning_team: p.winning_team,
          payout_amount: p.payout_amount,
          game_date: p.game_date ?? null,
        }]
      })
  }

  // All payouts this season — for leaderboard Wins + Won columns
  // wins = total 13-run games scored by the member's team this season
  const { data: seasonPayouts } = await supabase
    .from('payouts')
    .select('member_id, payout_amount')
    .eq('year', seasonYear)

  const seasonStatsMap = new Map<string, { wins: number; totalWon: number }>()
  for (const p of seasonPayouts ?? []) {
    const existing = seasonStatsMap.get(p.member_id) ?? { wins: 0, totalWon: 0 }
    existing.wins += 1
    existing.totalWon += p.payout_amount
    seasonStatsMap.set(p.member_id, existing)
  }

  // Combine enriched member data with season stats for the leaderboard
  const leaderboardRows: LeaderboardRow[] = enrichedMembers.map(
    ({ member, streak, todayGame, todayProb }) => {
      const ss = seasonStatsMap.get(member.id) ?? { wins: 0, totalWon: 0 }
      return {
        member,
        streak,
        todayGame,
        todayProb,
        seasonWins: ss.wins,
        seasonWon: ss.totalWon,
        weekGamesLeft: memberGamesLeft.get(member.id) ?? 0,
      }
    }
  )

  // Historical results for rankings tabs
  const { data: historicalRaw } = await supabase
    .from('historical_results')
    .select('member_name, team, year, total_won, shares, week_wins')
    .eq('league_id', league.id)

  // Build a case-insensitive name → member map for robust matching
  const memberByName = new Map<string, { id: string; name: string; isActive: boolean }>()
  for (const m of members ?? []) {
    memberByName.set(m.name.trim().toLowerCase(), {
      id: m.id,
      name: m.name,
      isActive: m.is_active !== false,
    })
  }

  // Aggregate all-time rankings by member
  const allTimeMap = new Map<string, AllTimeEntry>()
  for (const row of historicalRaw ?? []) {
    const matched = memberByName.get(row.member_name.trim().toLowerCase())
    const isActive = matched?.isActive ?? false
    const existing = allTimeMap.get(row.member_name)
    if (existing) {
      existing.totalWon += row.total_won ?? 0
      existing.totalShares += row.shares ?? 0
      existing.yearsPlayed.push(row.year)
      existing.isActive = isActive
      if (matched?.id) existing.id = matched.id
    } else {
      allTimeMap.set(row.member_name, {
        name: row.member_name,
        totalWon: row.total_won ?? 0,
        totalShares: row.shares ?? 0,
        yearsPlayed: [row.year],
        isActive,
        id: matched?.id,
      })
    }
  }
  const allTimeRankings: AllTimeEntry[] = Array.from(allTimeMap.values())
    .sort((a, b) => b.totalWon - a.totalWon)

  // Aggregate team rankings by team name
  const teamMap = new Map<string, TeamEntry>()
  for (const row of historicalRaw ?? []) {
    if ((row.shares ?? 0) === 0) continue
    const existing = teamMap.get(row.team)
    if (existing) {
      existing.thirteenRunWeeks += row.shares ?? 0
      existing.totalPaidOut += row.total_won ?? 0
      if (!existing.yearsWon.includes(row.year)) existing.yearsWon.push(row.year)
    } else {
      teamMap.set(row.team, {
        team: row.team,
        thirteenRunWeeks: row.shares ?? 0,
        totalPaidOut: row.total_won ?? 0,
        yearsWon: [row.year],
      })
    }
  }
  const teamRankings: TeamEntry[] = Array.from(teamMap.values())
    .sort((a, b) => b.thirteenRunWeeks - a.thirteenRunWeeks)

  // Season Archive years derived from historicalRaw (already fetched above)
  const archiveYears = [...new Set((historicalRaw ?? []).map((r) => r.year))].sort(
    (a, b) => a - b
  )
  const mostRecentArchiveYear = archiveYears.length > 0 ? archiveYears[archiveYears.length - 1] : null

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture text-white">
      {winCelebrationPayouts.length > 0 && (
        <WinCelebration payouts={winCelebrationPayouts} />
      )}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <LeagueDashboardHeader
          leagueName={league.name}
          slug={slug}
          role={role}
        />

        {/* Pot Breakdown */}
        <PotBreakdown
          members={(members ?? []).filter((m) => m.is_active !== false)}
          payments={currentWeekPayments ?? []}
          currentWeek={currentWeekNumber}
          weeklyBuyIn={league.weekly_buy_in ?? 10}
          potTotal={potTotalForDisplay}
          weekWinners={thisWeekWinners}
          settledPayouts={currentWeekPayouts?.map((p) => ({
            member_id: p.member_id,
            payout_amount: p.payout_amount,
          })) ?? []}
          sweatPct={sweatPct}
          totalGamesLeft={totalGamesLeft}
        />

        <LeagueTabs
          historicalRaw={historicalRaw ?? []}
          allTimeRankings={allTimeRankings}
          teamRankings={teamRankings}
          slug={slug}
          currentYear={seasonYear}
          calendarYear={calendarYear}
          alumniNamesLower={alumniNamesLower}
        >
          {/* Leaderboard */}
          <section>
            <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
            <LeaderboardTable rows={leaderboardRows} slug={slug} />
          </section>

          {/* ── Explainer Zone — between live dashboard and lore ── */}
          <LeagueExplainer />

          {/* 13-Run History — recent 10 games */}
          {thirteenHistory && thirteenHistory.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold"><span className="text-[#39ff14]">13</span>-Run History</h2>
                <span className="text-xs text-gray-400 font-mono">most recent</span>
              </div>
              <div className="space-y-1.5 max-w-3xl">
                {thirteenHistory.slice(0, 10).map((result) => (
                  <div
                    key={`${result.game_date}-${result.home_team}`}
                    className="flex items-center gap-2 text-xs rounded bg-[#111] border border-gray-900 px-3 py-2"
                  >
                    <span className="text-[#39ff14] font-bold font-mono shrink-0">13</span>
                    <span className="text-gray-400 font-mono shrink-0">{result.game_date}</span>
                    <span className="text-white truncate">
                      <span className="font-bold text-[#39ff14]">{result.winning_team}</span>
                      {' scored '}
                      <span className="text-[#39ff14] font-bold">13</span>
                      {' — '}
                      {result.away_team}@{result.home_team}{' '}
                      ({result.away_score}–{result.home_score})
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 13-Run Lore — franchise / day / home-away / month breakdowns */}
          {thirteenHistory && thirteenHistory.length > 0 && (
            <ThirteenRunLore games={thirteenHistory} />
          )}

          {/* Footer — inside current year tab */}
          <footer className="border-t border-gray-900 pt-6 text-gray-400 text-xs space-y-2">
            <p>
              The information used here was obtained free of charge from and is copyrighted by Retrosheet.
              Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/privacy" className="hover:text-gray-500 transition-colors">Privacy Policy</a>
              <span className="text-gray-800">·</span>
              <a href="/terms" className="hover:text-gray-500 transition-colors">Terms of Use</a>
              <span className="text-gray-800">·</span>
              <span className="text-gray-800">Built by Red Crow Labs · South Brooklyn</span>
            </div>
          </footer>
        </LeagueTabs>

        {/* Season Archive */}
        {archiveYears.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-gray-500 text-sm">📅 Season Archive:</span>
            {archiveYears.map((y) => (
              <Link
                key={y}
                href={`/league/${slug}/history/${y}`}
                className={
                  y === mostRecentArchiveYear
                    ? 'px-3 py-1 rounded-full text-sm font-bold bg-[#39ff14] text-black'
                    : 'px-3 py-1 rounded-full text-sm bg-[#1a1a1a] text-gray-400 border border-[#333] hover:text-white'
                }
              >
                {y}
              </Link>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
