'use client'

import { useState } from 'react'
import Link from 'next/link'
import RankingsTabs, { type AllTimeEntry, type TeamEntry } from './RankingsTabs'
import Tooltip from './Tooltip'

interface HistoricalRow {
  member_name: string
  team: string
  year: number
  total_won: number
  shares: number
  week_wins: number[]
}

interface EnrichedMember {
  member: { id: string; name: string; assigned_team: string }
  streak?: { longest_streak: number; closest_miss_score: number | null; closest_miss_date: string | null }
  todayGame?: unknown
  todayProb: number | null
  weeksSinceWin: number | null
}

interface StatValue {
  label: string
  value: string
  highlight?: boolean
  explanation?: string
}

interface SeasonYearTabsProps {
  historicalRaw: HistoricalRow[]
  enrichedMembers: EnrichedMember[]
  allTimeMap: Map<string, AllTimeEntry>
  teamsMap: Map<string, TeamEntry>
  potTotal: number
  weeksPlayed: number
  leagueName: string
  slug: string
}

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]

export default function SeasonYearTabs({
  historicalRaw,
  enrichedMembers,
  allTimeMap,
  teamsMap,
  potTotal,
  weeksPlayed,
  leagueName,
  slug,
}: SeasonYearTabsProps) {
  const [selectedYear, setSelectedYear] = useState<number | 'alltime'>(2026)

  // Get unique years from historical data
  const availableYears = [
    2026,
    'alltime',
    ...Array.from(new Set(historicalRaw.map((r) => r.year))).sort((a, b) => b - a),
  ]

  // Filter and aggregate data by year
  function getDataForYear(year: number | 'alltime') {
    if (year === 2026) {
      // Current year: use live enriched members and existing maps
      return {
        enrichedMembers,
        allTimeMap,
        teamsMap,
        potTotal,
        weeksPlayed,
      }
    }

    if (year === 'alltime') {
      // All-time: already have the aggregated maps
      return {
        enrichedMembers: [], // Empty for all-time view
        allTimeMap,
        teamsMap,
        potTotal,
        weeksPlayed,
      }
    }

    // Past year: reconstruct from historical_results
    const yearData = historicalRaw.filter((r) => r.year === year)

    // Reconstruct AllTimeEntry for this year
    const newAllTimeMap = new Map<string, AllTimeEntry>()
    for (const row of yearData) {
      const existing = newAllTimeMap.get(row.member_name)
      if (existing) {
        existing.totalWon += row.total_won
        existing.totalShares += row.shares
        if (!existing.yearsPlayed.includes(row.year)) {
          existing.yearsPlayed.push(row.year)
        }
      } else {
        newAllTimeMap.set(row.member_name, {
          name: row.member_name,
          totalWon: row.total_won,
          totalShares: row.shares,
          yearsPlayed: [row.year],
          isActive: false, // Past year members not active
        })
      }
    }

    // Reconstruct TeamEntry for this year
    const newTeamsMap = new Map<string, TeamEntry>()
    for (const row of yearData) {
      const existing = newTeamsMap.get(row.team)
      if (existing) {
        existing.thirteenRunWeeks += row.shares
        if (!existing.yearsWon.includes(row.year)) {
          existing.yearsWon.push(row.year)
        }
      } else {
        newTeamsMap.set(row.team, {
          team: row.team,
          thirteenRunWeeks: row.shares,
          totalPaidOut: 0, // Not tracked in historical_results
          yearsWon: [row.year],
        })
      }
    }

    return {
      enrichedMembers: [], // No live enriched data for past years
      allTimeMap: newAllTimeMap,
      teamsMap: newTeamsMap,
      potTotal: 0, // Historical pot not tracked
      weeksPlayed: 0, // Historical weeks not relevant
    }
  }

  const currentData = getDataForYear(selectedYear)

  // Determine display label for year
  const yearLabel =
    selectedYear === 2026
      ? 'Current (2026)'
      : selectedYear === 'alltime'
        ? 'All-Time'
        : String(selectedYear)

  return (
    <div className="space-y-6">
      {/* Season tabs */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-gray-900 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {availableYears.map((year) => {
            const label =
              year === 2026
                ? 'Current (2026)'
                : year === 'alltime'
                  ? 'All-Time'
                  : String(year)
            const isActive = selectedYear === year

            return (
              <button
                key={year}
                onClick={() => setSelectedYear(year as any)}
                className={`px-4 py-2 rounded text-sm font-mono whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#39ff14] text-black font-bold'
                    : 'text-gray-500 hover:text-gray-300 border border-gray-800'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Pot tracker for current year only */}
      {selectedYear === 2026 && (
        <section className="rounded-lg border border-gray-800 bg-[#111] p-6">
          <h2 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Pot Tracker</h2>
          <div className="grid grid-cols-2 gap-6">
            <Stat
              label="Current Pot"
              value={`$${potTotal.toLocaleString()}`}
              highlight
              explanation="Total money in the league pool"
            />
            <Stat label="Weeks Played" value={String(weeksPlayed)} />
          </div>
        </section>
      )}

      {/* Leaderboard - current year only */}
      {selectedYear === 2026 && enrichedMembers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-left">
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2 pr-4">Team</th>
                  <th className="pb-2 pr-4">
                    <Tooltip label="Today's Game" explanation="This team's matchup today (away @ home)">
                      Today
                    </Tooltip>
                  </th>
                  <th className="pb-2 pr-4">
                    <Tooltip label="P(13)" explanation="Probability team scores 13+ runs in today's game">
                      P(13)
                    </Tooltip>
                  </th>
                  <th className="pb-2 pr-4">
                    <Tooltip label="Drought" explanation="Weeks since this team's last 13-run game">
                      Drought
                    </Tooltip>
                  </th>
                  <th className="pb-2 pr-4">
                    <Tooltip label="Best Run" explanation="Longest weekly winning streak">
                      Best Run
                    </Tooltip>
                  </th>
                  <th className="pb-2">
                    <Tooltip label="Closest Miss" explanation="Highest-scoring game without reaching 13 runs">
                      Closest Miss
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrichedMembers.map(({ member, streak, todayGame, todayProb, weeksSinceWin }) => (
                  <tr key={member.id} className="border-b border-gray-900 hover:bg-[#111]">
                    <td className="py-3 pr-4 text-white font-semibold">
                      <Link
                        href={`/league/${slug}/player/${member.id}`}
                        className="hover:text-[#39ff14] transition-colors"
                      >
                        {member.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200">
                        {member.assigned_team}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {todayGame
                        ? `${(todayGame as any).teams.away.team.abbreviation} @ ${(todayGame as any).teams.home.team.abbreviation}`
                        : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {todayProb !== null ? (
                        <span
                          className="font-bold"
                          style={{ color: todayProb > 0.05 ? '#39ff14' : todayProb > 0.02 ? '#f59e0b' : '#9ca3af' }}
                        >
                          {(todayProb * 100).toFixed(2)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">
                      {weeksSinceWin !== null ? `${weeksSinceWin}w` : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-400">{streak?.longest_streak ?? 0}W</td>
                    <td className="py-3 text-gray-400">
                      {streak?.closest_miss_score !== null && streak?.closest_miss_score !== undefined
                        ? `${streak.closest_miss_score} runs${streak.closest_miss_date ? ` (${streak.closest_miss_date})` : ''}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Rankings tabs */}
      <RankingsTabs
        allTime={Array.from(currentData.allTimeMap.values())}
        teams={Array.from(currentData.teamsMap.values())}
        slug={slug}
      />
    </div>
  )
}

function Stat({ label, value, highlight, explanation }: { label: string; value: string; highlight?: boolean; explanation?: string }) {
  const content = (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${highlight ? 'text-[#39ff14]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )

  if (explanation) {
    return (
      <Tooltip label={label} explanation={explanation}>
        {content}
      </Tooltip>
    )
  }

  return content
}
