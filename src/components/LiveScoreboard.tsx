interface LiveGame {
  gamePk: number
  away: { team: string; runs: number }
  home: { team: string; runs: number }
  inning: number
  isTopInning: boolean
  outs: number
  runners: { first?: boolean; second?: boolean; third?: boolean }
}

interface LiveScoreboardProps {
  games: LiveGame[]
}

function getOutsDisplay(outs: number): string {
  return '⚾'.repeat(outs)
}

function getRunnersDisplay(runners: { first?: boolean; second?: boolean; third?: boolean }): string {
  const first = runners.first ? '■' : '□'
  const second = runners.second ? '■' : '□'
  const third = runners.third ? '■' : '□'
  return `${first} ${second} ${third}`
}

// 4.6 — On Deck condition: team has 10+ runs after the 7th
function isOnDeckGame(game: LiveGame): boolean {
  return game.inning >= 8 && (
    (game.away.runs >= 10 && game.away.runs < 13) ||
    (game.home.runs >= 10 && game.home.runs < 13)
  )
}

export default function LiveScoreboard({ games }: LiveScoreboardProps) {
  if (games.length === 0) {
    return null
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-green-500 animate-pulse">●</span> Live Games Scoreboard
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {games.map((game) => {
          const onDeck = isOnDeckGame(game)
          const awayOnDeck = game.inning >= 8 && game.away.runs >= 10 && game.away.runs < 13
          const homeOnDeck = game.inning >= 8 && game.home.runs >= 10 && game.home.runs < 13

          return (
            <a
              key={game.gamePk}
              href={`https://www.mlb.com/gameday/${game.gamePk}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border bg-[#111] p-4 hover:border-amber-700 transition-colors flex flex-col gap-2"
              style={{ borderColor: onDeck ? 'rgba(217,119,6,0.6)' : '#1f2937' }}
            >
              {/* Matchup + On Deck badge */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-mono text-gray-300">
                  {game.away.team} @ {game.home.team}
                </div>
                {onDeck && (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    🔔 <span className="hidden sm:inline">ON DECK</span>
                  </span>
                )}
              </div>

              {/* Score - Large and prominent */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: awayOnDeck ? '#fbbf24' : game.away.runs === 13 ? '#39ff14' : 'white' }}
                  >
                    {game.away.runs}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{game.away.team}</div>
                </div>
                <div className="text-gray-600 px-2">—</div>
                <div className="flex-1 text-center">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: homeOnDeck ? '#fbbf24' : game.home.runs === 13 ? '#39ff14' : 'white' }}
                  >
                    {game.home.runs}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{game.home.team}</div>
                </div>
              </div>

              {/* Inning */}
              <div className="text-sm text-gray-400 font-mono text-center py-1">
                {game.isTopInning ? '▲' : '▼'} {game.inning}
              </div>

              {/* Outs and Runners */}
              <div className="border-t border-gray-700 pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Outs:</span>
                  <span className="text-white font-mono">{getOutsDisplay(game.outs)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Bases:</span>
                  <span className="text-white font-mono">{getRunnersDisplay(game.runners)}</span>
                </div>
              </div>

              {/* On Deck note */}
              {onDeck ? (
                <div className="text-xs text-amber-600 font-mono pt-1">
                  needs {13 - Math.max(awayOnDeck ? game.away.runs : 0, homeOnDeck ? game.home.runs : 0)} more · Watch live →
                </div>
              ) : (
                <div className="text-xs text-gray-600 text-right pt-1 hover:text-gray-400">
                  View Game →
                </div>
              )}
            </a>
          )
        })}
      </div>
    </section>
  )
}
