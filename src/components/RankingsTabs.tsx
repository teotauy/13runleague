'use client'

import { useState } from 'react'

export interface AllTimeEntry {
  name: string
  totalWon: number
  totalShares: number
  yearsPlayed: number[]
  isActive: boolean
}

export interface TeamEntry {
  team: string
  thirteenRunWeeks: number
  totalPaidOut: number
  yearsWon: number[]
}

type AllTimeSort = 'totalWon' | 'totalShares' | 'yearsPlayed'
type TeamSort = 'thirteenRunWeeks' | 'totalPaidOut' | 'yearsWon'
type Dir = 'asc' | 'desc'

const ALL_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const IRONMAN_COUNT = ALL_YEARS.length

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

function AllTimeTable({ data }: { data: AllTimeEntry[] }) {
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

  return (
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
            const isIronman = entry.yearsPlayed.length === IRONMAN_COUNT
            return (
              <tr key={entry.name} className="border-b border-gray-900 hover:bg-[#111]">
                <td className="py-2 pr-4 text-gray-600">{i + 1}</td>
                <td className="py-2 pr-4 text-white font-semibold">
                  {entry.isActive && <span className="mr-1">⭐</span>}
                  {entry.name}
                </td>
                <td className="py-2 pr-4 text-gray-400">
                  {yearRange(entry.yearsPlayed)}
                </td>
                <td className="py-2 pr-4 text-gray-300">{entry.totalShares}</td>
                <td className="py-2 pr-4 font-bold text-[#39ff14]">${entry.totalWon.toLocaleString()}</td>
                <td className="py-2">
                  {isIronman && (
                    <span title="Ironman — played all 8 years" className="text-base">🏆</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

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
    let av: number, bv: number
    if (sortCol === 'thirteenRunWeeks') { av = a.thirteenRunWeeks; bv = b.thirteenRunWeeks }
    else if (sortCol === 'totalPaidOut') { av = a.totalPaidOut; bv = b.totalPaidOut }
    else { av = a.yearsWon.length; bv = b.yearsWon.length }
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
            <SortTh label="Years Won" col="yearsWon" current={sortCol} dir={dir} onClick={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => (
            <tr key={entry.team} className="border-b border-gray-900 hover:bg-[#111]">
              <td className="py-2 pr-4 text-gray-600">{i + 1}</td>
              <td className="py-2 pr-4 text-white font-semibold">{entry.team}</td>
              <td className="py-2 pr-4 text-[#39ff14] font-bold">{entry.thirteenRunWeeks}</td>
              <td className="py-2 pr-4 text-gray-300">${entry.totalPaidOut.toLocaleString()}</td>
              <td className="py-2 text-gray-400">
                {yearRange(entry.yearsWon)}
                <span className="text-gray-600 ml-1">({[...new Set(entry.yearsWon)].length})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function RankingsTabs({
  allTime,
  teams,
}: {
  allTime: AllTimeEntry[]
  teams: TeamEntry[]
}) {
  const [tab, setTab] = useState<'alltime' | 'teams'>('alltime')

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
          All-Time Rankings
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
      </div>

      {tab === 'alltime' ? (
        <AllTimeTable data={allTime} />
      ) : (
        <TeamTable data={teams} />
      )}

      <p className="mt-4 text-xs text-gray-700">
        🏆 Ironman — played all {IRONMAN_COUNT} seasons &nbsp;·&nbsp; ⭐ Active (2025)
      </p>
    </div>
  )
}
