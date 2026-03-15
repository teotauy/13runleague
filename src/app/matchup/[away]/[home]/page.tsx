import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { getTeamColor } from '@/lib/teamColors'
import YearChart from '@/components/YearChart'
import Link from 'next/link'

export const revalidate = 3600

interface Props {
  params: Promise<{ away: string; home: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { away, home } = await params
  const awayAbbr = away.toUpperCase()
  const homeAbbr = home.toUpperCase()
  const title = `${awayAbbr} @ ${homeAbbr} — 13-Run Matchup History`
  const ogUrl = `/api/og?title=${encodeURIComponent(`${awayAbbr} @ ${homeAbbr}`)}&subtitle=${encodeURIComponent('13-run matchup history since 1901')}`
  return {
    title,
    openGraph: { title, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [ogUrl] },
  }
}

// Baseball months only
const BASEBALL_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'] as const
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function dayOfWeek(dateStr: string): number {
  // Parse YYYY-MM-DD at noon to avoid any UTC-offset day shift
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getDay()
}

export default async function MatchupPage({ params }: Props) {
  const { away, home } = await params
  const awayAbbr = away.toUpperCase()
  const homeAbbr = home.toUpperCase()

  const awayInfo = getTeamColor(awayAbbr)
  const homeInfo = getTeamColor(homeAbbr)
  const supabase = createServiceClient()

  // All games ever played between these two teams (both directions) — for run distribution
  const { data: allGames } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, home_score, away_score, winning_team, was_thirteen')
    .or(
      `and(away_team.eq.${awayAbbr},home_team.eq.${homeAbbr}),and(away_team.eq.${homeAbbr},home_team.eq.${awayAbbr})`
    )
    .order('game_date', { ascending: false })

  const games = allGames ?? []

  // ── 13-run games ────────────────────────────────────────────────────────────

  const thirteenGames = games.filter((g) => g.was_thirteen)

  // Away team 13s vs Home team 13s specifically in this direction (AWAY @ HOME)
  const awayTeam13s = thirteenGames.filter(
    (g) => g.away_team === awayAbbr && g.home_team === homeAbbr && g.away_score === 13
  )
  const homeTeam13s = thirteenGames.filter(
    (g) => g.away_team === awayAbbr && g.home_team === homeAbbr && g.home_score === 13
  )

  const gameCount = games.length

  // ── Year chart (all 13-run games between these two teams) ───────────────────

  const yearMap = new Map<number, number>()
  for (const g of thirteenGames) {
    const yr = parseInt(g.game_date.slice(0, 4), 10)
    yearMap.set(yr, (yearMap.get(yr) ?? 0) + 1)
  }
  const yearOrdered = [...yearMap.entries()].sort((a, b) => a[0] - b[0])
  const firstYear = yearOrdered[0]?.[0]
  const lastYear  = yearOrdered[yearOrdered.length - 1]?.[0]
  const maxYearCount = Math.max(...yearOrdered.map(([, v]) => v), 1)
  const peakYearEntry = yearOrdered.reduce(
    (a, b) => (b[1] > a[1] ? b : a),
    [0, 0] as [number, number]
  )

  // ── Month breakdown ─────────────────────────────────────────────────────────

  const monthMap = new Map<string, number>()
  for (const g of thirteenGames) {
    const mo = parseInt(g.game_date.slice(5, 7), 10) - 1
    const moName = MONTH_NAMES[mo]
    if (moName) monthMap.set(moName, (monthMap.get(moName) ?? 0) + 1)
  }
  const monthOrdered = BASEBALL_MONTHS.map(
    (m) => [m, monthMap.get(m) ?? 0] as [string, number]
  )
  const maxMonthCount = Math.max(...monthOrdered.map(([, v]) => v), 1)
  const peakMonth = monthOrdered.reduce((a, b) => (b[1] > a[1] ? b : a))[0]

  // ── Day of week ─────────────────────────────────────────────────────────────

  const dowMap = new Map<number, number>()
  for (const g of thirteenGames) {
    const dow = dayOfWeek(g.game_date)
    dowMap.set(dow, (dowMap.get(dow) ?? 0) + 1)
  }
  const dowOrdered = DAY_NAMES.map((name, i) => [name, dowMap.get(i) ?? 0] as [string, number])
  const maxDowCount = Math.max(...dowOrdered.map(([, v]) => v), 1)
  const peakDay = dowOrdered.reduce((a, b) => (b[1] > a[1] ? b : a))[0]

  const total13s = thirteenGames.length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <header>
          <Link href="/" className="text-gray-600 text-sm hover:text-gray-400 mb-4 inline-block">
            ← Dashboard
          </Link>
          <h1 className="text-4xl font-black font-mono">
            <span style={{ color: awayInfo.primaryColor }}>{awayAbbr}</span>
            <span className="text-gray-600 mx-2">@</span>
            <span style={{ color: homeInfo.primaryColor }}>{homeAbbr}</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {awayInfo.name} visiting {homeInfo.name} · 13-run matchup history
          </p>
        </header>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-xs font-mono">
            🎮 <span className="text-white font-bold">{gameCount}</span> games tracked
          </span>
          <span className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-xs font-mono">
            ⚡ <span className="text-[#39ff14] font-bold">{total13s}</span> 13-run games
          </span>
        </div>

        {/* Who's scored 13 against whom */}
        {total13s > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-800 bg-[#111] p-5 text-center">
              <div className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">
                {awayAbbr} scored 13 (away)
              </div>
              <div className="text-5xl font-black tabular-nums" style={{ color: awayInfo.primaryColor }}>
                {awayTeam13s.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {gameCount > 0
                  ? `${((awayTeam13s.length / gameCount) * 100).toFixed(1)}% of matchups`
                  : 'times'}
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#111] p-5 text-center">
              <div className="text-xs text-gray-500 font-mono mb-2 uppercase tracking-widest">
                {homeAbbr} scored 13 (home)
              </div>
              <div className="text-5xl font-black tabular-nums" style={{ color: homeInfo.primaryColor }}>
                {homeTeam13s.length}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {gameCount > 0
                  ? `${((homeTeam13s.length / gameCount) * 100).toFixed(1)}% of matchups`
                  : 'times'}
              </div>
            </div>
          </div>
        )}

        {total13s === 0 && (
          <div className="rounded border border-gray-800 bg-[#111] px-6 py-12 text-center space-y-2">
            <div className="text-gray-500 font-mono text-lg">No 13-run games on record</div>
            <div className="text-gray-700 text-sm">
              {awayAbbr} and {homeAbbr} have never combined for a 13-run game in our database.
            </div>
          </div>
        )}

        {/* Year chart */}
        {yearOrdered.length >= 2 && firstYear && lastYear && (
          <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              13-Run Games by Year
            </h2>
            <YearChart
              yearData={yearOrdered}
              minYr={firstYear}
              maxYr={lastYear}
              maxCount={maxYearCount}
              peakYear={peakYearEntry[0]}
              peakCount={peakYearEntry[1]}
            />
          </div>
        )}

        {/* By Month + By Day of Week */}
        {total13s > 0 && (
          <div className="grid sm:grid-cols-2 gap-4">

            {/* By Month */}
            <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                By Month
              </h2>
              <div className="space-y-2">
                {monthOrdered.map(([month, count]) => (
                  <div key={month} className="flex items-center gap-2">
                    <span className={`text-xs font-mono w-7 shrink-0 ${month === peakMonth && count > 0 ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                      {month}
                    </span>
                    <div className="flex-1 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${month === peakMonth && count > 0 ? 'bg-[#39ff14]' : 'bg-gray-700'}`}
                        style={{ width: maxMonthCount > 0 ? `${(count / maxMonthCount) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-5 text-right shrink-0">
                      {count > 0 ? count : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {peakMonth && monthMap.size > 0 && (
                <p className="text-xs text-gray-700 mt-3">
                  {peakMonth} is the hottest month for 13s in this matchup
                </p>
              )}
            </div>

            {/* By Day of Week */}
            <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                By Day of Week
              </h2>
              <div className="space-y-2">
                {dowOrdered.map(([day, count]) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className={`text-xs font-mono w-7 shrink-0 ${day === peakDay && count > 0 ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                      {day}
                    </span>
                    <div className="flex-1 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${day === peakDay && count > 0 ? 'bg-[#39ff14]' : 'bg-gray-700'}`}
                        style={{ width: maxDowCount > 0 ? `${(count / maxDowCount) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-5 text-right shrink-0">
                      {count > 0 ? count : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {peakDay && dowMap.size > 0 && (
                <p className="text-xs text-gray-700 mt-3">
                  {peakDay} is the most dangerous day for 13s in this matchup
                </p>
              )}
            </div>

          </div>
        )}


        {/* Full 13-run game log */}
        {total13s > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">
              All <span className="text-[#39ff14]">13</span>-Run Games
              <span className="text-gray-600 text-sm font-normal ml-2 font-mono">{total13s} total</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800 text-left">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Matchup</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2">Who scored 13</th>
                  </tr>
                </thead>
                <tbody>
                  {thirteenGames.map((g) => {
                    const winner = g.winning_team
                    const winnerInfo = getTeamColor(winner ?? '')
                    return (
                      <tr
                        key={`${g.game_date}-${g.home_team}-${g.away_team}`}
                        className="border-b border-gray-900 hover:bg-[#111]"
                      >
                        <td className="py-2 pr-4 text-gray-400">{g.game_date}</td>
                        <td className="py-2 pr-4 text-gray-300">
                          {g.away_team} @ {g.home_team}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={g.away_score === 13 ? 'text-[#39ff14] font-bold' : 'text-gray-400'}>
                            {g.away_score}
                          </span>
                          <span className="text-gray-600 mx-1">–</span>
                          <span className={g.home_score === 13 ? 'text-[#39ff14] font-bold' : 'text-gray-400'}>
                            {g.home_score}
                          </span>
                        </td>
                        <td className="py-2 font-bold" style={{ color: winnerInfo.primaryColor }}>
                          {winner}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-900 pt-6 text-gray-700 text-xs space-y-2">
          <p>
            The information used here was obtained free of charge from and is copyrighted by{' '}
            <a
              href="https://www.retrosheet.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-500"
            >
              Retrosheet
            </a>
            . Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <Link href={`/teams/${awayAbbr.toLowerCase()}`} className="hover:text-gray-500 transition-colors">
              {awayAbbr} franchise →
            </Link>
            <span className="text-gray-800">·</span>
            <Link href={`/teams/${homeAbbr.toLowerCase()}`} className="hover:text-gray-500 transition-colors">
              {homeAbbr} franchise →
            </Link>
            <span className="text-gray-800">·</span>
            <Link href="/" className="hover:text-gray-500 transition-colors">
              Live Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </main>
  )
}

