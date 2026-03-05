import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { fetchTodaySchedule, fetchTeamSeasonStats, currentSeason } from '@/lib/mlb'
import { buildLambda, calculateThirteenProbability } from '@/lib/probability'
import { getWeekNumber, getSeasonYear, getWinnersForWeek } from '@/lib/pot'
import RankingsTabs, { type AllTimeEntry, type TeamEntry } from '@/components/RankingsTabs'
import PotBreakdown from '@/components/PotBreakdown'
import LeaderboardTable, { type LeaderboardRow } from '@/components/LeaderboardTable'
import LeagueDashboardHeader from '@/components/LeagueDashboardHeader'

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
    .select('id, name, assigned_team, phone')
    .eq('league_id', league.id)
    .order('name')

  const { data: streaks } = await supabase
    .from('streaks')
    .select('member_id, current_streak, longest_streak, closest_miss_score, closest_miss_date')

  const { data: thirteenHistory } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, winning_team, home_score, away_score')
    .eq('was_thirteen', true)
    .order('game_date', { ascending: false })
    .limit(50)

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
    .select('member_name, team, year, total_won, shares')
    .eq('league_id', league.id)

  // Aggregate all-time rankings by member
  const allTimeMap = new Map<string, AllTimeEntry>()
  for (const row of historicalRaw ?? []) {
    const existing = allTimeMap.get(row.member_name)
    if (existing) {
      existing.totalWon += row.total_won ?? 0
      existing.totalShares += row.shares ?? 0
      existing.yearsPlayed.push(row.year)
    } else {
      allTimeMap.set(row.member_name, {
        name: row.member_name,
        totalWon: row.total_won ?? 0,
        totalShares: row.shares ?? 0,
        yearsPlayed: [row.year],
        isActive: !!(members ?? []).find((m) => m.name === row.member_name),
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
    ?.filter((s) => s.closest_miss_score !== null)
    .sort((a, b) => {
      const aDist = Math.abs((a.closest_miss_score ?? 0) - 13)
      const bDist = Math.abs((b.closest_miss_score ?? 0) - 13)
      if (aDist !== bDist) return aDist - bDist
      return (b.closest_miss_date ?? '').localeCompare(a.closest_miss_date ?? '')
    })
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <LeagueDashboardHeader
          leagueName={league.name}
          slug={slug}
          role={role}
        />

        {/* Pot Breakdown */}
        <PotBreakdown
          members={members ?? []}
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

        {/* Leaderboard */}
        <section>
          <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
          <LeaderboardTable rows={leaderboardRows} slug={slug} />
        </section>

        {/* 13-Run History */}
        {thirteenHistory && thirteenHistory.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">13-Run History in this League</h2>
            <div className="space-y-2">
              {thirteenHistory.map((result) => (
                <div
                  key={`${result.game_date}-${result.home_team}`}
                  className="flex items-center gap-3 text-sm rounded bg-[#111] border border-gray-900 px-4 py-2"
                >
                  <span className="text-[#39ff14] font-bold text-lg">13</span>
                  <span className="text-gray-400 font-mono">{result.game_date}</span>
                  <span className="text-white">
                    <span className="font-bold text-[#39ff14]">{result.winning_team}</span>
                    {' scored 13 — '}
                    {result.away_team} @ {result.home_team}{' '}
                    ({result.away_score}–{result.home_score})
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Closest Miss Board */}
        {closestMisses && closestMisses.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">Closest Miss Board 💔</h2>
            <div className="space-y-2">
              {closestMisses.map((s) => {
                const member = members?.find((m) => m.id === s.member_id)
                const diff = Math.abs((s.closest_miss_score ?? 0) - 13)
                return (
                  <div
                    key={s.member_id}
                    className="flex items-center gap-3 text-sm rounded bg-[#111] border border-gray-900 px-4 py-2"
                  >
                    {s.closest_miss_date && (
                      <span className="text-gray-500 font-mono">{fmtMD(s.closest_miss_date)}</span>
                    )}
                    <span className="text-amber-400 font-bold">{s.closest_miss_score} runs</span>
                    <span className="text-white">{member?.name ?? '—'} ({member?.assigned_team})</span>
                    <span className="text-gray-600 ml-auto">— {diff === 1 ? 'one run away!' : `${diff} runs away`}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* All-Time & Team Rankings Tabs */}
        {(allTimeRankings.length > 0 || teamRankings.length > 0) && (
          <section>
            <RankingsTabs allTime={allTimeRankings} teams={teamRankings} />
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-900 pt-6 text-gray-700 text-xs">
          <p>
            The information used here was obtained free of charge from and is copyrighted by Retrosheet.
            Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
          </p>
        </footer>
      </div>
    </main>
  )
}

/** "2025-04-05" → "4/5" */
function fmtMD(dateStr: string): string {
  const parts = dateStr.split('-')
  return `${parseInt(parts[1])}/${parseInt(parts[2])}`
}
