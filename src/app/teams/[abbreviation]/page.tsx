import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { TEAM_COLORS, getTeamColor } from '@/lib/teamColors'
import YearChart from '@/components/YearChart'
import MiniBar from '@/components/MiniBar'
import OpponentChart, { type OppEntry } from '@/components/OpponentChart'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600

// Pre-build a page for every known MLB franchise
export async function generateStaticParams() {
  return Object.keys(TEAM_COLORS).map((abbr) => ({
    abbreviation: abbr.toLowerCase(),
  }))
}

interface Props {
  params: Promise<{ abbreviation: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ abbreviation: string }> }): Promise<Metadata> {
  const { abbreviation } = await params
  const abbr = abbreviation.toUpperCase()

  const title = `${abbr} — 13 Run League History`
  const subtitle = `All-time 13-run game history for the ${abbr}`
  const ogUrl = `/api/og?title=${encodeURIComponent(abbr + ' · 13-Run History')}&subtitle=${encodeURIComponent('Retrosheet franchise history since 1877')}`

  return {
    title,
    openGraph: { title, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, images: [ogUrl] },
  }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const BASEBALL_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'] as const
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export default async function TeamPage({ params }: Props) {
  const { abbreviation } = await params
  const abbr = abbreviation.toUpperCase()

  // Validate — must be a known franchise
  if (!TEAM_COLORS[abbr]) notFound()

  const teamInfo = getTeamColor(abbr)
  const supabase = createServiceClient()

  // All 13-run games for this team
  const { data: games } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, winning_team, home_score, away_score')
    .eq('was_thirteen', true)
    .eq('winning_team', abbr)
    .order('game_date', { ascending: false })

  // Aggregated opponent game counts via RPC (bypasses row limits)
  const { data: opponentCounts } = await supabase
    .rpc('get_opponent_game_counts', { team_abbr: abbr })

  // How many times each team has ever given up 13 (league-wide allowed counts)
  const { data: allowedCounts } = await supabase
    .rpc('get_all_allowed_counts')

  const allGames = games ?? []
  const total = allGames.length

  // ── Stats ──────────────────────────────────────────────────────────────────

  let homeCount = 0
  let awayCount = 0
  const yearMap = new Map<number, number>()
  const monthMap = new Map<string, number>()
  const dayMap = new Map<string, number>()
  const oppMap = new Map<string, number>()

  for (const g of allGames) {
    const isHome = g.home_team === abbr
    if (isHome) homeCount++
    else awayCount++

    const yr = parseInt(g.game_date.slice(0, 4), 10)
    yearMap.set(yr, (yearMap.get(yr) ?? 0) + 1)

    const mo = parseInt(g.game_date.slice(5, 7), 10) - 1
    const moName = MONTH_NAMES[mo]
    if (moName) monthMap.set(moName, (monthMap.get(moName) ?? 0) + 1)

    const d = new Date(g.game_date + 'T12:00:00Z')
    const dayName = DAY_NAMES[d.getUTCDay()]
    dayMap.set(dayName, (dayMap.get(dayName) ?? 0) + 1)

    const opp = isHome ? g.away_team : g.home_team
    oppMap.set(opp, (oppMap.get(opp) ?? 0) + 1)
  }

  const yearOrdered = [...yearMap.entries()].sort((a, b) => a[0] - b[0])
  const monthOrdered = BASEBALL_MONTHS.map((m) => [m, monthMap.get(m) ?? 0] as [string, number])
  const dayOrdered = DAY_NAMES.map((d) => [d, dayMap.get(d) ?? 0] as [string, number])
  // Build allowed-count map: how many times each opponent has ever given up 13 to anyone
  const allowedMap = new Map<string, number>()
  for (const row of allowedCounts ?? []) {
    allowedMap.set(row.team, Number(row.times_allowed))
  }

  const oppRanked = [...oppMap.entries()].sort((a, b) => b[1] - a[1])

  // Build OppEntry array: count + share (% of opponent's all-time 13-run allowed games)
  const oppEntries: OppEntry[] = oppRanked.map(([opp, count]) => {
    const oppAllowed = allowedMap.get(opp) ?? 0
    return {
      opp,
      count,
      oppAllowed,
      share: oppAllowed > 0 ? (count / oppAllowed) * 100 : 0,
    }
  })

  const firstYear = yearOrdered[0]?.[0]
  const lastYear = yearOrdered[yearOrdered.length - 1]?.[0]
  const maxYearCount = Math.max(...yearOrdered.map(([, v]) => v), 1)
  const maxMonthCount = Math.max(...monthOrdered.map(([, v]) => v), 1)
  const maxDay = Math.max(...dayOrdered.map(([, v]) => v), 1)
  const peakYearEntry = yearOrdered.reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0] as [number, number])
  const peakMonth = monthOrdered.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  const peakDay = dayOrdered.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  const distinctSeasons = yearOrdered.length

  const hvTotal = homeCount + awayCount
  const homePct = hvTotal > 0 ? Math.round((homeCount / hvTotal) * 100) : 50

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Team color header banner */}
      <div style={{ backgroundColor: teamInfo.primaryColor }}>
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-8">
          <Link
            href="/history"
            className="text-sm mb-4 inline-block transition-colors"
            style={{ color: teamInfo.textColor + 'aa' }}
          >
            ← 13-Run History
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <div className="font-mono text-sm mb-1" style={{ color: teamInfo.textColor + '99' }}>
                {abbr}
              </div>
              <h1 className="text-4xl font-black tracking-tight" style={{ color: teamInfo.textColor }}>
                {teamInfo.name.toUpperCase()}
              </h1>
              {total > 0 && firstYear && lastYear && (
                <p className="mt-1 text-sm" style={{ color: teamInfo.textColor + 'bb' }}>
                  {firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`} · {distinctSeasons} season{distinctSeasons !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-6xl font-black tabular-nums" style={{ color: teamInfo.textColor }}>
                {total}
              </div>
              <div className="text-sm" style={{ color: teamInfo.textColor + 'bb' }}>
                times scored <span className="font-bold">13</span> runs
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {total === 0 ? (
          <div className="rounded border border-gray-800 bg-[#111] px-6 py-16 text-center space-y-2">
            <div className="text-gray-500 font-mono text-lg">No 13-run games on record</div>
            <div className="text-gray-700 text-sm">
              Data sourced from Retrosheet — some historical records may be incomplete.
            </div>
            <Link href="/history" className="text-[#39ff14] text-sm hover:underline mt-4 inline-block">
              ← Back to 13-Run History
            </Link>
          </div>
        ) : (
          <>
            {/* Quick-stat pills */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-xs font-mono">
                🏠 Home: <span className="text-white font-bold">{homeCount}</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-xs font-mono">
                ✈️ Away: <span className="text-white font-bold">{awayCount}</span>
              </span>
              {peakYearEntry[0] > 0 && (
                <span className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-xs font-mono">
                  📈 Peak: <span className="text-[#39ff14] font-bold">{peakYearEntry[0]}</span>{' '}
                  ({peakYearEntry[1]} games)
                </span>
              )}
              {peakMonth && (
                <span className="px-3 py-1.5 rounded-full bg-[#111] border border-gray-800 text-xs font-mono">
                  📅 Hot month: <span className="text-white font-bold">{peakMonth}</span>
                </span>
              )}
            </div>

            {/* By Year chart */}
            {yearOrdered.length >= 2 && (
              <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
                <YearChart
                  yearData={yearOrdered}
                  minYr={firstYear!}
                  maxYr={lastYear!}
                  maxCount={maxYearCount}
                  peakYear={peakYearEntry[0]}
                  peakCount={peakYearEntry[1]}
                />
              </div>
            )}

            {/* By Month + Home vs Away — side by side */}
            <div className="grid sm:grid-cols-2 gap-4">

              {/* By Month */}
              <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  By Month
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {peakMonth} is the danger month
                </p>
                <div className="space-y-2.5">
                  {monthOrdered.map(([month, count]) => (
                    <div key={month} className="flex items-center gap-2">
                      <span className={`text-xs font-mono w-7 ${month === peakMonth ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                        {month}
                      </span>
                      <MiniBar value={count} max={maxMonthCount} dim={count === 0} />
                      <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">
                        {count > 0 ? count : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Home vs Away */}
              <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Home vs. Away
                </h3>
                <div className="flex items-end gap-6 mb-4">
                  <div className="text-center flex-1">
                    <div className="text-4xl font-black text-[#39ff14] tabular-nums">
                      {homeCount}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Home</div>
                  </div>
                  <div className="text-gray-700 text-base font-mono pb-3">vs</div>
                  <div className="text-center flex-1">
                    <div className="text-4xl font-black text-amber-400 tabular-nums">
                      {awayCount}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Away</div>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${homePct}%`, backgroundColor: teamInfo.primaryColor }}
                  />
                  <div className="bg-amber-900 h-full flex-1" />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1.5">
                  <span>{homePct}% home</span>
                  <span>{100 - homePct}% away</span>
                </div>
                {homeCount !== awayCount && hvTotal > 0 && (
                  <p className="text-xs text-gray-700 mt-3">
                    {homeCount > awayCount
                      ? 'Scores 13 more often at home — the crowd feeds the beast'
                      : 'Scores 13 more on the road — playing with a chip on their shoulder'}
                  </p>
                )}
              </div>
            </div>

            {/* Day of Week + By Opponent */}
            <div className="grid sm:grid-cols-2 gap-4">

              {/* By Day of Week */}
              <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                  By Day of Week
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {peakDay}s are dangerous
                </p>
                <div className="space-y-2.5">
                  {dayOrdered.map(([day, count]) => (
                    <div key={day} className="flex items-center gap-2">
                      <span className={`text-xs font-mono w-7 ${day === peakDay ? 'text-[#39ff14]' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      <MiniBar value={count} max={maxDay} dim={count === 0} />
                      <span className="text-xs font-mono text-gray-400 w-8 text-right shrink-0">
                        {count > 0 ? count : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Opponent — COUNT / RATE toggle */}
              <OpponentChart entries={oppEntries} />

            </div>

            {/* Full game log */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold">
                  All <span className="text-[#39ff14]">13</span>-Run Games
                </h2>
                <span className="text-xs text-gray-600 font-mono">{total} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-left">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Matchup</th>
                      <th className="pb-2 pr-4">Score</th>
                      <th className="pb-2">H/A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allGames.map((g) => {
                      const isHome = g.home_team === abbr
                      const myScore = isHome ? g.home_score : g.away_score
                      const oppScore = isHome ? g.away_score : g.home_score
                      return (
                        <tr key={`${g.game_date}-${g.home_team}`} className="border-b border-gray-900 hover:bg-[#111]">
                          <td className="py-2 pr-4 text-gray-400">{g.game_date}</td>
                          <td className="py-2 pr-4">
                            <Link
                              href={`/matchup/${g.away_team}/${g.home_team}`}
                              className="text-gray-300 hover:text-white transition-colors"
                            >
                              {g.away_team} @ {g.home_team}
                            </Link>
                          </td>
                          <td className="py-2 pr-4">
                            <span className="text-[#39ff14] font-bold">{myScore}</span>
                            <span className="text-gray-600 mx-1">–</span>
                            <span className="text-gray-400">{oppScore}</span>
                          </td>
                          <td className="py-2 text-gray-600">
                            {isHome ? 'home' : 'away'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
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
          <p className="text-gray-800">
            Historical records may be incomplete for pre-1920 seasons.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <Link href="/history" className="hover:text-gray-500 transition-colors">
              ← All Teams
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
