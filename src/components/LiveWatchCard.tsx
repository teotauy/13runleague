'use client'

import { useEffect, useState } from 'react'
import { fetchLiveFeedClient } from '@/lib/mlb'
import { getConditionalProbability, type LiveGameState } from '@/lib/probability'
import type { MLBLiveGame } from '@/lib/mlb'
import Tooltip from './Tooltip'

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
  awayLambda?: number  // For probability recalculation during polling
  homeLambda?: number
}

export default function LiveWatchCard({
  gamePk,
  awayTeam,
  homeTeam,
  awayRuns: initialAwayRuns,
  homeRuns: initialHomeRuns,
  inning: initialInning,
  isTopInning: initialIsTopInning,
  inningOrdinal: initialInningOrdinal,
  awayProb: initialAwayProb,
  homeProb: initialHomeProb,
  awaySource: initialAwaySource,
  homeSource: initialHomeSource,
  innings: initialInnings,
  awayLambda = 4.5,
  homeLambda = 4.5,
}: LiveWatchCardProps) {
  // Real-time state from polling
  const [liveData, setLiveData] = useState<{
    awayRuns: number
    homeRuns: number
    inning: number
    isTopInning: boolean
    inningOrdinal: string
    innings: Array<{ num: number; away?: number; home?: number }>
  }>({
    awayRuns: initialAwayRuns,
    homeRuns: initialHomeRuns,
    inning: initialInning,
    isTopInning: initialIsTopInning,
    inningOrdinal: initialInningOrdinal,
    innings: initialInnings,
  })

  const [probabilities, setProbabilities] = useState<{
    awayProb: number | null
    homeProb: number | null
    awaySource: 'lookup' | 'poisson'
    homeSource: 'lookup' | 'poisson'
  }>({
    awayProb: initialAwayProb,
    homeProb: initialHomeProb,
    awaySource: initialAwaySource,
    homeSource: initialHomeSource,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  // Polling function
  const pollLiveGame = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const feed = await fetchLiveFeedClient(gamePk)
      const { linescore } = feed.liveData

      // Update scores and inning data
      const newInnings = linescore.innings.map((inn) => ({
        num: inn.num,
        away: inn.away?.runs,
        home: inn.home?.runs,
      }))

      setLiveData({
        awayRuns: linescore.teams.away.runs,
        homeRuns: linescore.teams.home.runs,
        inning: linescore.currentInning,
        isTopInning: linescore.isTopInning,
        inningOrdinal: linescore.currentInningOrdinal,
        innings: newInnings,
      })

      // Recalculate probabilities
      if (linescore.teams.away.runs >= 9) {
        const awayState: LiveGameState = {
          side: 'vis',
          inningCompleted: linescore.isTopInning ? linescore.currentInning - 1 : linescore.currentInning,
          currentScore: linescore.teams.away.runs,
          isHomeTeamWinning: linescore.teams.home.runs > linescore.teams.away.runs,
          inning: linescore.currentInning,
          isBottom: !linescore.isTopInning,
        }
        const awayResult = getConditionalProbability(awayState, awayLambda)
        setProbabilities((prev) => ({
          ...prev,
          awayProb: awayResult.probability,
          awaySource: awayResult.source,
        }))
      }

      if (linescore.teams.home.runs >= 9) {
        const homeState: LiveGameState = {
          side: 'home',
          inningCompleted: linescore.isTopInning ? linescore.currentInning - 1 : linescore.currentInning,
          currentScore: linescore.teams.home.runs,
          isHomeTeamWinning: linescore.teams.home.runs > linescore.teams.away.runs,
          inning: linescore.currentInning,
          isBottom: !linescore.isTopInning,
        }
        const homeResult = getConditionalProbability(homeState, homeLambda)
        setProbabilities((prev) => ({
          ...prev,
          homeProb: homeResult.probability,
          homeSource: homeResult.source,
        }))
      }

      setLastUpdate(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('Live game polling error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Set up polling interval
  useEffect(() => {
    // Poll immediately on mount
    pollLiveGame()

    // Then poll every 30 seconds
    const interval = setInterval(() => {
      pollLiveGame()
    }, 30000)

    // Cleanup on unmount
    return () => clearInterval(interval)
  }, [gamePk, awayLambda, homeLambda])

  // Use state values for rendering
  const { awayRuns, homeRuns, inning, isTopInning, inningOrdinal, innings } = liveData
  const { awayProb, homeProb, awaySource, homeSource } = probabilities
  const isWalkOffAlert =
    !isTopInning &&
    inning >= 9 &&
    homeRuns === 12 &&
    awayRuns > homeRuns

  const highProb = Math.max(awayProb ?? 0, homeProb ?? 0)
  const isPulsing = highProb > 0.7

  // Helper to format time since last update
  const getTimeSinceLastUpdate = () => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    return `${Math.floor(seconds / 60)}m ago`
  }

  return (
    <div
      className={`rounded-lg border bg-[#0d0d0d] p-4 flex flex-col gap-3 ${
        isPulsing ? 'border-[#39ff14]' : 'border-gray-800'
      }`}
    >
      {/* Error message */}
      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 rounded px-2 py-1">
          ⚠ {error}
        </div>
      )}

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
            LIVE{isLoading && ' ◌'}
          </span>
          <span className="text-white font-bold font-mono">
            {awayTeam} @ {homeTeam}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-gray-400 text-sm font-mono">
            {isTopInning ? '▲' : '▼'} {inningOrdinal}
          </span>
          <span className="text-gray-600 text-xs font-mono">
            {getTimeSinceLastUpdate()}
          </span>
        </div>
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
        <Tooltip
          label="P(13)"
          explanation="Live probability of reaching exactly 13 runs from the current game state. Calculated using 16M+ historical Retrosheet games."
        >
          {pct}%
        </Tooltip>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">
        {source === 'lookup' ? '📚 Retrosheet' : '📐 Poisson'}
      </div>
    </div>
  )
}
