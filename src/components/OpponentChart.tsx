'use client'

import { useState } from 'react'
import MiniBar from './MiniBar'
import Link from 'next/link'

export interface OppEntry {
  opp: string
  count: number       // 13-run games THIS team scored vs this opponent
  oppAllowed: number  // total 13-run games this opponent has ever given up (to anyone)
  share: number       // count / oppAllowed * 100
}

const MIN_ALLOWED_FOR_SHARE = 5

export default function OpponentChart({ entries }: { entries: OppEntry[] }) {
  const [mode, setMode] = useState<'count' | 'share'>('count')

  const shareEntries = entries.filter((e) => e.oppAllowed >= MIN_ALLOWED_FOR_SHARE)

  const sorted =
    mode === 'count'
      ? [...entries].sort((a, b) => b.count - a.count)
      : [...shareEntries].sort((a, b) => b.share - a.share)

  const displayed = sorted.slice(0, 10)
  const max =
    mode === 'count'
      ? Math.max(...displayed.map((e) => e.count), 1)
      : Math.max(...displayed.map((e) => e.share), 0.01)

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
              mode === 'count' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-400'
            }`}
          >
            COUNT
          </button>
          <button
            onClick={() => setMode('share')}
            className={`text-[10px] font-mono px-2 py-0.5 transition-colors ${
              mode === 'share' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-400'
            }`}
          >
            SHARE
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-1">
        {mode === 'count'
          ? 'opponents scored on most'
          : 'share of opponent\'s all-time 13-run allowed'}
      </p>
      {mode === 'share' && displayed[0] && (
        <p className="text-[11px] text-gray-400 italic mb-3 leading-snug">
          e.g. {displayed[0].opp} has given up 13 runs {displayed[0].oppAllowed} times
          in history — this team scored {displayed[0].count} of them ({displayed[0].share.toFixed(1)}%)
        </p>
      )}

      {displayed.length === 0 ? (
        <p className="text-gray-400 text-xs">No data</p>
      ) : (
        <div className="space-y-2.5">
          {displayed.map(({ opp, count, oppAllowed, share }, i) => (
            <div key={opp} className="flex items-center gap-2">
              <span
                className={`text-xs font-mono w-3 ${
                  i === 0 ? 'text-[#39ff14]' : 'text-gray-400'
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
              <MiniBar value={mode === 'count' ? count : share} max={max} />
              <span className="text-xs font-mono text-gray-400 w-20 text-right shrink-0">
                {mode === 'count'
                  ? `${count} of ${oppAllowed}`
                  : `${share.toFixed(1)}%`}
              </span>
            </div>
          ))}
          {mode === 'count' && entries.length > 10 && (
            <p className="text-xs text-gray-400 mt-1 pl-5">
              +{entries.length - 10} other opponents
            </p>
          )}
          {mode === 'share' && shareEntries.length > 10 && (
            <p className="text-xs text-gray-400 mt-1 pl-5">
              +{shareEntries.length - 10} more opponents
            </p>
          )}
        </div>
      )}
    </div>
  )
}
