import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchTodaySchedule, fetchTeamSeasonStats, currentSeason } from '@/lib/mlb'
import { buildLambda, calculateThirteenProbability } from '@/lib/probability'
import { getWeekNumber, getSeasonYear, getWinnersForWeek } from '@/lib/pot'
import RankingsTabs, { type AllTimeEntry, type TeamEntry } from '@/components/RankingsTabs'
import PotBreakdown from '@/components/PotBreakdown'
import LeaderboardTable, { type LeaderboardRow } from '@/components/LeaderboardTable'
import LeagueDashboardHeader from '@/components/LeagueDashboardHeader'
import WinCelebration, { type WinCelebrationPayout } from '@/components/WinCelebration'
import LeagueTabs from '@/components/LeagueTabs'
import LeagueExplainer from '@/components/LeagueExplainer'
import ThirteenRunLore from '@/components/ThirteenRunLore'

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
    .select('member_id, current_streak, longest_streak, closest_miss_score, closest_miss_date')

  // Fetch ALL 13-run games — small dataset, used for both the recent list and lore stats
  const { data: thirteenHistory } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, winning_team, home_score, away_score')
    .eq('was_thirteen', true)
    .order('game_date', { ascending: false })

  const games = await fetchTodaySchedule()

  // Enrich each member with today's game info and probability
  const enrichedMembers = await Promise.all(
    (members ?? []).map(async (member) => {
      const teamAbbr = member.assigned_team.toUpperCase()

      const todayGame = games.find(
        (g) =>
          g.teams.home.team.abbreviation === teamAbbr ||
          g.teams.away.team.abbreviation === teamAbbr
      )

      const streak = streaks?.find((s) => s.member_id === member.id)

      if (!todayGame) {
        return { member, streak, todayGame: null, todayProb: null }
      }

      const isHome = todayGame.teams.home.team.abbreviation === teamAbbr
      const teamId = isHome
        ? todayGame.teams.home.team.id
        : todayGame.teams.away.team.id

      const stats = await fetchTeamSeasonStats(teamId, season)
      const lambda = buildLambda({
        baseRunsPerGame: stats.runsPerGame,
        gamesPlayed: stats.gamesPlayed,
        venueId: String(todayGame.venue.id),
      })
      const prob = calculateThirteenProbability(lambda.pitcherAdjusted)

      return { member, streak, todayGame, todayProb: prob }
    })
  )

  // Current week data
  const today = new Date()
  const currentWeekNumber = getWeekNumber(today)
  const seasonYear = getSeasonYear(today)

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

  // Most recent payout — for win celebration banner (show within 72 hours)
  const { data: recentPayout } = await supabase
    .from('payouts')
    .select('id, member_id, week_number, year, winning_team, payout_amount, game_date, created_at')
    .eq('year', seasonYear)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let winCelebrationPayout: WinCelebrationPayout | null = null
  if (recentPayout?.created_at) {
    const createdAt = new Date(recentPayout.created_at)
    const hoursSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince <= 72) {
      const memberRecord = (members ?? []).find((m) => m.id === recentPayout.member_id)
      if (memberRecord) {
        winCelebrationPayout = {
          id: recentPayout.id,
          member_name: memberRecord.name,
          week_number: recentPayout.week_number,
          year: recentPayout.year,
          winning_team: recentPayout.winning_team,
          payout_amount: recentPayout.payout_amount,
          game_date: recentPayout.game_date ?? null,
        }
      }
    }
  }

  // All payouts this season — for leaderboard Wins + Won columns
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
      return { member, streak, todayGame, todayProb, seasonWins: ss.wins, seasonWon: ss.totalWon }
    }
  )

  // Historical results for rankings tabs
  const { data: historicalRaw } = await supabase
    .from('historical_results')
    .select('member_name, team, year, total_won, shares, week_wins')
    .eq('league_id', league.id)

  // Build a case-insensitive name → member map for robust matching
  const memberByName = new Map<string, { id: string; name: string }>()
  for (const m of members ?? []) {
    memberByName.set(m.name.trim().toLowerCase(), { id: m.id, name: m.name })
  }

  // Aggregate all-time rankings by member
  const allTimeMap = new Map<string, AllTimeEntry>()
  for (const row of historicalRaw ?? []) {
    const existing = allTimeMap.get(row.member_name)
    if (existing) {
      existing.totalWon += row.total_won ?? 0
      existing.totalShares += row.shares ?? 0
      existing.yearsPlayed.push(row.year)
    } else {
      const matched = memberByName.get(row.member_name.trim().toLowerCase())
      allTimeMap.set(row.member_name, {
        name: row.member_name,
        totalWon: row.total_won ?? 0,
        totalShares: row.shares ?? 0,
        yearsPlayed: [row.year],
        isActive: !!matched,
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

  // Closest misses — primary: distance to 13; tie-break: most recent date first
  const closestMisses = streaks
    ?.filter((s) => s.closest_miss_score !== null && (s.closest_miss_score ?? 0) >= 8)
    .sort((a, b) => {
      const aDist = Math.abs((a.closest_miss_score ?? 0) - 13)
      const bDist = Math.abs((b.closest_miss_score ?? 0) - 13)
      if (aDist !== bDist) return aDist - bDist
      return (b.closest_miss_date ?? '').localeCompare(a.closest_miss_date ?? '')
    })
    .slice(0, 5)

  // Season Archive years derived from historicalRaw (already fetched above)
  const archiveYears = [...new Set((historicalRaw ?? []).map((r) => r.year))].sort(
    (a, b) => a - b
  )
  const mostRecentArchiveYear = archiveYears.length > 0 ? archiveYears[archiveYears.length - 1] : null

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture text-white">
      {winCelebrationPayout && (
        <WinCelebration payout={winCelebrationPayout} />
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
          potTotal={league.pot_total ?? 0}
          weekWinners={thisWeekWinners}
          settledPayouts={currentWeekPayouts?.map((p) => ({
            member_id: p.member_id,
            payout_amount: p.payout_amount,
          })) ?? []}
        />

        <LeagueTabs
          historicalRaw={historicalRaw ?? []}
          allTimeRankings={allTimeRankings}
          teamRankings={teamRankings}
          slug={slug}
          currentYear={seasonYear}
        >
          {/* Leaderboard */}
          <section>
            <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
            <LeaderboardTable rows={leaderboardRows} slug={slug} />
          </section>

          {/* ── Explainer Zone — between live dashboard and lore ── */}
          <LeagueExplainer />

          {/* 13-Run History + Closest Miss Board — side by side */}
          {thirteenHistory && thirteenHistory.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* 13-Run History — recent 10 games */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-bold"><span className="text-[#39ff14]">13</span>-Run History</h2>
                  <span className="text-xs text-gray-600 font-mono">most recent</span>
                </div>
                <div className="space-y-1.5">
                  {thirteenHistory.slice(0, 10).map((result) => (
                    <div
                      key={`${result.game_date}-${result.home_team}`}
                      className="flex items-center gap-2 text-xs rounded bg-[#111] border border-gray-900 px-3 py-2"
                    >
                      <span className="text-[#39ff14] font-bold font-mono shrink-0">13</span>
                      <span className="text-gray-600 font-mono shrink-0">{result.game_date}</span>
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

              {/* Closest Miss Board */}
              <section>
                <h2 className="text-lg font-bold mb-4">Closest Miss Board 💔</h2>
                {closestMisses && closestMisses.length > 0 ? (
                  <div className="space-y-1.5">
                    {closestMisses.map((s) => {
                      const member = members?.find((m) => m.id === s.member_id)
                      const diff = Math.abs((s.closest_miss_score ?? 0) - 13)
                      return (
                        <div
                          key={s.member_id}
                          className="flex items-center gap-2 text-xs rounded bg-[#111] border border-gray-900 px-3 py-2"
                        >
                          {s.closest_miss_date && (
                            <span className="text-gray-500 font-mono shrink-0">{fmtMD(s.closest_miss_date)}</span>
                          )}
                          <span className="text-amber-400 font-bold shrink-0">{s.closest_miss_score} runs</span>
                          <span className="text-white truncate">{member?.name ?? '—'} ({member?.assigned_team})</span>
                          <span className="text-gray-600 ml-auto shrink-0 text-[10px]">
                            {diff === 1 ? '1 away!' : `${diff} away`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-gray-700 text-xs">No near-misses recorded yet.</div>
                )}
              </section>
            </div>
          )}

          {/* 13-Run Lore — franchise / day / home-away / month breakdowns */}
          {thirteenHistory && thirteenHistory.length > 0 && (
            <ThirteenRunLore games={thirteenHistory} />
          )}

          {/* Footer — inside current year tab */}
          <footer className="border-t border-gray-900 pt-6 text-gray-700 text-xs space-y-2">
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

/** "2025-04-05" → "4/5" */
function fmtMD(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`
}
