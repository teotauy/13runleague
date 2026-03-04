import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; memberId: string }>
}

export const dynamic = 'force-dynamic'

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

  const careerStats = {
    totalWon,
    totalWins,
    yearsPlayed,
  }

  // Group historical by year for display
  const historicalByYear = deduped.map((row) => ({
    year: row.year,
    team: row.team,
    wins: row.shares,
    totalWon: row.total_won,
    weekWins: row.week_wins,
  }))

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <a href={`/league/${slug}`} className="text-gray-600 text-sm hover:text-gray-400 mb-4 block">
            ← Back to {league.name}
          </a>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-[#39ff14]">{member.name}</span>
            </h1>
            <p className="text-gray-500">
              <span className="px-2 py-1 rounded bg-gray-800 text-gray-200">{member.assigned_team}</span>
            </p>
          </div>
        </header>

        {/* Career Stats */}
        <section className="rounded-lg border border-gray-800 bg-[#111] p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Career Stats</h2>
          <div className="grid grid-cols-3 gap-6">
            <StatBlock label="Total Won" value={`$${careerStats.totalWon.toLocaleString()}`} />
            <StatBlock label="Winning Weeks" value={String(careerStats.totalWins)} />
            <StatBlock label="Seasons Played" value={String(careerStats.yearsPlayed.length)} />
          </div>
        </section>

        {/* Active Streak (2026 only) */}
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

        {/* Yearly Breakdown */}
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
                    <tr key={row.year} className="border-b border-gray-900 hover:bg-[#0a0a0a]">
                      <td className="py-3 pr-4 text-white font-semibold">{row.year}</td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200">{row.team}</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{row.wins}</td>
                      <td className="py-3 text-[#39ff14] font-bold">${row.totalWon.toLocaleString()}</td>
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
