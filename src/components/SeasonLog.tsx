'use client'

import { useEffect, useState } from 'react'
import { getTeamColor } from '@/lib/teamColors'

interface WeekRow {
  weekNum: number
  dateStr: string
  memberName: string | null
  team: string | null
  scoreStr: string | null
  payoutAmount: number | null
}

interface SeasonLogData {
  weeks: WeekRow[]
  stats: {
    champion: string | null
    championWins: number
    mostEarned: string | null
    mostEarnedAmount: number
    biggestPot: number
    hottestTeam: string | null
    hottestTeamCount: number
    longestStreak: number
    longestStreakMember: string | null
    mlbCount: number
    hasData: boolean
  }
}

export default function SeasonLog({ slug, year }: { slug: string; year: number }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SeasonLogData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData(null)

    fetch(`/api/league/${slug}/season-log/${year}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<SeasonLogData>
      })
      .then((json) => {
        setData(json)
      })
      .catch(() => {
        setError('Could not load season log')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug, year])

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-[#111] rounded" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        Could not load season log
      </p>
    )
  }

  const { stats, weeks } = data

  return (
    <div>
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {stats.champion && stats.championWins > 0 && (
          <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">🏆 Champion</p>
            <p className="font-bold text-white text-sm">{stats.champion}</p>
            <p className="text-[#39ff14] text-xs">{stats.championWins} wins</p>
          </div>
        )}

        {stats.mostEarned && stats.mostEarnedAmount > 0 && (
          <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">💰 Most Earned</p>
            <p className="font-bold text-white text-sm">{stats.mostEarned}</p>
            <p className="text-[#39ff14] text-xs">${stats.mostEarnedAmount.toFixed(0)}</p>
          </div>
        )}

        {stats.biggestPot > 0 && (
          <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">💸 Biggest Pot</p>
            <p className="font-black text-green-400 text-xl">${stats.biggestPot.toFixed(0)}</p>
          </div>
        )}

        {stats.longestStreak > 1 && stats.longestStreakMember && (
          <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">🔥 Hot Streak</p>
            <p className="font-bold text-white text-sm">{stats.longestStreakMember}</p>
            <p className="text-[#39ff14] text-xs">{stats.longestStreak} in a row</p>
          </div>
        )}

        {stats.hottestTeam && stats.hottestTeamCount > 0 && (
          <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">⚡ Hottest Team</p>
            <p className="font-bold text-white text-sm">{stats.hottestTeam}</p>
            <p className="text-[#39ff14] text-xs">{stats.hottestTeamCount}× this season</p>
          </div>
        )}

        {stats.mlbCount > 0 && (
          <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">⚾ MLB 13s</p>
            <p className="font-bold text-white text-sm">{stats.mlbCount}</p>
            <p className="text-[#39ff14] text-xs">games that season</p>
          </div>
        )}
      </div>

      {/* Week list */}
      {!stats.hasData ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No data recorded for {year}
        </p>
      ) : (
        <div className="space-y-0.5">
          {weeks.map((row) => {
            const weekNumStr = String(row.weekNum).padStart(2, '0')

            if (row.memberName === null) {
              return (
                <div
                  key={row.weekNum}
                  className="flex items-center gap-4 py-1.5 px-3 rounded text-gray-700 hover:bg-[#0f0f0f]"
                >
                  <span className="font-mono text-xs w-6 text-right">{weekNumStr}</span>
                  <span className="text-xs w-16 text-gray-600">{row.dateStr}</span>
                  <span className="text-xs tracking-[0.2em]">· · · ROLLOVER · · ·</span>
                </div>
              )
            }

            const colors = getTeamColor(row.team ?? '')

            return (
              <div
                key={row.weekNum}
                className="flex items-center gap-3 py-2 px-3 rounded hover:bg-[#0f0f0f] border-l-2 border-[#39ff14]/20 hover:border-[#39ff14]/50"
              >
                <span className="font-mono text-xs w-6 text-right text-gray-500">{weekNumStr}</span>
                <span className="text-xs w-16 text-gray-400">{row.dateStr}</span>
                <span className="font-semibold text-white text-sm flex-1">{row.memberName}</span>
                <span
                  className="font-bold text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ backgroundColor: colors.primaryColor, color: colors.textColor }}
                >
                  {row.team}
                </span>
                {row.scoreStr && (
                  <span className="text-gray-400 text-xs font-mono">{row.scoreStr}</span>
                )}
                {row.payoutAmount != null && (
                  <span className="text-[#39ff14] text-xs font-mono font-bold ml-auto">
                    ${row.payoutAmount}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
