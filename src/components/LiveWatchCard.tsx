'use client'

interface LiveWatchCardProps {
  gamePk: number
  awayTeam: string
  homeTeam: string
  awayRuns: number
  homeRuns: number
  inning: number
  isTopInning: boolean
  inningOrdinal: string
  awayProb: number | null
  homeProb: number | null
  awaySource: 'lookup' | 'poisson'
  homeSource: 'lookup' | 'poisson'
  innings: Array<{ num: number; away?: number; home?: number }>
}

export default function LiveWatchCard({
  gamePk,
  awayTeam,
  homeTeam,
  awayRuns,
  homeRuns,
  inning,
  isTopInning,
  inningOrdinal,
  awayProb,
  homeProb,
  awaySource,
  homeSource,
  innings,
}: LiveWatchCardProps) {
  const isWalkOffAlert =
    !isTopInning &&
    inning >= 9 &&
    homeRuns === 12 &&
    awayRuns > homeRuns

  const highProb = Math.max(awayProb ?? 0, homeProb ?? 0)
  const isPulsing = highProb > 0.7

  return (
    <div
      className={`rounded-lg border bg-[#0d0d0d] p-4 flex flex-col gap-3 ${
        isPulsing ? 'border-[#39ff14]' : 'border-gray-800'
      }`}
    >
      {/* Walk-off alert */}
      {isWalkOffAlert && (
        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold animate-pulse">
          🏆 Walk-Off 13 Alert
        </div>
      )}

      {/* Live badge + matchup */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${isPulsing ? 'bg-[#39ff14] text-black animate-pulse' : 'bg-red-600 text-white'}`}>
            LIVE
          </span>
          <span className="text-white font-bold font-mono">
            {awayTeam} @ {homeTeam}
          </span>
        </div>
        <span className="text-gray-400 text-sm font-mono">
          {isTopInning ? '▲' : '▼'} {inningOrdinal}
        </span>
      </div>

      {/* Linescore */}
      <div className="overflow-x-auto">
        <table className="text-xs font-mono w-full border-collapse">
          <thead>
            <tr className="text-gray-600">
              <td className="pr-2 py-1">Team</td>
              {innings.map((inn) => (
                <td key={inn.num} className="px-1 py-1 text-center w-6">{inn.num}</td>
              ))}
              <td className="px-2 py-1 text-center font-bold text-gray-400">R</td>
            </tr>
          </thead>
          <tbody>
            <tr className="text-gray-300">
              <td className="pr-2 py-1 text-gray-400">{awayTeam}</td>
              {innings.map((inn) => (
                <td key={inn.num} className="px-1 py-1 text-center">
                  {inn.away ?? '-'}
                </td>
              ))}
              <td className="px-2 py-1 text-center font-bold text-white">{awayRuns}</td>
            </tr>
            <tr className="text-gray-300">
              <td className="pr-2 py-1 text-gray-400">{homeTeam}</td>
              {innings.map((inn) => (
                <td key={inn.num} className="px-1 py-1 text-center">
                  {inn.home ?? '-'}
                </td>
              ))}
              <td className="px-2 py-1 text-center font-bold text-white">{homeRuns}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Conditional probabilities */}
      <div className="grid grid-cols-2 gap-3">
        {awayProb !== null && awayRuns >= 9 && (
          <ProbBadge label={awayTeam} prob={awayProb} source={awaySource} />
        )}
        {homeProb !== null && homeRuns >= 9 && (
          <ProbBadge label={homeTeam} prob={homeProb} source={homeSource} />
        )}
      </div>

      <a
        href={`https://www.mlb.com/gameday/${gamePk}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors text-right"
      >
        Watch live →
      </a>
    </div>
  )
}

function ProbBadge({
  label,
  prob,
  source,
}: {
  label: string
  prob: number
  source: 'lookup' | 'poisson'
}) {
  const pct = (prob * 100).toFixed(1)
  const color = prob > 0.7 ? '#39ff14' : prob > 0.4 ? '#f59e0b' : '#9ca3af'

  return (
    <div className="rounded bg-[#111] p-2 space-y-1">
      <div className="text-xs text-gray-500 font-mono uppercase">{label}</div>
      <div className="text-lg font-bold font-mono" style={{ color }}>
        {pct}%
      </div>
      <div className="text-[10px] text-gray-600 font-mono">
        {source === 'lookup' ? '📚 Retrosheet' : '📐 Poisson'}
      </div>
    </div>
  )
}
