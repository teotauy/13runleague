import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import PastChampionsBanner, { type YearlyChampions } from '@/components/PastChampionsBanner'
import HeartbreakBoard from '@/components/HeartbreakBoard'
import DynastyTracker from '@/components/DynastyTracker'
import SiteFooter from '@/components/SiteFooter'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '13-Run History — All-time MLB Records',
  description: 'Every time an MLB team has scored exactly 13 runs, from 1877 to today. Franchise rankings, heartbreak board, dynasty tracker.',
  openGraph: {
    title: '13-Run History — All-time MLB Records',
    description: 'Every time an MLB team has scored exactly 13 runs, from 1877 to today.',
    images: [{ url: '/api/og?title=13-Run+History&subtitle=Every+13-run+game+since+1877', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '13-Run History — All-time MLB Records',
    images: ['/api/og?title=13-Run+History&subtitle=Every+13-run+game+since+1877'],
  },
}

export default async function HistoryPage() {
  const supabase = createServiceClient()

  const { data: games } = await supabase
    .from('game_results')
    .select('*')
    .eq('was_thirteen', true)
    .order('game_date', { ascending: false })
    .limit(200)

  // Fetch heartbreak games — was_thirteen + one team scored exactly 12
  const { data: heartbreakGames } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, home_score, away_score, winning_team')
    .eq('was_thirteen', true)
    .or('home_score.eq.12,away_score.eq.12')
    .order('game_date', { ascending: false })

  // Fetch historical results for champions banner
  const { data: historicalData } = await supabase
    .from('historical_results')
    .select('member_name, team, year, total_won, shares')
    .order('year', { ascending: false })

  // Group by team
  const byTeam: Record<string, typeof games> = {}
  for (const game of games ?? []) {
    const team = game.winning_team ?? 'Unknown'
    if (!byTeam[team]) byTeam[team] = []
    byTeam[team]!.push(game)
  }

  const teamsSorted = Object.entries(byTeam).sort((a, b) => b[1]!.length - a[1]!.length)

  // Organize historical data into yearly champions
  const yearlyChampionsMap = new Map<number, Array<{ memberName: string; team: string; totalWon: number; shares: number }>>()
  for (const record of historicalData ?? []) {
    if (!yearlyChampionsMap.has(record.year)) {
      yearlyChampionsMap.set(record.year, [])
    }
    yearlyChampionsMap.get(record.year)!.push({
      memberName: record.member_name,
      team: record.team,
      totalWon: record.total_won ?? 0,
      shares: record.shares ?? 0,
    })
  }

  // Convert to YearlyChampions format (all winners, ranked by total_won)
  const yearlyChampions: YearlyChampions[] = Array.from(yearlyChampionsMap.entries())
    .map(([year, members]) => {
      const sorted = members.sort((a, b) => b.totalWon - a.totalWon)
      return {
        year,
        champions: sorted.map((member, idx) => ({
          rank: (idx + 1) as 1 | 2 | 3,
          memberName: member.memberName,
          team: member.team,
          totalWon: member.totalWon,
          year,
        })),
      }
    })
    .sort((a, b) => b.year - a.year)

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header>
          <a href="/" className="text-gray-600 text-sm hover:text-gray-400 mb-4 inline-block">← Dashboard</a>
          <h1 className="text-4xl font-black">
            <span className="text-[#39ff14]">13</span>-Run History
          </h1>
          <p className="text-gray-500 mt-1">All recorded 13-run games by team</p>
        </header>

        {/* Past Champions Banner */}
        <PastChampionsBanner yearlyChampions={yearlyChampions} />

        {/* Dynasty Tracker */}
        {historicalData && historicalData.length > 0 && (
          <DynastyTracker data={historicalData} />
        )}

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {teamsSorted.map(([team, teamGames]) => (
            <div
              key={team}
              className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-3 text-center"
            >
              <div className="text-xs text-gray-500 font-mono">{team}</div>
              <div className="text-2xl font-black text-[#39ff14] mt-1">
                {teamGames!.length}
              </div>
              <div className="text-[10px] text-gray-600">13-run games</div>
            </div>
          ))}
        </div>

        {/* Heartbreak Board */}
        <HeartbreakBoard games={heartbreakGames ?? []} />

        {/* Full log */}
        <section>
          <h2 className="text-lg font-bold mb-4">Full Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-left">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Matchup</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2">13-Run Team</th>
                </tr>
              </thead>
              <tbody>
                {(games ?? []).map((g) => (
                  <tr key={g.id} className="border-b border-gray-900 hover:bg-white/[0.03]">
                    <td className="py-2 pr-4 text-gray-400">{g.game_date}</td>
                    <td className="py-2 pr-4 text-gray-300">
                      <a
                        href={`/matchup/${g.away_team}/${g.home_team}`}
                        className="hover:text-white transition-colors"
                      >
                        {g.away_team} @ {g.home_team}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-gray-300">
                      {g.away_score}–{g.home_score}
                    </td>
                    <td className="py-2 text-[#39ff14] font-bold">{g.winning_team}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  )
}
