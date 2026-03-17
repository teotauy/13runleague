'use client'

import { useState } from 'react'
import Link from 'next/link'
import SeasonLog from './SeasonLog'

export interface AllTimeEntry {
  name: string
  totalWon: number
  totalShares: number
  yearsPlayed: number[]
  isActive: boolean
  id?: string
}

export interface TeamEntry {
  team: string
  thirteenRunWeeks: number
  totalPaidOut: number
  yearsWon: number[]
}

interface HistoricalRow {
  member_name: string
  team: string
  year: number
  total_won: number
  shares: number
}

type AllTimeSort = 'totalWon' | 'totalShares' | 'yearsPlayed'
type TeamSort = 'thirteenRunWeeks' | 'totalPaidOut'
type Dir = 'asc' | 'desc'

const ALL_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const IRONMAN_COUNT = ALL_YEARS.length

// ── Badge definitions ────────────────────────────────────────────────────────

interface Badge {
  emoji: string
  label: string
  title: string
}

/**
 * Compute all badge awards from the current dataset + optional historicalRaw.
 * Returns a map of player name → Badge[].
 * Pass `year` when showing a specific season's data (changes "Career" → "{year} Season").
 */
function computeBadges(
  data: AllTimeEntry[],
  historicalRaw?: HistoricalRow[],
  year?: number
): Map<string, Badge[]> {
  const map = new Map<string, Badge[]>()
  const push = (name: string, badge: Badge) => {
    if (!map.has(name)) map.set(name, [])
    map.get(name)!.push(badge)
  }

  if (data.length === 0) return map

  // Ironman — only meaningful in all-time context
  if (!year) {
    for (const e of data) {
      if (e.yearsPlayed.length === IRONMAN_COUNT) {
        push(e.name, { emoji: '🏆', label: 'Ironman', title: `Ironman — played all ${IRONMAN_COUNT} seasons` })
      }
    }
  }

  // 👑 Wins Leader
  const maxShares = Math.max(...data.map((e) => e.totalShares))
  if (maxShares > 0) {
    for (const e of data) {
      if (e.totalShares === maxShares) {
        push(e.name, {
          emoji: '👑',
          label: 'Wins Leader',
          title: year
            ? `${year} Wins Leader — ${maxShares} 13-run week${maxShares !== 1 ? 's' : ''}`
            : `Career Wins Leader — ${maxShares} 13-run week${maxShares !== 1 ? 's' : ''}`,
        })
      }
    }
  }

  // 💰 Money Leader
  const maxMoney = Math.max(...data.map((e) => e.totalWon))
  if (maxMoney > 0) {
    for (const e of data) {
      if (e.totalWon === maxMoney) {
        push(e.name, {
          emoji: '💰',
          label: 'Money Leader',
          title: year
            ? `${year} Money Leader — $${maxMoney.toLocaleString()}`
            : `Career Money Leader — $${maxMoney.toLocaleString()} all-time`,
        })
      }
    }
  }

  // Single-season records — only computable with historicalRaw, and only in all-time view
  if (!year && historicalRaw && historicalRaw.length > 0) {
    // 🔥 Single-Season Wins Record
    const maxSingleSeasonShares = Math.max(...historicalRaw.map((r) => r.shares))
    if (maxSingleSeasonShares > 0) {
      const singleSeasonWinRows = historicalRaw.filter((r) => r.shares === maxSingleSeasonShares)
      for (const row of singleSeasonWinRows) {
        push(row.member_name, {
          emoji: '🔥',
          label: 'Season Wins Record',
          title: `Single-Season Wins Record — ${maxSingleSeasonShares} weeks in ${row.year}`,
        })
      }
    }

    // 💸 Single-Season Money Record
    const maxSingleSeasonMoney = Math.max(...historicalRaw.map((r) => r.total_won))
    if (maxSingleSeasonMoney > 0) {
      const singleSeasonMoneyRows = historicalRaw.filter((r) => r.total_won === maxSingleSeasonMoney)
      for (const row of singleSeasonMoneyRows) {
        push(row.member_name, {
          emoji: '💸',
          label: 'Season Money Record',
          title: `Single-Season Money Record — $${maxSingleSeasonMoney.toLocaleString()} in ${row.year}`,
        })
      }
    }
  }

  return map
}

// ── Shared UI ────────────────────────────────────────────────────────────────

function yearRange(years: number[]): string {
  const unique = [...new Set(years)].sort((a, b) => a - b)
  if (unique.length === 0) return '—'
  if (unique.length === 1) return String(unique[0])
  return `${unique[0]}–${unique[unique.length - 1]}`
}

function SortArrow({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) return <span className="text-gray-700 ml-1">↕</span>
  return <span className="text-[#39ff14] ml-1">{dir === 'desc' ? '↓' : '↑'}</span>
}

function SortTh({
  label,
  col,
  current,
  dir,
  onClick,
}: {
  label: string
  col: string
  current: string
  dir: Dir
  onClick: (col: string) => void
}) {
  return (
    <th
      className="pb-2 pr-4 text-left cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
      onClick={() => onClick(col)}
    >
      {label}
      <SortArrow active={current === col} dir={dir} />
    </th>
  )
}

// ── All-Time Table ────────────────────────────────────────────────────────────

function AllTimeTable({
  data,
  slug,
  historicalRaw,
  year,
}: {
  data: AllTimeEntry[]
  slug?: string
  historicalRaw?: HistoricalRow[]
  year?: number
}) {
  const [sortCol, setSortCol] = useState<AllTimeSort>('totalWon')
  const [dir, setDir] = useState<Dir>('desc')

  function handleSort(col: string) {
    if (col === sortCol) {
      setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col as AllTimeSort)
      setDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    let av: number, bv: number
    if (sortCol === 'totalWon') { av = a.totalWon; bv = b.totalWon }
    else if (sortCol === 'totalShares') { av = a.totalShares; bv = b.totalShares }
    else { av = a.yearsPlayed.length; bv = b.yearsPlayed.length }
    return dir === 'desc' ? bv - av : av - bv
  })

  const badges = computeBadges(data, historicalRaw, year)

  // Determine which badge types are present so the legend is dynamic
  const allBadges = Array.from(badges.values()).flat()
  const hasIronman        = allBadges.some((b) => b.emoji === '🏆')
  const hasWinsLeader     = allBadges.some((b) => b.emoji === '👑')
  const hasMoneyLeader    = allBadges.some((b) => b.emoji === '💰')
  const hasSsnWins        = allBadges.some((b) => b.emoji === '🔥')
  const hasSsnMoney       = allBadges.some((b) => b.emoji === '💸')

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="pb-2 pr-4 text-left">#</th>
              <th className="pb-2 pr-4 text-left">Player</th>
              <SortTh label="Years" col="yearsPlayed" current={sortCol} dir={dir} onClick={handleSort} />
              <SortTh label="Wins" col="totalShares" current={sortCol} dir={dir} onClick={handleSort} />
              <SortTh label="Total Won" col="totalWon" current={sortCol} dir={dir} onClick={handleSort} />
              <th className="pb-2 text-left">Badges</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => {
              const playerBadges = badges.get(entry.name) ?? []
              return (
                <tr key={entry.name} className="border-b border-gray-900 hover:bg-[#111]">
                  <td className="py-2 pr-4 text-gray-600">{i + 1}</td>
                  <td className="py-2 pr-4 text-white font-semibold">
                    {entry.isActive && (
                      <span className="mr-1" title="Active player">⭐</span>
                    )}
                    {entry.id && slug ? (
                      <Link
                        href={`/league/${slug}/player/${entry.id}`}
                        className="hover:text-[#39ff14] transition-colors"
                      >
                        {entry.name}
                      </Link>
                    ) : (
                      entry.name
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {yearRange(entry.yearsPlayed)}
                  </td>
                  <td className="py-2 pr-4 text-gray-300">{entry.totalShares}</td>
                  <td className="py-2 pr-4 font-bold text-[#39ff14]">
                    ${entry.totalWon.toLocaleString()}
                  </td>
                  <td className="py-2">
                    <span className="flex gap-1 flex-wrap">
                      {playerBadges.map((badge) => (
                        <span
                          key={badge.label}
                          title={badge.title}
                          className="text-base cursor-help"
                        >
                          {badge.emoji}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Dynamic legend — only shows badges that actually appear */}
      {allBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {hasIronman     && <span>🏆 Ironman — played all {IRONMAN_COUNT} seasons</span>}
          {hasWinsLeader  && <span>👑 {year ? `${year} Wins Leader` : 'Career Wins Leader'}</span>}
          {hasMoneyLeader && <span>💰 {year ? `${year} Money Leader` : 'Career Money Leader'}</span>}
          {hasSsnWins     && <span>🔥 Single-Season Wins Record</span>}
          {hasSsnMoney    && <span>💸 Single-Season Money Record</span>}
          {!year && <span className="text-gray-700">· ⭐ Active player</span>}
        </div>
      )}
    </div>
  )
}

// ── Team Table ────────────────────────────────────────────────────────────────

function TeamTable({ data }: { data: TeamEntry[] }) {
  const [sortCol, setSortCol] = useState<TeamSort>('thirteenRunWeeks')
  const [dir, setDir] = useState<Dir>('desc')

  function handleSort(col: string) {
    if (col === sortCol) {
      setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col as TeamSort)
      setDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = sortCol === 'thirteenRunWeeks' ? a.thirteenRunWeeks : a.totalPaidOut
    const bv = sortCol === 'thirteenRunWeeks' ? b.thirteenRunWeeks : b.totalPaidOut
    return dir === 'desc' ? bv - av : av - bv
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4 text-left">#</th>
            <th className="pb-2 pr-4 text-left">Team</th>
            <SortTh label="13-Run Weeks" col="thirteenRunWeeks" current={sortCol} dir={dir} onClick={handleSort} />
            <SortTh label="Total Paid Out" col="totalPaidOut" current={sortCol} dir={dir} onClick={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => (
            <tr key={entry.team} className="border-b border-gray-900 hover:bg-[#111]">
              <td className="py-2 pr-4 text-gray-600">{i + 1}</td>
              <td className="py-2 pr-4 text-white font-semibold">
                <Link
                  href={`/teams/${entry.team.toLowerCase()}`}
                  className="hover:text-[#39ff14] transition-colors underline decoration-dotted"
                >
                  {entry.team}
                </Link>
              </td>
              <td className="py-2 pr-4 text-[#39ff14] font-bold">{entry.thirteenRunWeeks}</td>
              <td className="py-2 text-gray-300">${entry.totalPaidOut.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function RankingsTabs({
  allTime,
  teams,
  slug,
  historicalRaw,
  year,
}: {
  allTime: AllTimeEntry[]
  teams: TeamEntry[]
  slug?: string
  historicalRaw?: HistoricalRow[]
  year?: number
}) {
  const [tab, setTab] = useState<'alltime' | 'teams' | 'log'>('alltime')

  const playerLabel = year ? `${year} Season Rankings` : 'All-Time Rankings'

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        <button
          onClick={() => setTab('alltime')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'alltime'
              ? 'text-[#39ff14] border-b-2 border-[#39ff14] -mb-px'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {playerLabel}
        </button>
        <button
          onClick={() => setTab('teams')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'teams'
              ? 'text-[#39ff14] border-b-2 border-[#39ff14] -mb-px'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Team Rankings
        </button>
        {year && (
          <button
            onClick={() => setTab('log')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'log'
                ? 'text-[#39ff14] border-b-2 border-[#39ff14] -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Season Log
          </button>
        )}
      </div>

      {tab === 'alltime' && (
        <AllTimeTable data={allTime} slug={slug} historicalRaw={historicalRaw} year={year} />
      )}
      {tab === 'teams' && (
        <TeamTable data={teams} />
      )}
      {tab === 'log' && year && slug && (
        <SeasonLog slug={slug} year={year} />
      )}
    </div>
  )
}
