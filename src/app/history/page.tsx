import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600

export default async function HistoryPage() {
  const supabase = await createClient()

  const { data: games } = await supabase
    .from('game_results')
    .select('*')
    .eq('was_thirteen', true)
    .order('game_date', { ascending: false })
    .limit(200)

  // Group by team
  const byTeam: Record<string, typeof games> = {}
  for (const game of games ?? []) {
    const team = game.winning_team ?? 'Unknown'
    if (!byTeam[team]) byTeam[team] = []
    byTeam[team]!.push(game)
  }

  const teamsSorted = Object.entries(byTeam).sort((a, b) => b[1]!.length - a[1]!.length)

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header>
          <a href="/" className="text-gray-600 text-sm hover:text-gray-400 mb-4 inline-block">← Dashboard</a>
          <h1 className="text-4xl font-black">
            <span className="text-[#39ff14]">13</span>-Run History
          </h1>
          <p className="text-gray-500 mt-1">All recorded 13-run games by team</p>
        </header>

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {teamsSorted.map(([team, teamGames]) => (
            <div
              key={team}
              className="rounded bg-[#111] border border-gray-900 p-3 text-center"
            >
              <div className="text-xs text-gray-500 font-mono">{team}</div>
              <div className="text-2xl font-black text-[#39ff14] mt-1">
                {teamGames!.length}
              </div>
              <div className="text-[10px] text-gray-600">13-run games</div>
            </div>
          ))}
        </div>

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
                  <tr key={g.id} className="border-b border-gray-900 hover:bg-[#111]">
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

        <footer className="border-t border-gray-900 pt-6 text-gray-700 text-xs space-y-2">
          <p>
            The information used here was obtained free of charge from and is copyrighted by Retrosheet.
            Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
          </p>
          <p>
            <a
              href="https://buymeacoffee.com/colbyblack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              ☕ Buy me a coffee
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
