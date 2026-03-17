'use client'

import { useState, useCallback, useRef } from 'react'

// Key MLB structural milestones — shown in hover tooltip
const MILESTONES: Record<number, string> = {
  1901: 'AL founded · 16 teams · ~140-game schedule',
  1920: 'Live ball era begins · offense surges',
  1930: 'Peak offensive season — highest-scoring year of the century',
  1961: 'AL expands to 10 teams · schedule → 162 games',
  1962: 'NL expands · 20 teams total · everyone plays 162',
  1969: 'MLB expands to 24 teams · divisional play begins',
  1977: 'AL adds Blue Jays & Mariners · 26 teams',
  1993: 'Marlins & Rockies join · 28 teams',
  1994: '⚡ Strike — season ended Aug 11, no World Series',
  1998: 'Devil Rays & Diamondbacks · 30 teams · modern era',
  2020: '⚡ COVID — 60-game season',
}

const SVG_W = 800
const SVG_H = 72
const LEAGUE_YEAR = 2018

interface Props {
  yearData: [number, number][]  // [year, count][]
  minYr: number
  maxYr: number
  maxCount: number
  peakYear: number
  peakCount: number
}

export default function YearChart({ yearData, minYr, maxYr, maxCount, peakYear, peakCount }: Props) {
  const [hovered, setHovered] = useState<{ yr: number; svgX: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' })
  }

  const yrSpan = maxYr - minYr
  const xOf = useCallback(
    (yr: number) => (yrSpan > 0 ? ((yr - minYr) / yrSpan) * SVG_W : 0),
    [minYr, yrSpan]
  )

  const countByYear = new Map(yearData)

  // Build points for every calendar year in range
  type Pt = { yr: number; x: number; y: number; league: boolean }
  const pts: Pt[] = []
  for (let yr = minYr; yr <= maxYr; yr++) {
    const count = countByYear.get(yr) ?? 0
    const x = xOf(yr)
    const y = count > 0 ? SVG_H - (count / maxCount) * (SVG_H - 4) : SVG_H
    pts.push({ yr, x, y, league: yr >= LEAGUE_YEAR })
  }

  const toD = (subset: Pt[]) => {
    if (subset.length === 0) return ''
    const first = subset[0]
    const last = subset[subset.length - 1]
    return (
      `M ${first.x.toFixed(1)} ${SVG_H} ` +
      subset.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
      ` L ${last.x.toFixed(1)} ${SVG_H} Z`
    )
  }
  const toLine = (subset: Pt[]) =>
    subset.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Gray area: all pre-league points + the 2018 point to avoid a gap
  const histPts = pts.filter((p) => p.yr <= LEAGUE_YEAR)

  // Green area: 2017 point (shared boundary) + all league-era points
  const pt2017 = pts.find((p) => p.yr === LEAGUE_YEAR - 1)
  const leaguePts = pt2017
    ? [pt2017, ...pts.filter((p) => p.league)]
    : pts.filter((p) => p.league)

  // Decade and milestone ticks
  const firstDecade = Math.ceil(minYr / 20) * 20
  const decadeTicks: number[] = []
  for (let y = firstDecade; y <= maxYr; y += 20) decadeTicks.push(y)

  const milestoneTicks = Object.keys(MILESTONES)
    .map(Number)
    .filter((y) => y >= minYr && y <= maxYr)

  // Hover handling — map pixel x to year
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      const svg = e.currentTarget.closest('svg')
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const fraction = (e.clientX - rect.left) / rect.width
      const yr = Math.round(minYr + fraction * yrSpan)
      const clamped = Math.max(minYr, Math.min(maxYr, yr))
      setHovered({ yr: clamped, svgX: xOf(clamped) })
    },
    [minYr, yrSpan, xOf]
  )
  const handleMouseLeave = useCallback(() => setHovered(null), [])

  // Tooltip data
  const hoveredCount = hovered ? (countByYear.get(hovered.yr) ?? 0) : 0
  const hoveredY =
    hoveredCount > 0 ? SVG_H - (hoveredCount / maxCount) * (SVG_H - 4) : SVG_H
  const isLeagueEra = hovered ? hovered.yr >= LEAGUE_YEAR : false

  // Find nearest milestone within ±2 years of hover
  const nearestMilestoneYr = hovered
    ? milestoneTicks.reduce<number | null>((best, my) => {
        const dist = Math.abs(my - hovered.yr)
        if (dist > 2) return best
        if (best === null) return my
        return dist < Math.abs(best - hovered.yr) ? my : best
      }, null)
    : null

  // Tooltip x positioning — flip when near right edge
  const tooltipLeft =
    hovered ? `${(hovered.svgX / SVG_W) * 100}%` : '50%'
  const tooltipTranslate =
    hovered && hovered.svgX > SVG_W * 0.65
      ? 'translateX(-100%)'
      : hovered && hovered.svgX < SVG_W * 0.25
      ? 'translateX(0%)'
      : 'translateX(-50%)'

  // Make chart wide enough to see all years clearly — ~7px per year
  const chartPxWidth = Math.max(SVG_W, Math.round(yrSpan * 7))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          By Year
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-700 font-mono">
            {minYr}–{maxYr} · peak {peakYear} ({peakCount.toLocaleString()} games)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => scrollBy('left')}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-xs"
              aria-label="Scroll left"
            >←</button>
            <button
              onClick={() => scrollBy('right')}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-xs"
              aria-label="Scroll right"
            >→</button>
          </div>
        </div>
      </div>

      {/* Chart area — horizontally scrollable */}
      <div ref={scrollRef} className="overflow-x-auto pb-1">
      <div className="relative" style={{ minWidth: `${chartPxWidth}px` }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          style={{ width: `${chartPxWidth}px`, height: '80px', cursor: 'crosshair' }}
        >
          <defs>
            <linearGradient id="ychart-grad-hist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#374151" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="ychart-grad-league" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39ff14" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#39ff14" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Baseline */}
          <line x1="0" y1={SVG_H} x2={SVG_W} y2={SVG_H} stroke="#1f2937" strokeWidth="1" />

          {/* Milestone dashes on baseline */}
          {milestoneTicks.map((yr) => (
            <line
              key={yr}
              x1={xOf(yr).toFixed(1)} y1={SVG_H - 5}
              x2={xOf(yr).toFixed(1)} y2={SVG_H}
              stroke="#6b7280" strokeWidth="1.5"
            />
          ))}

          {/* Gray historical area */}
          {histPts.length > 1 && (
            <>
              <path d={toD(histPts)} fill="url(#ychart-grad-hist)" />
              <polyline
                points={toLine(histPts)}
                fill="none" stroke="#4b5563" strokeWidth="1" strokeLinejoin="round"
              />
            </>
          )}

          {/* Green league-era area — starts at shared 2017 boundary point */}
          {leaguePts.length > 1 && (
            <>
              <path d={toD(leaguePts)} fill="url(#ychart-grad-league)" />
              <polyline
                points={toLine(leaguePts)}
                fill="none" stroke="#39ff14" strokeWidth="1.5" strokeLinejoin="round"
              />
            </>
          )}

          {/* Decade ticks */}
          {decadeTicks.map((yr) => (
            <line
              key={yr}
              x1={xOf(yr).toFixed(1)} y1={SVG_H - 3}
              x2={xOf(yr).toFixed(1)} y2={SVG_H}
              stroke="#374151" strokeWidth="1"
            />
          ))}

          {/* Hover crosshair */}
          {hovered && (
            <>
              <line
                x1={hovered.svgX.toFixed(1)} y1="0"
                x2={hovered.svgX.toFixed(1)} y2={SVG_H}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />
              {hoveredCount > 0 && (
                <circle
                  cx={hovered.svgX.toFixed(1)}
                  cy={hoveredY.toFixed(1)}
                  r="3"
                  fill={isLeagueEra ? '#39ff14' : '#9ca3af'}
                  stroke={isLeagueEra ? '#39ff14' : '#6b7280'}
                  strokeWidth="1"
                />
              )}
            </>
          )}

          {/* Invisible full-area mouse trap */}
          <rect
            x="0" y="0" width={SVG_W} height={SVG_H}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute bottom-full mb-1.5 pointer-events-none z-20"
            style={{ left: tooltipLeft, transform: tooltipTranslate }}
          >
            <div className="bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-xs min-w-[160px] max-w-[240px]">
              <div className="flex items-center justify-between gap-4 mb-0.5">
                <span className="font-bold text-white font-mono">{hovered.yr}</span>
                {isLeagueEra && (
                  <span className="text-[10px] text-[#39ff14] font-mono">SBK era</span>
                )}
              </div>
              <div className={`font-mono ${isLeagueEra ? 'text-[#39ff14]' : 'text-gray-300'}`}>
                {hoveredCount > 0
                  ? `${hoveredCount} thirteen-run game${hoveredCount !== 1 ? 's' : ''}`
                  : <span className="text-gray-600">no data</span>
                }
              </div>
              {nearestMilestoneYr !== null && MILESTONES[nearestMilestoneYr] && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-800 text-gray-500 leading-snug">
                  {nearestMilestoneYr !== hovered.yr && (
                    <span className="text-gray-600 mr-1">{nearestMilestoneYr}:</span>
                  )}
                  {MILESTONES[nearestMilestoneYr]}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Axis labels — scrolls with chart */}
      <div className="relative h-4 mt-0.5">
        {decadeTicks.map((yr) => (
          <span
            key={yr}
            className="absolute text-xs text-gray-700 font-mono -translate-x-1/2"
            style={{ left: `${(xOf(yr) / SVG_W) * 100}%` }}
          >
            {yr}
          </span>
        ))}
      </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-700">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-1.5 bg-gray-600 rounded" />
          MLB history
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-1.5 bg-[#39ff14] rounded" />
          South Brooklyn era (2018–)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1 h-3 bg-gray-500" />
          MLB milestone — hover to read
        </span>
      </div>
    </div>
  )
}
