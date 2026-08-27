'use client'

import { useMemo, useState } from 'react'
import MiniBar from './MiniBar'
import {
  CONSECUTIVE_AS_OF,
  CONSECUTIVE_STREAKS,
  ERA_STATS,
  type ConsecutiveStreak,
  type EraKey,
} from '@/data/consecutiveThirteenDays'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function fmtRange(start: string, end: string): string {
  const [ys, ms, ds] = start.split('-').map(Number)
  const [ye, me, de] = end.split('-').map(Number)
  if (ys === ye && ms === me) return `${MONTHS[ms - 1]} ${ds}–${de}, ${ys}`
  if (ys === ye) return `${MONTHS[ms - 1]} ${ds} – ${MONTHS[me - 1]} ${de}, ${ys}`
  return `${MONTHS[ms - 1]} ${ds}, ${ys} – ${MONTHS[me - 1]} ${de}, ${ye}`
}

function fmtDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

function nextIsoDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  return dt.toISOString().slice(0, 10)
}

function HighlightThirteen({ text }: { text: string }) {
  const parts = text.split(/(13)/g)
  return (
    <>
      {parts.map((part, i) =>
        part === '13' ? (
          <span key={i} className="text-[#39ff14] font-bold">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function StreakTable({
  streaks,
  emptyLabel,
}: {
  streaks: ConsecutiveStreak[]
  emptyLabel: string
}) {
  if (streaks.length === 0) {
    return <p className="text-gray-500 text-sm">{emptyLabel}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 text-left">
            <th className="pb-2 pr-4">Dates</th>
            <th className="pb-2">13-run teams, in order</th>
          </tr>
        </thead>
        <tbody>
          {streaks.map((s) => (
            <tr key={s.start} className="border-b border-gray-900 hover:bg-white/[0.03]">
              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{fmtRange(s.start, s.end)}</td>
              <td className="py-2 text-gray-300">{s.games.map((g) => g.team).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BoxScores({ streak }: { streak: ConsecutiveStreak }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 text-left">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Score</th>
            <th className="pb-2">13-run team</th>
          </tr>
        </thead>
        <tbody>
          {streak.games.map((g) => (
            <tr key={`${g.date}-${g.score}`} className="border-b border-gray-900">
              <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{fmtDay(g.date)}</td>
              <td className="py-2 pr-4 text-gray-300">
                <HighlightThirteen text={g.score} />
              </td>
              <td className="py-2 text-[#39ff14] font-bold">{g.team}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ConsecutiveDaysExplorer({ today }: { today: string }) {
  const [era, setEra] = useState<EraKey>('all')
  const stats = ERA_STATS[era]
  const streaks = useMemo(
    () => (era === 'all' ? CONSECUTIVE_STREAKS : CONSECUTIVE_STREAKS.filter((s) => s.year >= 1901)),
    [era]
  )
  const five = streaks.filter((s) => s.length === 5)
  const four = streaks.filter((s) => s.length === 4)
  const three = streaks.filter((s) => s.length === 3)

  const decadeKeys = Object.keys(stats.decades).sort()
  const maxDecade = Math.max(...decadeKeys.map((k) => stats.decades[k] ?? 0), 1)
  const maxLen = Math.max(stats.exactly3, stats.exactly4, stats.exactly5, 1)

  const latest = [...CONSECUTIVE_STREAKS].sort((a, b) => b.end.localeCompare(a.end))[0]
  const liveCouldExtend = Boolean(latest && today === nextIsoDay(latest.end) && latest.length >= 3)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'All history (1871–2026)'],
          ['modern', 'Modern era (1901–2026)'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setEra(key)}
            className={
              era === key
                ? 'px-3 py-1 rounded-full text-sm font-bold bg-[#39ff14] text-black'
                : 'px-3 py-1 rounded-full text-sm bg-[#1a1a1a] text-gray-400 border border-[#333] hover:text-white'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4">
          <p className="section-label mb-2">3+ consecutive days</p>
          <p className="text-4xl font-black text-[#39ff14]">{stats.ge3}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.exactly3} stopped at exactly 3</p>
        </div>
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4">
          <p className="section-label mb-2">Reached 4 days</p>
          <p className="text-4xl font-black text-white">{stats.ge4}</p>
          <p className="text-xs text-gray-500 mt-1">{stats.exactly4} stopped at 4</p>
        </div>
        <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4">
          <p className="section-label mb-2">Longest streak</p>
          <p className="text-4xl font-black text-[#39ff14]">5 days</p>
          <p className="text-xs text-gray-500 mt-1">
            Happened {stats.exactly5} {stats.exactly5 === 1 ? 'time' : 'times'}. Never 6.
          </p>
        </div>
      </div>

      {liveCouldExtend && latest && (
        <div className="rounded-xl border border-[#39ff14]/30 bg-[#39ff14]/5 px-4 py-3">
          <p className="text-sm font-bold text-[#39ff14] mb-1">A 3-day streak is live</p>
          <p className="text-sm text-gray-300">
            {fmtRange(latest.start, latest.end)} already has a 13-run game each day
            ({latest.games.map((g) => g.team).join(', ')}). Tonight could make it four in a row.
          </p>
        </div>
      )}

      <section className="module-card">
        <p className="section-label mb-1">By Decade</p>
        <h2 className="text-lg font-bold mb-1">When 3-in-a-row actually happens</h2>
        <p className="text-gray-500 text-xs mb-4">
          Distinct streaks of at least 3 calendar days. The 1990s are the peak.
        </p>
        <div className="space-y-2.5">
          {decadeKeys.map((k) => {
            const count = stats.decades[k] ?? 0
            const peak = count === maxDecade
            return (
              <div key={k} className="flex items-center gap-2">
                <span className={`text-xs font-mono w-12 ${peak ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                  {k}s
                </span>
                <MiniBar value={count} max={maxDecade} dim={count === 0} />
                <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="module-card">
        <p className="section-label mb-1">By Length</p>
        <h2 className="text-lg font-bold mb-1">How rare is each streak</h2>
        <p className="text-gray-500 text-xs mb-4">
          Among {stats.games.toLocaleString()} thirteen-run games on {stats.dates.toLocaleString()} dates
          {era === 'modern' ? ' since 1901' : ''}. Isolated 1-day and 2-day clusters are omitted here.
        </p>
        <div className="space-y-2.5">
          {[
            ['3 days', stats.exactly3],
            ['4 days', stats.exactly4],
            ['5 days', stats.exactly5],
          ].map(([label, count]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs font-mono w-14 text-gray-500">{label}</span>
              <MiniBar value={count as number} max={maxLen} />
              <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 font-mono">
          Also: {(stats.byLen['1'] ?? 0).toLocaleString()} isolated 13-run days · {stats.byLen['2'] ?? 0} two-day clusters · 0 six-day streaks
        </p>
      </section>

      <section>
        <p className="section-label mb-1">The Record</p>
        <h2 className="text-lg font-bold mb-2">Five consecutive days</h2>
        <p className="text-gray-400 text-sm mb-4">
          Five is the maximum. It has happened {stats.exactly5} {stats.exactly5 === 1 ? 'time' : 'times'}
          {era === 'modern' ? ' since 1901' : ' in recorded MLB history'}. Never six.
        </p>
        <div className="space-y-3">
          {five.map((s) => (
            <div key={s.start} className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3 className="font-bold">{fmtRange(s.start, s.end)}</h3>
                <span className="text-xs font-mono text-[#39ff14] shrink-0">5 days</span>
              </div>
              <BoxScores streak={s} />
            </div>
          ))}
        </div>
      </section>

      <section className="module-card">
        <p className="section-label mb-1">Four in a Row</p>
        <h2 className="text-lg font-bold mb-2">Every 4-day streak</h2>
        <p className="text-gray-400 text-sm mb-4">
          Four consecutive days has happened {stats.ge4} times{era === 'modern' ? ' since 1901' : ''} — {stats.exactly4} stopped at four, and {stats.exactly5} kept going to five.
        </p>
        <StreakTable streaks={four} emptyLabel="No 4-day streaks in this era." />
        <div className="mt-4 space-y-2">
          {four.map((s) => (
            <details key={s.start} className="rounded-lg border border-gray-800 bg-[#111]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-mono text-gray-300 hover:text-white">
                {fmtRange(s.start, s.end)}
                <span className="text-gray-500 ml-2">{s.games.length} games</span>
              </summary>
              <div className="px-4 pb-4">
                <BoxScores streak={s} />
              </div>
            </details>
          ))}
        </div>
      </section>

      <section>
        <p className="section-label mb-1">Three in a Row</p>
        <h2 className="text-lg font-bold mb-2">All {three.length} streaks of exactly 3 days</h2>
        <StreakTable streaks={three} emptyLabel="No 3-day streaks in this era." />
      </section>

      <p className="text-xs text-gray-500">
        Counts through {CONSECUTIVE_AS_OF}. A day counts if any regular-season team scored exactly 13.
        Multiple 13-run games on the same date still count as one day. Streaks are consecutive calendar days.
        Postseason games did not create or extend any 3+ day streak.
      </p>
    </div>
  )
}
