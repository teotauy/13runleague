interface HistoricalRow {
  member_name: string
  year: number
  total_won: number
  shares: number
}

interface Props {
  data: HistoricalRow[]
}

function cellBg(wins: number): string {
  if (wins === 0) return '#0a0a0a'
  if (wins === 1) return '#0d2b0d'
  if (wins === 2) return '#165016'
  return '#1f7a1f'
}
function cellColor(wins: number): string {
  if (wins === 0) return '#374151'
  if (wins === 1) return '#4ade80'
  if (wins === 2) return '#86efac'
  return '#39ff14'
}

export default function DynastyTracker({ data }: Props) {
  if (!data || data.length === 0) return null

  // ── Aggregate by (member_name, year) ──────────────────────────────────────
  const playerYearMap = new Map<string, Map<number, { wins: number; earned: number }>>()
  const allYears = new Set<number>()

  for (const row of data) {
    allYears.add(row.year)
    if (!playerYearMap.has(row.member_name)) {
      playerYearMap.set(row.member_name, new Map())
    }
    const yearMap = playerYearMap.get(row.member_name)!
    const cur = yearMap.get(row.year) ?? { wins: 0, earned: 0 }
    cur.wins   += row.shares   ?? 0
    cur.earned += row.total_won ?? 0
    yearMap.set(row.year, cur)
  }

  const years = [...allYears].sort((a, b) => a - b)

  // ── Career stats per player ────────────────────────────────────────────────
  const careerStats = Array.from(playerYearMap.entries()).map(([name, yearMap]) => {
    const entries = [...yearMap.entries()]
    const totalWins   = entries.reduce((s, [, v]) => s + v.wins, 0)
    const totalEarned = entries.reduce((s, [, v]) => s + v.earned, 0)
    const winningSeasonsCount = entries.filter(([, v]) => v.wins > 0).length

    const bestSeason        = entries.sort((a, b) => b[1].wins   - a[1].wins)[0]
    const bestSeasonEarned  = [...yearMap.entries()].sort((a, b) => b[1].earned - a[1].earned)[0]

    // Longest consecutive winning seasons
    let maxStreak = 0, curStreak = 0
    for (const year of years) {
      if ((yearMap.get(year)?.wins ?? 0) > 0) {
        curStreak++
        maxStreak = Math.max(maxStreak, curStreak)
      } else {
        curStreak = 0
      }
    }

    return { name, totalWins, totalEarned, winningSeasonsCount, bestSeason, bestSeasonEarned, maxStreak }
  })

  // ── Records ───────────────────────────────────────────────────────────────
  const allSeasonRows = [...playerYearMap.entries()].flatMap(([name, yearMap]) =>
    [...yearMap.entries()].map(([year, v]) => ({ name, year, ...v }))
  )

  const topBySsnWins   = [...allSeasonRows].sort((a, b) => b.wins - a.wins)[0]
  const topBySsnEarned = [...allSeasonRows].sort((a, b) => b.earned - a.earned)[0]
  const topBySeasons   = [...careerStats].sort((a, b) => b.winningSeasonsCount - a.winningSeasonsCount)[0]
  const topByStreak    = [...careerStats].sort((a, b) => b.maxStreak - a.maxStreak)[0]

  // ── Heatmap: top 10 by career wins ────────────────────────────────────────
  const topPlayers = [...careerStats]
    .sort((a, b) => b.totalWins - a.totalWins)
    .slice(0, 10)

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">
          <span className="text-[#39ff14]">Dynasty</span> Tracker
        </h2>
        <span className="text-xs text-gray-600 font-mono">records · streaks · dominance</span>
      </div>

      {/* Record Book */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded bg-[#111] border border-gray-900 p-4">
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-2">
            🔥 Most Wins — One Season
          </div>
          <div className="text-2xl font-black text-[#39ff14]">{topBySsnWins?.wins ?? 0}</div>
          <div className="text-sm text-white font-semibold mt-1 truncate">{topBySsnWins?.name}</div>
          <div className="text-xs text-gray-500">{topBySsnWins?.year}</div>
        </div>

        <div className="rounded bg-[#111] border border-gray-900 p-4">
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-2">
            🏆 Most Winning Seasons
          </div>
          <div className="text-2xl font-black text-[#39ff14]">
            {topBySeasons?.winningSeasonsCount}
            <span className="text-sm font-normal text-gray-500"> of {years.length}</span>
          </div>
          <div className="text-sm text-white font-semibold mt-1 truncate">{topBySeasons?.name}</div>
        </div>

        <div className="rounded bg-[#111] border border-gray-900 p-4">
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-2">
            💸 Biggest Single Season
          </div>
          <div className="text-2xl font-black text-[#39ff14]">
            ${topBySsnEarned?.earned.toLocaleString() ?? 0}
          </div>
          <div className="text-sm text-white font-semibold mt-1 truncate">{topBySsnEarned?.name}</div>
          <div className="text-xs text-gray-500">{topBySsnEarned?.year}</div>
        </div>

        <div className="rounded bg-[#111] border border-gray-900 p-4">
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-2">
            📅 Longest Win Streak
          </div>
          <div className="text-2xl font-black text-[#39ff14]">
            {topByStreak?.maxStreak}
            <span className="text-sm font-normal text-gray-500"> seasons</span>
          </div>
          <div className="text-sm text-white font-semibold mt-1 truncate">{topByStreak?.name}</div>
        </div>
      </div>

      {/* Year-by-Year Heatmap */}
      <div className="rounded border border-gray-800 bg-[#111] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Year-by-Year Win Heatmap</span>
          <span className="text-xs text-gray-600 font-mono">top 10 by career wins · cell = winning weeks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left px-4 py-2 font-normal">Player</th>
                {years.map((y) => (
                  <th key={y} className="px-1 py-2 font-normal text-center w-12">{y}</th>
                ))}
                <th className="px-3 py-2 font-normal text-right text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((player) => (
                <tr key={player.name} className="border-b border-gray-900 hover:bg-[#151515]">
                  <td className="px-4 py-2 text-white font-semibold max-w-[140px] truncate">
                    {player.name}
                  </td>
                  {years.map((y) => {
                    const wins = playerYearMap.get(player.name)?.get(y)?.wins ?? 0
                    return (
                      <td key={y} className="px-1 py-1.5 text-center">
                        <div
                          className="mx-auto w-9 h-7 rounded flex items-center justify-center font-bold"
                          style={{
                            backgroundColor: cellBg(wins),
                            color: cellColor(wins),
                          }}
                        >
                          {wins > 0 ? wins : <span className="text-gray-800 text-[10px]">·</span>}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-black text-[#39ff14]">
                    {player.totalWins}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-gray-800 text-[10px] text-gray-600 flex flex-wrap gap-4 items-center">
          <span>Winning weeks per season:</span>
          {[1, 2, 3].map((n) => (
            <span key={n} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded inline-block"
                style={{ backgroundColor: cellBg(n) }}
              />
              <span style={{ color: cellColor(n) }}>{n === 3 ? '3+' : n}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
