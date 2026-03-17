'use client'

import Link from 'next/link'
import YearChart from './YearChart'
import MiniBar from './MiniBar'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const BASEBALL_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']

export interface ThirteenGame {
  game_date: string
  home_team: string
  away_team: string
  winning_team: string | null
  home_score: number
  away_score: number
}

export default function ThirteenRunLore({ games }: { games: ThirteenGame[] }) {
  if (games.length === 0) return null

  // ── By Franchise ─────────────────────────────────────────────────────────
  const franchiseMap = new Map<string, number>()
  for (const g of games) {
    if (g.winning_team) {
      franchiseMap.set(g.winning_team, (franchiseMap.get(g.winning_team) ?? 0) + 1)
    }
  }
  const franchiseRanked = [...franchiseMap.entries()].sort((a, b) => b[1] - a[1])
  const maxFranchise = franchiseRanked[0]?.[1] ?? 1

  // ── By Day of Week ────────────────────────────────────────────────────────
  const dayMap = new Map<string, number>()
  for (const g of games) {
    const d = new Date(g.game_date + 'T12:00:00Z')
    const name = DAY_NAMES[d.getUTCDay()]
    dayMap.set(name, (dayMap.get(name) ?? 0) + 1)
  }
  const dayOrdered = DAY_NAMES.map((d) => [d, dayMap.get(d) ?? 0] as [string, number])
  const maxDay = Math.max(...dayOrdered.map(([, v]) => v), 1)
  const peakDay = dayOrdered.reduce((a, b) => (b[1] > a[1] ? b : a))[0]

  // ── Home vs. Visitor ──────────────────────────────────────────────────────
  let homeWins = 0
  let awayWins = 0
  for (const g of games) {
    if (!g.winning_team) continue
    if (g.winning_team === g.home_team) homeWins++
    else awayWins++
  }
  const hvTotal = homeWins + awayWins
  const homePct = hvTotal > 0 ? Math.round((homeWins / hvTotal) * 100) : 50

  // ── By Month ──────────────────────────────────────────────────────────────
  const monthMap = new Map<string, number>()
  for (const g of games) {
    const d = new Date(g.game_date + 'T12:00:00Z')
    const name = MONTH_NAMES[d.getUTCMonth()]
    monthMap.set(name, (monthMap.get(name) ?? 0) + 1)
  }
  const monthOrdered = BASEBALL_MONTHS.map((m) => [m, monthMap.get(m) ?? 0] as [string, number])
  const maxMonth = Math.max(...monthOrdered.map(([, v]) => v), 1)
  const peakMonth = monthOrdered.reduce((a, b) => (b[1] > a[1] ? b : a))[0]

  // ── By Year ───────────────────────────────────────────────────────────────
  const yearMap = new Map<number, number>()
  for (const g of games) {
    const yr = parseInt(g.game_date.slice(0, 4), 10)
    yearMap.set(yr, (yearMap.get(yr) ?? 0) + 1)
  }
  const yearOrdered = [...yearMap.entries()].sort((a, b) => a[0] - b[0])
  const maxYear = Math.max(...yearOrdered.map(([, v]) => v), 1)
  const totalYears = yearOrdered.length
  const firstYear = yearOrdered[0]?.[0]
  const lastYear = yearOrdered[yearOrdered.length - 1]?.[0]
  const peakYearEntry = yearOrdered.reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0] as [number, number])

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">13-Run Lore</h2>
        <span className="text-xs text-gray-600 font-mono">
          {games.length.toLocaleString()} all-time
          {firstYear && lastYear && firstYear !== lastYear ? ` · ${firstYear}–${lastYear}` : ''}
        </span>
      </div>

      {/* Top row — franchise + day of week */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">

        {/* ── Franchise ── */}
        <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            By Franchise
          </h3>
          {franchiseRanked.length === 0 ? (
            <p className="text-gray-600 text-xs">No data yet</p>
          ) : (
            <div className="space-y-2.5">
              {franchiseRanked.slice(0, 10).map(([team, count], i) => (
                <div key={team} className="flex items-center gap-2">
                  <span className={`text-xs font-mono w-3 ${i === 0 ? 'text-[#39ff14]' : 'text-gray-700'}`}>
                    {i === 0 ? '▸' : ''}
                  </span>
                  <Link
                    href={`/teams/${team.toLowerCase()}`}
                    className="text-xs font-mono text-white w-8 shrink-0 hover:text-[#39ff14] transition-colors underline decoration-dotted"
                  >
                    {team}
                  </Link>
                  <MiniBar value={count} max={maxFranchise} />
                  <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
              {franchiseRanked.length > 10 && (
                <p className="text-xs text-gray-700 mt-1 pl-5">
                  +{franchiseRanked.length - 10} other franchises
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Day of Week ── */}
        <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
            By Day of Week
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            {peakDay}s are cursed
          </p>
          <div className="space-y-2.5">
            {dayOrdered.map(([day, count]) => (
              <div key={day} className="flex items-center gap-2">
                <span className={`text-xs font-mono w-7 ${day === peakDay ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                  {day}
                </span>
                <MiniBar value={count} max={maxDay} dim={count === 0} />
                <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">
                  {count > 0 ? count.toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Middle row — home/visitor + month */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">

        {/* ── Home vs. Visitor ── */}
        <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Home vs. Visitor
          </h3>
          {(() => {
            const R = 60, r = 38, cx = 80, cy = 70
            const homeFrac = hvTotal > 0 ? homeWins / hvTotal : 0.5
            const angle = homeFrac * 2 * Math.PI - Math.PI / 2
            const startAngle = -Math.PI / 2
            const homeX1 = cx + R * Math.cos(startAngle), homeY1 = cy + R * Math.sin(startAngle)
            const homeX2 = cx + R * Math.cos(angle),     homeY2 = cy + R * Math.sin(angle)
            const iX1 = cx + r * Math.cos(startAngle),   iY1 = cy + r * Math.sin(startAngle)
            const iX2 = cx + r * Math.cos(angle),        iY2 = cy + r * Math.sin(angle)
            const large = homeFrac > 0.5 ? 1 : 0
            return (
              <div className="flex items-center gap-6">
                <svg width="160" height="140" viewBox="0 0 160 140" className="shrink-0">
                  {/* Away slice (full circle background) */}
                  <circle cx={cx} cy={cy} r={R} fill="#92400e" />
                  <circle cx={cx} cy={cy} r={r} fill="#111" />
                  {/* Home slice */}
                  <path
                    d={`M ${homeX1} ${homeY1} A ${R} ${R} 0 ${large} 1 ${homeX2} ${homeY2} L ${iX2} ${iY2} A ${r} ${r} 0 ${large} 0 ${iX1} ${iY1} Z`}
                    fill="#39ff14"
                  />
                  {/* Center label */}
                  <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="13" fontWeight="900" fontFamily="monospace">
                    {homePct}%
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="monospace">
                    HOME
                  </text>
                  {/* Legend dots */}
                  <circle cx="10" cy="128" r="5" fill="#39ff14" />
                  <text x="20" y="132" fill="#9ca3af" fontSize="9" fontFamily="monospace">Home {homeWins.toLocaleString()}</text>
                  <circle cx="10" cy="140" r="5" fill="#92400e" />
                  <text x="20" y="144" fill="#9ca3af" fontSize="9" fontFamily="monospace">Away {awayWins.toLocaleString()}</text>
                </svg>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {homeWins > awayWins
                      ? 'Home teams score 13 more often — home field advantage is real.'
                      : homeWins < awayWins
                      ? 'Visitors score 13 more often — road rage is real.'
                      : 'Dead even split between home and away.'}
                  </p>
                  <p className="text-xs text-gray-700">
                    {hvTotal.toLocaleString()} games tracked
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── By Month ── */}
        <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
            By Month
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            {peakMonth} is the most dangerous month
          </p>
          <div className="space-y-2.5">
            {monthOrdered.map(([month, count]) => (
              <div key={month} className="flex items-center gap-2">
                <span className={`text-xs font-mono w-7 ${month === peakMonth ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                  {month}
                </span>
                <MiniBar value={count} max={maxMonth} dim={count === 0} />
                <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">
                  {count > 0 ? count.toLocaleString() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom row — by year interactive chart (full width, client component) */}
      {yearOrdered.length >= 2 && (
        <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
          <YearChart
            yearData={yearOrdered}
            minYr={firstYear!}
            maxYr={lastYear!}
            maxCount={maxYear}
            peakYear={peakYearEntry[0]}
            peakCount={peakYearEntry[1]}
          />
        </div>
      )}

    </section>
  )
}
