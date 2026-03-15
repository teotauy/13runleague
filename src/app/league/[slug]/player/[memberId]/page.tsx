import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; memberId: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, memberId } = await params
  const supabase = createServiceClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  const { data: member } = await supabase
    .from('members')
    .select('name, assigned_team')
    .eq('id', memberId)
    .single()

  if (!member) return { title: 'Player — 13 Run League' }

  const { data: history } = await supabase
    .from('historical_results')
    .select('total_won, shares')
    .eq('member_name', member.name)
    .eq('league_id', league?.id ?? '')

  const totalWon = (history ?? []).reduce((s, r) => s + (r.total_won ?? 0), 0)
  const totalWins = (history ?? []).reduce((s, r) => s + (r.shares ?? 0), 0)

  const title = `${member.name} — 13 Run League`
  const subtitle = totalWins > 0
    ? `${totalWins} career win${totalWins !== 1 ? 's' : ''} · $${totalWon.toLocaleString()} earned`
    : `${member.assigned_team} · No wins yet`

  const ogUrl = `/api/og?title=${encodeURIComponent(member.name)}&subtitle=${encodeURIComponent(subtitle)}`

  return {
    title,
    description: subtitle,
    openGraph: {
      title,
      description: subtitle,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description: subtitle, images: [ogUrl] },
  }
}

export default async function PlayerPage({ params }: Props) {
  const { slug, memberId } = await params

  // Auth check - defense in depth (middleware will redirect, but check here too)
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!authCookie) {
    notFound()
  }

  const supabase = createServiceClient()

  // Get league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (leagueError || !league) notFound()

  // Get member
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, name, assigned_team')
    .eq('id', memberId)
    .eq('league_id', league.id)
    .single()

  if (memberError || !member) notFound()

  // Get all historical results for this member
  const { data: historical } = await supabase
    .from('historical_results')
    .select('*')
    .eq('league_id', league.id)
    .eq('member_name', member.name)
    .order('year', { ascending: false })

  // Get ALL league historical results (for per-year leader calculations)
  const { data: allLeagueHistorical } = await supabase
    .from('historical_results')
    .select('member_name, year, total_won, shares')
    .eq('league_id', league.id)

  // Get active streak (2026 only)
  const { data: activeStreak } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, closest_miss_score, closest_miss_date')
    .eq('member_id', memberId)
    .single()

  // Deduplicate by year+team (safety net in case seed was run multiple times)
  const seen = new Set<string>()
  const deduped = (historical ?? []).filter((row) => {
    const key = `${row.year}-${row.team}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Calculate career stats
  const totalWon = deduped.reduce((sum, r) => sum + (r.total_won ?? 0), 0)
  const totalWins = deduped.reduce((sum, r) => sum + (r.shares ?? 0), 0)
  const yearsPlayed = [...new Set(deduped.map((r) => r.year))].sort((a, b) => b - a)

  const careerStats = { totalWon, totalWins, yearsPlayed }

  // ── Per-year league leaders ──────────────────────────────────────────────────
  type YearLeader = {
    topEarnerName: string
    topEarnerAmount: number
    topWinnerName: string
    topWinnerCount: number
    topWarName: string       // highest $/win ratio (WAR = total_won / shares)
    topWarValue: number
  }
  const yearLeadersMap = new Map<number, YearLeader>()

  for (const row of allLeagueHistorical ?? []) {
    const ex = yearLeadersMap.get(row.year)
    const war = (row.shares ?? 0) > 0 ? (row.total_won ?? 0) / (row.shares ?? 1) : 0
    if (!ex) {
      yearLeadersMap.set(row.year, {
        topEarnerName: row.member_name,
        topEarnerAmount: row.total_won ?? 0,
        topWinnerName: row.member_name,
        topWinnerCount: row.shares ?? 0,
        topWarName: (row.shares ?? 0) > 0 ? row.member_name : '',
        topWarValue: war,
      })
    } else {
      if ((row.total_won ?? 0) > ex.topEarnerAmount) {
        ex.topEarnerName = row.member_name
        ex.topEarnerAmount = row.total_won ?? 0
      }
      if ((row.shares ?? 0) > ex.topWinnerCount) {
        ex.topWinnerName = row.member_name
        ex.topWinnerCount = row.shares ?? 0
      }
      if (war > ex.topWarValue) {
        ex.topWarName = row.member_name
        ex.topWarValue = war
      }
    }
  }

  // Check which years this member led the league
  const ledInMoney: number[] = []
  const ledInWins: number[] = []
  const ledInWar: number[] = []
  for (const [year, stats] of yearLeadersMap) {
    if (stats.topEarnerName === member.name && stats.topEarnerAmount > 0)
      ledInMoney.push(year)
    if (stats.topWinnerName === member.name && stats.topWinnerCount > 0)
      ledInWins.push(year)
    if (stats.topWarName === member.name && stats.topWarValue > 0)
      ledInWar.push(year)
  }
  ledInMoney.sort((a, b) => a - b)
  ledInWins.sort((a, b) => a - b)
  ledInWar.sort((a, b) => a - b)

  // All years the league has ever played (derived dynamically from historical_results)
  // When a new season gets seeded, Ironman automatically requires that year too
  const allLeagueYears = [...new Set((allLeagueHistorical ?? []).map((r) => r.year))].sort(
    (a, b) => a - b
  )
  const isIronman =
    allLeagueYears.length > 0 && allLeagueYears.every((y) => yearsPlayed.includes(y))

  const hasAchievements = ledInMoney.length > 0 || ledInWins.length > 0 || ledInWar.length > 0 || isIronman

  // Season circles (chronological)
  const seasonCircles = [...deduped]
    .sort((a, b) => a.year - b.year)
    .map((row) => {
      const ldr = yearLeadersMap.get(row.year)
      return {
        year: row.year,
        team: row.team as string,
        wins: (row.shares ?? 0) as number,
        totalWon: (row.total_won ?? 0) as number,
        ledMoney: ldr?.topEarnerName === member.name && (ldr?.topEarnerAmount ?? 0) > 0,
        ledWins: ldr?.topWinnerName === member.name && (ldr?.topWinnerCount ?? 0) > 0,
      }
    })

  // Group historical by year for the table
  const historicalByYear = deduped.map((row) => ({
    year: row.year,
    team: row.team,
    wins: row.shares,
    totalWon: row.total_won,
    weekWins: row.week_wins,
    ledMoney: yearLeadersMap.get(row.year)?.topEarnerName === member.name &&
              (yearLeadersMap.get(row.year)?.topEarnerAmount ?? 0) > 0,
    ledWins:  yearLeadersMap.get(row.year)?.topWinnerName === member.name &&
              (yearLeadersMap.get(row.year)?.topWinnerCount ?? 0) > 0,
  }))

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-8">
          <a
            href={`/league/${slug}`}
            className="text-gray-600 text-sm hover:text-gray-400 mb-4 block"
          >
            ← Back to {league.name}
          </a>

          {/* Name (left) + Achievement badges (right) */}
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight">
                <span className="text-[#39ff14]">{member.name}</span>
              </h1>
              <p className="text-gray-500">
                <span className="px-2 py-1 rounded bg-gray-800 text-gray-200">
                  {member.assigned_team}
                </span>
              </p>
            </div>

            {/* Achievement badges — like BBRef awards grid */}
            {hasAchievements && (
              <div className="flex flex-wrap gap-2 justify-end max-w-xs">
                {ledInMoney.map((year) => (
                  <span
                    key={`money-${year}`}
                    className="px-3 py-1 rounded text-sm font-bold bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/40 whitespace-nowrap"
                    title={`Led the league in earnings in ${year}`}
                  >
                    💰 Top Earner {year}
                  </span>
                ))}
                {ledInWins.map((year) => (
                  <span
                    key={`wins-${year}`}
                    className="px-3 py-1 rounded text-sm font-bold bg-blue-950 text-blue-300 border border-blue-800 whitespace-nowrap"
                    title={`Led the league in winning weeks in ${year}`}
                  >
                    🏆 Most Wins {year}
                  </span>
                ))}
                {ledInWar.map((year) => (
                  <span
                    key={`war-${year}`}
                    className="px-3 py-1 rounded text-sm font-bold bg-violet-950 text-violet-300 border border-violet-800 whitespace-nowrap"
                    title={`Best $/win ratio in the league in ${year} (solo wins > split wins)`}
                  >
                    ⚡ Top $/Win {year}
                  </span>
                ))}
                {isIronman && (
                  <span
                    className="px-3 py-1 rounded text-sm font-bold bg-amber-950 text-amber-400 border border-amber-800 whitespace-nowrap"
                    title={`Played all ${allLeagueYears.length} seasons (${allLeagueYears[0]}–${allLeagueYears[allLeagueYears.length - 1]})`}
                  >
                    🏟️ Ironman
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Season circles — like BBRef jersey-number badges */}
          {seasonCircles.length > 0 && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-3">
                {seasonCircles.map(({ year, team, wins, totalWon: won, ledMoney, ledWins }) => (
                  <div key={year} className="flex flex-col items-center gap-1">
                    <div
                      title={
                        wins > 0
                          ? `${year} ${team}: ${wins}W — $${won.toLocaleString()}${ledMoney ? ' 💰 Led league in $$$' : ledWins ? ' 🏆 Led league in wins' : ''}`
                          : `${year} ${team}: no wins`
                      }
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-[11px] font-bold font-mono border-2 transition-colors ${
                        ledMoney
                          ? 'border-[#39ff14] text-[#39ff14] bg-[#39ff14]/10'
                          : ledWins
                          ? 'border-blue-400 text-blue-300 bg-blue-950/40'
                          : wins > 0
                          ? 'border-gray-500 text-white bg-gray-800'
                          : 'border-gray-800 text-gray-600 bg-[#0a0a0a]'
                      }`}
                    >
                      {team}
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono">{year}</div>
                  </div>
                ))}
              </div>
              {/* Circle legend */}
              <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-gray-700 font-mono">
                <span><span className="text-[#39ff14]">●</span> Led league in $$$</span>
                <span><span className="text-blue-400">●</span> Led league in wins</span>
                <span><span className="text-gray-500">●</span> Had wins</span>
                <span><span className="text-gray-800">○</span> No wins</span>
              </div>
            </div>
          )}
        </header>

        {/* ── Career Stats ───────────────────────────────────────────────────── */}
        <section className="rounded-lg border border-gray-800 bg-[#111] p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Career Stats</h2>
          <div className="grid grid-cols-3 gap-6">
            <StatBlock label="Total Won" value={`$${careerStats.totalWon.toLocaleString()}`} />
            <StatBlock label="Winning Weeks" value={String(careerStats.totalWins)} />
            <StatBlock label="Seasons Played" value={String(careerStats.yearsPlayed.length)} />
          </div>
        </section>

        {/* ── Active Streak (2026) ───────────────────────────────────────────── */}
        {activeStreak && (
          <section className="rounded-lg border border-gray-800 bg-[#111] p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Current Season (2026)</h2>
            <div className="grid grid-cols-3 gap-6">
              <StatBlock label="Current Streak" value={String(activeStreak.current_streak ?? 0)} />
              <StatBlock label="Longest Streak" value={String(activeStreak.longest_streak ?? 0)} />
              {activeStreak.closest_miss_score !== null && (
                <StatBlock
                  label="Closest Miss"
                  value={`${activeStreak.closest_miss_score} runs`}
                  subtitle={activeStreak.closest_miss_date ? `(${activeStreak.closest_miss_date})` : undefined}
                />
              )}
            </div>
          </section>
        )}

        {/* ── By Season table ────────────────────────────────────────────────── */}
        {historicalByYear.length > 0 && (
          <section className="rounded-lg border border-gray-800 bg-[#111] p-6">
            <h2 className="text-lg font-bold mb-4">By Season</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800 text-left">
                    <th className="pb-2 pr-4">Year</th>
                    <th className="pb-2 pr-4">Team</th>
                    <th className="pb-2 pr-4">Wins</th>
                    <th className="pb-2">Total Won</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalByYear.map((row) => (
                    <tr
                      key={row.year}
                      className={`border-b border-gray-900 hover:bg-[#0a0a0a] ${
                        row.ledMoney || row.ledWins ? 'bg-[#0d120a]' : ''
                      }`}
                    >
                      <td className="py-3 pr-4 text-white font-semibold">
                        {row.year}
                        {row.ledMoney && (
                          <span className="ml-1.5 text-[#39ff14]" title="Led league in earnings this season">
                            💰
                          </span>
                        )}
                        {row.ledWins && !row.ledMoney && (
                          <span className="ml-1.5 text-blue-400" title="Led league in wins this season">
                            🏆
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200">
                          {row.team}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{row.wins}</td>
                      <td className="py-3 text-[#39ff14] font-bold">
                        ${row.totalWon.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function StatBlock({
  label,
  value,
  subtitle,
}: {
  label: string
  value: string
  subtitle?: string
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-black text-[#39ff14]">{value}</div>
      {subtitle && <div className="text-xs text-gray-600 mt-1">{subtitle}</div>}
    </div>
  )
}
