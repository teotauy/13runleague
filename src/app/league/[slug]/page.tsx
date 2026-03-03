import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { fetchTodaySchedule, fetchTeamSeasonStats, currentSeason } from '@/lib/mlb'
import { buildLambda, calculateThirteenProbability } from '@/lib/probability'
import RankingsTabs, { type AllTimeEntry, type TeamEntry } from '@/components/RankingsTabs'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LeagueDashboard({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceClient()
  const season = currentSeason()

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

  const weeksPlayed = Math.ceil(
    (league.pot_total ?? 0) / ((members?.length ?? 1) * (league.weekly_buy_in ?? 10))
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

  // Closest misses
  const closestMisses = streaks
    ?.filter((s) => s.closest_miss_score !== null)
    .sort((a, b) => {
      const aDist = Math.abs((a.closest_miss_score ?? 0) - 13)
      const bDist = Math.abs((b.closest_miss_score ?? 0) - 13)
      return aDist - bDist
    })
    .slice(0, 5)

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Header */}
        <header>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black">
                <span className="text-[#39ff14]">13</span> Run League
              </h1>
              <p className="text-gray-400 text-lg mt-1">{league.name}</p>
            </div>
            <a href="/" className="text-gray-600 text-sm hover:text-gray-400">← Public dashboard</a>
          </div>
        </header>

        {/* Pot Tracker */}
        <section className="rounded-lg border border-gray-800 bg-[#111] p-6">
          <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Pot Tracker</h2>
          <div className="grid grid-cols-3 gap-6">
            <Stat label="Current Pot" value={`$${league.pot_total ?? 0}`} highlight />
            <Stat label="Weeks Played" value={String(weeksPlayed)} />
            <Stat label="Buy-in / Week" value={`$${league.weekly_buy_in ?? 10}`} />
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-left">
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2 pr-4">Team</th>
                  <th className="pb-2 pr-4">Today</th>
                  <th className="pb-2 pr-4">P(13)</th>
                  <th className="pb-2 pr-4">Streak</th>
                  <th className="pb-2 pr-4">Best</th>
                  <th className="pb-2">Closest Miss</th>
                </tr>
              </thead>
              <tbody>
                {enrichedMembers.map(({ member, streak, todayGame, todayProb }) => (
                  <tr key={member.id} className="border-b border-gray-900 hover:bg-[#111]">
                    <td className="py-3 pr-4 text-white font-semibold">{member.name}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200">
                        {member.assigned_team}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {todayGame
                        ? `${todayGame.teams.away.team.abbreviation} @ ${todayGame.teams.home.team.abbreviation}`
                        : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {todayProb !== null ? (
                        <span
                          className="font-bold"
                          style={{ color: todayProb > 0.05 ? '#39ff14' : todayProb > 0.02 ? '#f59e0b' : '#9ca3af' }}
                        >
                          {(todayProb * 100).toFixed(2)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{streak?.current_streak ?? 0}W</td>
                    <td className="py-3 pr-4 text-gray-400">{streak?.longest_streak ?? 0}W</td>
                    <td className="py-3 text-gray-400">
                      {streak?.closest_miss_score !== null && streak?.closest_miss_score !== undefined
                        ? `${streak.closest_miss_score} runs${streak.closest_miss_date ? ` (${streak.closest_miss_date})` : ''}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <span className="text-amber-400 font-bold">{s.closest_miss_score}</span>
                    <span className="text-gray-400">runs</span>
                    <span className="text-white">{member?.name ?? '—'} ({member?.assigned_team})</span>
                    <span className="text-gray-500">— {diff === 1 ? 'one run away!' : `${diff} runs away`}</span>
                    {s.closest_miss_date && (
                      <span className="text-gray-600 font-mono text-xs ml-auto">{s.closest_miss_date}</span>
                    )}
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${highlight ? 'text-[#39ff14]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}
