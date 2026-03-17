'use client'

import { useState } from 'react'
import MiniBar from './MiniBar'
import Link from 'next/link'

export interface OppEntry {
  opp: string
  count: number   // 13-run games vs this opponent
  total: number   // all games vs this opponent
  rate: number    // count / total * 100
}

const MIN_GAMES_FOR_RATE = 10

export default function OpponentChart({ entries }: { entries: OppEntry[] }) {
  const [mode, setMode] = useState<'count' | 'rate'>('count')

  const rateEntries = entries.filter((e) => e.total >= MIN_GAMES_FOR_RATE)

  const sorted =
    mode === 'count'
      ? [...entries].sort((a, b) => b.count - a.count)
      : [...rateEntries].sort((a, b) => b.rate - a.rate)

  const displayed = sorted.slice(0, 10)
  const max =
    mode === 'count'
      ? Math.max(...displayed.map((e) => e.count), 1)
      : Math.max(...displayed.map((e) => e.rate), 0.01)

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          By Opponent
        </h3>
        <div className="flex rounded overflow-hidden border border-gray-800">
          <button
            onClick={() => setMode('count')}
            className={`text-[10px] font-mono px-2 py-0.5 transition-colors ${
              mode === 'count' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            COUNT
          </button>
          <button
            onClick={() => setMode('rate')}
            className={`text-[10px] font-mono px-2 py-0.5 transition-colors ${
              mode === 'rate' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            RATE
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-600 mb-3">
        {mode === 'count'
          ? 'who they feast on most'
          : `13-run games per 100 played · min ${MIN_GAMES_FOR_RATE} games`}
      </p>

      {displayed.length === 0 ? (
        <p className="text-gray-600 text-xs">No data</p>
      ) : (
        <div className="space-y-2.5">
          {displayed.map(({ opp, count, total, rate }, i) => (
            <div key={opp} className="flex items-center gap-2">
              <span
                className={`text-xs font-mono w-3 ${
                  i === 0 ? 'text-[#39ff14]' : 'text-gray-700'
                }`}
              >
                {i === 0 ? '▸' : ''}
              </span>
              <Link
                href={`/teams/${opp.toLowerCase()}`}
                className="text-xs font-mono text-white w-8 shrink-0 hover:text-[#39ff14] transition-colors underline decoration-dotted"
              >
                {opp}
              </Link>
              <MiniBar value={mode === 'count' ? count : rate} max={max} />
              <span className="text-xs font-mono text-gray-400 w-16 text-right shrink-0">
                {mode === 'count'
                  ? count
                  : `${rate.toFixed(1)}% · ${total}g`}
              </span>
            </div>
          ))}
          {mode === 'count' && entries.length > 10 && (
            <p className="text-xs text-gray-700 mt-1 pl-5">
              +{entries.length - 10} other opponents
            </p>
          )}
          {mode === 'rate' && rateEntries.length > 10 && (
            <p className="text-xs text-gray-700 mt-1 pl-5">
              +{rateEntries.length - 10} opponents with {MIN_GAMES_FOR_RATE}+ games
            </p>
          )}
        </div>
      )}
    </div>
  )
}
