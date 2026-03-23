'use client'

import { useState } from 'react'

interface Game {
  game_date: string
  home_team: string
  away_team: string
  winning_team: string
  home_score: number
  away_score: number
}

export default function ThirteenRunHistoryCard({ games }: { games: Game[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? games.slice(0, 10) : games.slice(0, 1)

  return (
    <div className="space-y-2">
      {shown.map((result) => (
        <div
          key={`${result.game_date}-${result.home_team}`}
          className="flex items-center gap-3 text-sm rounded-lg bg-white/[0.03] border border-white/[0.05] px-4 py-2"
        >
          <span className="text-gray-500 font-mono text-xs shrink-0">{result.game_date}</span>
          <span className="text-white min-w-0 flex-1">
            <span className="font-bold text-[#39ff14]">{result.winning_team}</span>
            {' scored '}
            <span className="text-[#39ff14] font-bold">13</span>
            {' — '}
            <span className="text-gray-400">{result.away_team} @ {result.home_team}</span>
          </span>
          <span className="font-mono text-xs shrink-0">
            <span className={result.away_score === 13 ? 'text-[#39ff14] font-bold' : 'text-gray-400'}>{result.away_score}</span>
            <span className="text-gray-600">–</span>
            <span className={result.home_score === 13 ? 'text-[#39ff14] font-bold' : 'text-gray-400'}>{result.home_score}</span>
          </span>
        </div>
      ))}

      {games.length > 1 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-gray-500 hover:text-[#39ff14] transition-colors mt-1 flex items-center gap-1"
        >
          <span className="font-mono">{expanded ? '−' : '+'}</span>
          {expanded ? 'show less' : `${games.length - 1} more`}
        </button>
      )}
    </div>
  )
}
