import { TEAM_COLORS } from '@/lib/teamColors'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'All MLB Teams — 13 Run League',
  description: 'How often has your team scored exactly 13 runs? Explore 13-run history for all 30 MLB franchises.',
}

interface TeamStat {
  abbr: string
  name: string
  primaryColor: string
  total: number
}

export default async function TeamsIndexPage() {
  const supabase = await createServiceClient()

  // Count 13-run games per team (as either home or away scorer)
  const { data: rows } = await supabase
    .from('game_results')
    .select('home_team, away_team, home_score, away_score')
    .eq('was_thirteen', true)

  // Tally counts
  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    if (row.home_score === 13) counts[row.home_team] = (counts[row.home_team] ?? 0) + 1
    if (row.away_score === 13) counts[row.away_team] = (counts[row.away_team] ?? 0) + 1
  }

  const teams: TeamStat[] = Object.entries(TEAM_COLORS)
    .map(([abbr, tc]) => ({
      abbr,
      name: tc.name,
      primaryColor: tc.primaryColor,
      total: counts[abbr] ?? 0,
    }))
    .sort((a, b) => b.total - a.total)

  const max = teams[0]?.total ?? 1

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono">← Home</Link>
        <h1 className="text-2xl font-black mt-4 mb-1">All MLB Teams</h1>
        <p className="text-gray-500 text-sm">13-run games scored by franchise, all-time</p>
      </div>

      <div className="space-y-2">
        {teams.map((team) => (
          <Link
            key={team.abbr}
            href={`/teams/${team.abbr.toLowerCase()}`}
            className="flex items-center gap-4 p-3 rounded-lg border border-gray-900 hover:border-gray-700 transition-colors group"
          >
            {/* Team badge */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-black text-white"
              style={{ backgroundColor: team.primaryColor }}
            >
              {team.abbr}
            </div>

            {/* Name + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold group-hover:text-white transition-colors truncate">{team.name}</span>
                <span className="text-sm font-mono text-gray-400 ml-2 shrink-0">{team.total}</span>
              </div>
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: `${(team.total / max) * 100}%`,
                    backgroundColor: team.primaryColor,
                  }}
                />
              </div>
            </div>

            <span className="text-gray-700 group-hover:text-gray-400 transition-colors text-xs shrink-0">→</span>
          </Link>
        ))}
      </div>

      <p className="text-gray-700 text-xs mt-8 text-center">
        Based on {(rows ?? []).length.toLocaleString()} 13-run games in our database
      </p>
    </main>
  )
}
