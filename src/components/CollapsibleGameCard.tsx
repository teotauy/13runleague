'use client'

import { useState } from 'react'
import GameCard from './GameCard'
import { getProbabilityColor, getProbabilityTier, type LambdaBreakdown } from '@/lib/probability'

interface CollapsibleGameCardProps {
  gamePk: number
  awayTeam: string
  homeTeam: string
  venueName: string
  venueId: string
  awayPitcher?: string
  homePitcher?: string
  awayLambda: LambdaBreakdown
  homeLambda: LambdaBreakdown
  combinedProbability: number
  isBlended: boolean
  gameStatus?: string
  awayScore?: number
  homeScore?: number
}

export default function CollapsibleGameCard(props: CollapsibleGameCardProps) {
  const [open, setOpen] = useState(false)

  const { awayTeam, homeTeam, combinedProbability, gameStatus, awayScore, homeScore } = props

  const isFinal = gameStatus === 'Final'
  const isLive  = gameStatus === 'Live'
  const hasScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined
  const awayHit13 = hasScore && awayScore === 13
  const homeHit13 = hasScore && homeScore === 13
  const hit13 = awayHit13 || homeHit13

  const tier     = getProbabilityTier(combinedProbability)
  const color    = getProbabilityColor(tier)
  const pct      = (combinedProbability * 100).toFixed(2)
  const barWidth = Math.min(combinedProbability * 1000, 100)

  const borderColor = hit13 ? '#39ff14' : isFinal ? '#4b5563' : '#374151'
  const bgColor     = hit13 ? '#071007' : '#1a1a1a'

  // The toggle row — always visible, [+] or [−] on the far left
  const toggleRow = (
    <button
      onClick={() => setOpen(o => !o)}
      className={`w-full text-left overflow-hidden transition-colors group ${
        open ? '' : 'rounded-lg'
      } ${isFinal && !hit13 ? 'opacity-50' : ''}`}
      style={{
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor,
        borderBottomColor: open ? 'transparent' : borderColor,
        borderRadius: open ? '0.5rem 0.5rem 0 0' : undefined,
        backgroundColor: bgColor,
        boxShadow: hit13 && !open ? '0 0 16px rgba(57, 255, 20, 0.10)' : undefined,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Toggle indicator — leftmost, always first */}
        <span className="text-gray-400 group-hover:text-white transition-colors text-xs font-mono font-bold shrink-0 w-5 text-center">
          {open ? '[−]' : '[+]'}
        </span>

        {/* Live pulse */}
        {isLive && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
        )}

        {/* 13 flash */}
        {hit13 && <span className="text-[#39ff14] text-sm shrink-0">⚡</span>}

        {/* Matchup */}
        <span className={`font-bold font-mono text-sm flex-1 ${hit13 ? 'text-[#39ff14]' : 'text-white'}`}>
          {awayTeam} <span className="text-gray-500 font-normal">@</span> {homeTeam}
        </span>

        {/* Score or probability */}
        {hasScore ? (
          <span className="font-mono text-sm font-bold shrink-0">
            <span className={awayHit13 ? 'text-[#39ff14]' : 'text-white'}>{awayScore}</span>
            <span className="text-gray-500 mx-1">–</span>
            <span className={homeHit13 ? 'text-[#39ff14]' : 'text-gray-300'}>{homeScore}</span>
            {isFinal && (
              <span className={`text-[10px] ml-2 ${hit13 ? 'text-[#39ff14]/50' : 'text-gray-500'}`}>
                FINAL
              </span>
            )}
          </span>
        ) : (
          <span className="font-mono text-sm font-bold shrink-0" style={{ color }}>
            {pct}%
          </span>
        )}
      </div>

      {/* Thin prob bar — only when collapsed */}
      {!open && (
        <div className="h-[2px] bg-gray-800">
          {hit13 ? (
            <div className="h-full bg-[#39ff14]/40 w-full" />
          ) : !isFinal ? (
            <div className="h-full" style={{ width: `${barWidth}%`, backgroundColor: color }} />
          ) : null}
        </div>
      )}
    </button>
  )

  if (open) {
    return (
      <div style={{ borderRadius: '0.5rem', overflow: 'hidden', boxShadow: hit13 ? '0 0 16px rgba(57, 255, 20, 0.10)' : undefined }}>
        {toggleRow}
        <div style={{ border: `1px solid ${borderColor}`, borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', overflow: 'hidden' }}>
          <GameCard {...props} />
        </div>
      </div>
    )
  }

  return toggleRow
}
