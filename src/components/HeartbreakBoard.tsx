import { normalizeTeamAbbr } from '@/lib/teamColors'

export interface HeartbreakGame {
  game_date: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  winning_team: string | null
}

interface HeartbreakEntry {
  team: string
  count: number
  lastDate: string
}

export default function HeartbreakBoard({ games }: { games: HeartbreakGame[] }) {
  if (games.length === 0) return null

  // Derive heartbreak team(s) from each game.
  // In these games was_thirteen = true, so winning_team scored 13.
  // The heartbreak team is whoever scored exactly 12.
  const franchiseMap = new Map<string, HeartbreakEntry>()

  for (const g of games) {
    const heartbreakers: string[] = []
    if (g.home_score === 12) heartbreakers.push(normalizeTeamAbbr(g.home_team))
    if (g.away_score === 12) heartbreakers.push(normalizeTeamAbbr(g.away_team))

    for (const team of heartbreakers) {
      const existing = franchiseMap.get(team)
      if (!existing) {
        franchiseMap.set(team, { team, count: 1, lastDate: g.game_date })
      } else {
        existing.count++
        if (g.game_date > existing.lastDate) existing.lastDate = g.game_date
      }
    }
  }

  const ranked = [...franchiseMap.values()].sort((a, b) => b.count - a.count)
  const maxCount = ranked[0]?.count ?? 1
  const topEntry = ranked[0]

  // Most recent near-miss — games are ordered desc
  const recentGame = games[0]
  const recentHB = recentGame
    ? recentGame.home_score === 12
      ? recentGame.home_team
      : recentGame.away_team
    : null

  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-lg font-bold">
          <span className="text-red-400">💔</span> Heartbreak Board
        </h2>
        <span className="text-xs text-gray-600 font-mono">
          {games.length.toLocaleString()} near-misses · all-time
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Scored exactly 12 in a game where the opponent scored 13. One run short.
      </p>

      <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            By Franchise
          </h3>
          {topEntry && (
            <span className="text-xs text-gray-600 font-mono">
              {topEntry.team} — {topEntry.count}× heartbroken
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {ranked.slice(0, 15).map(({ team, count, lastDate }, i) => (
            <div key={team} className="flex items-center gap-2">
              <span className={`text-xs font-mono w-3 shrink-0 ${i === 0 ? 'text-red-400' : 'text-gray-700'}`}>
                {i === 0 ? '▸' : ''}
              </span>
              <span className="text-xs font-mono text-gray-300 w-8 shrink-0">{team}</span>
              <div className="flex-1 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                    backgroundColor: i === 0 ? '#ef4444' : '#7f1d1d',
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-500 w-6 text-right shrink-0">
                {count}
              </span>
              <span className="text-xs font-mono text-gray-700 w-10 text-right shrink-0 hidden sm:block">
                {lastDate.slice(0, 4)}
              </span>
            </div>
          ))}
          {ranked.length > 15 && (
            <p className="text-xs text-gray-700 mt-1 pl-5">
              +{ranked.length - 15} other franchises
            </p>
          )}
        </div>

        {recentGame && recentHB && recentGame.winning_team && (
          <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-600 font-mono">
            Most recent:{' '}
            <span className="text-gray-400">{recentHB}</span> scored 12 while{' '}
            <span className="text-gray-400">{recentGame.winning_team}</span> scored 13
            <span className="text-gray-700"> · {recentGame.game_date}</span>
          </div>
        )}
      </div>
    </section>
  )
}
