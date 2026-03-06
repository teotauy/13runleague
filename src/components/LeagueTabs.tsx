'use client'

import { useState, type ReactNode } from 'react'
import RankingsTabs, { type AllTimeEntry, type TeamEntry } from './RankingsTabs'

interface HistoricalRow {
  member_name: string
  team: string
  year: number
  total_won: number
  shares: number
}

interface LeagueTabsProps {
  /** Server-rendered current-season content (PotBreakdown, Leaderboard, etc.) */
  children: ReactNode
  historicalRaw: HistoricalRow[]
  allTimeRankings: AllTimeEntry[]
  teamRankings: TeamEntry[]
  slug: string
  currentYear: number
}

export default function LeagueTabs({
  children,
  historicalRaw,
  allTimeRankings,
  teamRankings,
  slug,
  currentYear,
}: LeagueTabsProps) {
  const [tab, setTab] = useState<number | 'alltime'>(currentYear)

  const pastYears = Array.from(new Set(historicalRaw.map((r) => r.year)))
    .filter((y) => y !== currentYear)
    .sort((a, b) => b - a)

  const tabs: (number | 'alltime')[] = [currentYear, 'alltime', ...pastYears]

  function tabLabel(t: number | 'alltime') {
    if (t === currentYear) return `${currentYear}`
    if (t === 'alltime') return 'All Time'
    return String(t)
  }

  function getYearData(year: number) {
    const yearRows = historicalRaw.filter((r) => r.year === year)

    const playerMap = new Map<string, AllTimeEntry>()
    for (const row of yearRows) {
      const existing = playerMap.get(row.member_name)
      if (existing) {
        existing.totalWon += row.total_won ?? 0
        existing.totalShares += row.shares ?? 0
      } else {
        playerMap.set(row.member_name, {
          name: row.member_name,
          totalWon: row.total_won ?? 0,
          totalShares: row.shares ?? 0,
          yearsPlayed: [year],
          isActive: false,
        })
      }
    }

    const teamMap = new Map<string, TeamEntry>()
    for (const row of yearRows) {
      if ((row.shares ?? 0) === 0) continue
      const existing = teamMap.get(row.team)
      if (existing) {
        existing.thirteenRunWeeks += row.shares ?? 0
        existing.totalPaidOut += row.total_won ?? 0
        if (!existing.yearsWon.includes(year)) existing.yearsWon.push(year)
      } else {
        teamMap.set(row.team, {
          team: row.team,
          thirteenRunWeeks: row.shares ?? 0,
          totalPaidOut: row.total_won ?? 0,
          yearsWon: [year],
        })
      }
    }

    return {
      players: Array.from(playerMap.values()).sort((a, b) => b.totalWon - a.totalWon),
      teams: Array.from(teamMap.values()).sort((a, b) => b.thirteenRunWeeks - a.thirteenRunWeeks),
    }
  }

  return (
    <div>
      {/* Spreadsheet-style tab bar — sticky, scrollable */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a] -mx-4 px-4">
        <div
          className="flex items-end gap-0 overflow-x-auto"
          style={{ borderBottom: '1px solid #374151' }}
        >
          {tabs.map((t) => {
            const isActive = tab === t
            return (
              <button
                key={String(t)}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-mono whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? 'text-[#39ff14] font-bold bg-[#0a0a0a] border border-b-[#0a0a0a] border-gray-700 -mb-px rounded-t'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                {tabLabel(t)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-8">
        {tab === currentYear && (
          <div className="space-y-10">{children}</div>
        )}

        {tab === 'alltime' && (
          <RankingsTabs allTime={allTimeRankings} teams={teamRankings} slug={slug} />
        )}

        {typeof tab === 'number' && tab !== currentYear && (() => {
          const { players, teams } = getYearData(tab)
          return (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 font-mono uppercase tracking-widest mb-6">
                {tab} Season
              </div>
              <RankingsTabs allTime={players} teams={teams} slug={slug} />
            </div>
          )
        })()}
      </div>
    </div>
  )
}
