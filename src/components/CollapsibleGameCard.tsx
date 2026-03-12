'use client'

import { useState } from 'react'
import GameCard from './GameCard'
import {
  getProbabilityColor,
  getProbabilityTier,
  getAlertTier,
  getConditionalProbability,
  type LambdaBreakdown,
  type LiveGameState,
  type AlertTier,
} from '@/lib/probability'

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
  // 4.5 — live game state for in-game conditional lookup
  inning?: number
  isTopInning?: boolean
}

function alertBorderColor(tier: AlertTier): string {
  if (tier === 'active') return '#ef4444'
  if (tier === 'radar')  return '#f97316'
  if (tier === 'watching') return '#eab308'
  return ''
}

function alertGlow(tier: AlertTier): string | undefined {
  if (tier === 'active') return '0 0 20px rgba(239,68,68,0.18)'
  return undefined
}

function alertEmoji(tier: AlertTier): string | null {
  if (tier === 'active')   return '🚨'
  if (tier === 'radar')    return '📡'
  if (tier === 'watching') return '👀'
  return null
}

export default function CollapsibleGameCard(props: CollapsibleGameCardProps) {
  const [open, setOpen] = useState(false)

  const {
    awayTeam, homeTeam, combinedProbability, gameStatus,
    awayScore, homeScore, inning, isTopInning,
    awayLambda, homeLambda,
  } = props

  const isFinal = gameStatus === 'Final'
  const isLive  = gameStatus === 'Live'
  const hasScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined
  const awayHit13 = hasScore && awayScore === 13
  const homeHit13 = hasScore && homeScore === 13
  const hit13 = awayHit13 || homeHit13

  // ── 4.5: In-game conditional probability ─────────────────────────────────
  let liveProb: number | null = null
  let liveProbTeam: string | null = null

  if (isLive && inning !== undefined && isTopInning !== undefined && hasScore) {
    const isHomeWinning = (homeScore ?? 0) > (awayScore ?? 0)
    const inningCompleted = isTopInning ? inning - 1 : inning

    if ((awayScore ?? 0) >= 9) {
      const state: LiveGameState = {
        side: 'vis', inningCompleted, currentScore: awayScore!,
        isHomeTeamWinning: isHomeWinning, inning, isBottom: !isTopInning,
      }
      const r = getConditionalProbability(state, awayLambda.pitcherAdjusted)
      if (r.probability > (liveProb ?? 0)) { liveProb = r.probability; liveProbTeam = awayTeam }
    }
    if ((homeScore ?? 0) >= 9) {
      const state: LiveGameState = {
        side: 'home', inningCompleted, currentScore: homeScore!,
        isHomeTeamWinning: isHomeWinning, inning, isBottom: !isTopInning,
      }
      const r = getConditionalProbability(state, homeLambda.pitcherAdjusted)
      if (r.probability > (liveProb ?? 0)) { liveProb = r.probability; liveProbTeam = homeTeam }
    }
  }

  // Use live conditional prob for alert tier when available
  const displayProb = liveProb ?? combinedProbability

  // ── 4.7: Threshold alert tier ─────────────────────────────────────────────
  const alertTier: AlertTier = !isFinal && !hit13 ? getAlertTier(displayProb) : null
  const aEmoji = alertEmoji(alertTier)

  const tier     = getProbabilityTier(combinedProbability)
  const color    = getProbabilityColor(tier)
  const pct      = (combinedProbability * 100).toFixed(2)
  const barWidth = Math.min(combinedProbability * 1000, 100)

  const borderColor = hit13
    ? '#39ff14'
    : alertTier ? alertBorderColor(alertTier)
    : isFinal ? '#4b5563' : '#374151'
  const bgColor = hit13 ? '#071007' : '#1a1a1a'

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
        boxShadow: hit13 && !open
          ? '0 0 16px rgba(57,255,20,0.10)'
          : !open ? alertGlow(alertTier) : undefined,
      }}
    >
      <div className="flex items-center gap-2 px-3 py-3">

        {/* Toggle indicator */}
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

        {/* 13 flash or alert emoji */}
        {hit13 ? (
          <span className="text-[#39ff14] text-sm shrink-0">⚡</span>
        ) : aEmoji ? (
          <span className="text-sm shrink-0">{aEmoji}</span>
        ) : null}

        {/* Matchup */}
        <span className={`font-bold font-mono text-sm flex-1 min-w-0 truncate ${hit13 ? 'text-[#39ff14]' : 'text-white'}`}>
          {awayTeam} <span className="text-gray-500 font-normal">@</span> {homeTeam}
        </span>

        {/* Right side: score + live prob badge, or pre-game prob */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasScore && (
            <span className="font-mono text-sm font-bold">
              <span className={awayHit13 ? 'text-[#39ff14]' : 'text-white'}>{awayScore}</span>
              <span className="text-gray-500 mx-1">–</span>
              <span className={homeHit13 ? 'text-[#39ff14]' : 'text-gray-300'}>{homeScore}</span>
              {isFinal && (
                <span className={`text-[10px] ml-1.5 ${hit13 ? 'text-[#39ff14]/50' : 'text-gray-500'}`}>
                  FINAL
                </span>
              )}
            </span>
          )}

          {/* 4.5 — live conditional probability badge */}
          {liveProb !== null && !hit13 && (
            <span
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded border"
              style={{
                color: liveProb > 0.65
                  ? '#ef4444'
                  : liveProb > 0.40 ? '#f97316' : '#eab308',
                borderColor: liveProb > 0.65
                  ? 'rgba(239,68,68,0.3)'
                  : liveProb > 0.40 ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.3)',
                backgroundColor: liveProb > 0.65
                  ? 'rgba(239,68,68,0.08)'
                  : liveProb > 0.40 ? 'rgba(249,115,22,0.08)' : 'rgba(234,179,8,0.08)',
              }}
            >
              {liveProbTeam} {(liveProb * 100).toFixed(0)}%
            </span>
          )}

          {/* Pre-game probability (Preview games only) */}
          {!hasScore && (
            <span className="font-mono text-sm font-bold" style={{ color }}>
              {pct}%
            </span>
          )}
        </div>
      </div>

      {/* Thin prob bar — only when collapsed */}
      {!open && (
        <div className="h-[2px] bg-gray-800">
          {hit13 ? (
            <div className="h-full bg-[#39ff14]/40 w-full" />
          ) : !isFinal ? (
            <div
              className="h-full transition-all"
              style={{
                width: `${barWidth}%`,
                backgroundColor: alertTier ? alertBorderColor(alertTier) : color,
              }}
            />
          ) : null}
        </div>
      )}
    </button>
  )

  if (open) {
    return (
      <div style={{
        borderRadius: '0.5rem', overflow: 'hidden',
        boxShadow: hit13
          ? '0 0 16px rgba(57,255,20,0.10)'
          : alertGlow(alertTier),
      }}>
        {toggleRow}
        <div style={{ border: `1px solid ${borderColor}`, borderTop: 'none', borderRadius: '0 0 0.5rem 0.5rem', overflow: 'hidden' }}>
          <GameCard {...props} alertTier={alertTier} liveProb={liveProb} liveProbTeam={liveProbTeam} />
        </div>
      </div>
    )
  }

  return toggleRow
}
