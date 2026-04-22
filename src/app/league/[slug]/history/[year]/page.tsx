import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeamColor, normalizeTeamAbbr } from '@/lib/teamColors'

export const dynamic = 'force-dynamic'

const SEASON_WEEKS = 28

interface WeekWin {
  memberName: string
  team: string
  payoutAmount: number | null
  gameDate: string | null // YYYY-MM-DD
}

interface GameScore {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  gameDate: string
}

function weekStart(year: number, week: number): Date {
  // MLB seasons can start as early as late March
  const d = new Date(year, 2, 25) // March 25 (month is 0-indexed)
  d.setDate(d.getDate() + (week - 1) * 7)
  return d
}

function weekEnd(year: number, week: number): Date {
  const d = weekStart(year, week)
  d.setDate(d.getDate() + 6)
  return d
}

function formatWeekDate(d: Date): string {
  return d
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase()
}

function formatWeekRange(year: number, week: number): string {
  const ws = weekStart(year, week)
  const we = weekEnd(year, week)
  const startStr = ws.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  const endStr = we.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  return `${startStr}–${endStr}`
}

function formatGameDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return d
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase()
}

interface Props {
  params: Promise<{ slug: string; year: string }>
}

export default async function HistoryYearPage({ params }: Props) {
  const { slug, year: yearStr } = await params
  const year = parseInt(yearStr, 10)

  if (isNaN(year)) notFound()

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!authCookie) {
    redirect(`/league/${slug}/join`)
  }

  const supabase = createServiceClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  // ── Data fetching ──────────────────────────────────────────────────────────

  // 1. Historical results for this league + year
  const { data: histRows } = await supabase
    .from('historical_results')
    .select('member_name, team, year, total_won, shares, week_wins')
    .eq('league_id', league.id)
    .eq('year', year)

  // 2. Available years for nav
  const { data: yearRows } = await supabase
    .from('historical_results')
    .select('year')
    .eq('league_id', league.id)

  const availableYears = [...new Set((yearRows ?? []).map((r) => r.year))].sort(
    (a, b) => a - b
  )

  if (!histRows || histRows.length === 0) notFound()

  // 3. Members (to resolve payout member_id → name)
  const { data: memberRows } = await supabase
    .from('members')
    .select('id, name')
    .eq('league_id', league.id)

  const memberNameById = new Map<string, string>(
    (memberRows ?? []).map((m) => [m.id, m.name])
  )

  // 4. Payouts for this league + year
  const { data: payoutRows } = await supabase
    .from('payouts')
    .select('member_id, week_number, winning_team, payout_amount, game_date')
    .eq('league_id', league.id)
    .eq('year', year)

  // 5. Game results (was_thirteen=true) for this season date range
  const seasonStart = `${year}-03-20`
  const seasonEnd = `${year}-10-15`
  const { data: seasonGames } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, home_score, away_score, winning_team')
    .eq('was_thirteen', true)
    .gte('game_date', seasonStart)
    .lte('game_date', seasonEnd)

  // Count of MLB 13s this season
  const { count: mlbCount } = await supabase
    .from('game_results')
    .select('*', { count: 'exact', head: true })
    .eq('was_thirteen', true)
    .gte('game_date', seasonStart)
    .lte('game_date', seasonEnd)

  // ── Build team ownership map from historical_results ────────────────────

  const teamOwner = new Map<string, string>() // normalized team abbr → member name
  for (const row of histRows) {
    const team = normalizeTeamAbbr((row.team ?? '').toUpperCase())
    teamOwner.set(team, row.member_name)
  }

  // Helper: which week does a game date fall in?
  function dateToWeek(dateStr: string): number | null {
    const d = new Date(dateStr + 'T12:00:00') // noon to avoid TZ issues
    const seasonStartDate = weekStart(year, 1)
    const diffMs = d.getTime() - seasonStartDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return null
    const wk = Math.floor(diffDays / 7) + 1
    return wk >= 1 && wk <= SEASON_WEEKS ? wk : null
  }

  // ── Build week map (multiple winners per week) ────────────────────────────

  const weekMap = new Map<number, WeekWin[]>()

  function addToWeek(wk: number, win: WeekWin) {
    const existing = weekMap.get(wk) ?? []
    existing.push(win)
    weekMap.set(wk, existing)
  }

  // Track which game+team combos we've already added (to avoid duplicates)
  const addedGames = new Set<string>() // "wk-team-gameDate"

  // First: populate from payouts (most precise — has member, team, amount, date)
  for (const p of payoutRows ?? []) {
    if (!p.week_number) continue
    const name = memberNameById.get(p.member_id) ?? p.member_id
    const team = normalizeTeamAbbr((p.winning_team ?? '').toUpperCase())
    addToWeek(p.week_number, {
      memberName: name,
      team,
      payoutAmount: p.payout_amount ?? null,
      gameDate: p.game_date ?? null,
    })
    if (p.game_date) {
      addedGames.add(`${p.week_number}-${team}-${p.game_date}`)
    }
  }

  // Second: scan game_results to find ALL 13-run games for owned teams
  // This catches multiple 13s by the same team in one week
  for (const g of seasonGames ?? []) {
    const homeTeam = normalizeTeamAbbr(g.home_team.toUpperCase())
    const awayTeam = normalizeTeamAbbr(g.away_team.toUpperCase())

    // Check each side — did they score 13 and do we have an owner?
    const candidates: { team: string; score: number }[] = []
    if (g.home_score === 13 && teamOwner.has(homeTeam)) {
      candidates.push({ team: homeTeam, score: 13 })
    }
    if (g.away_score === 13 && teamOwner.has(awayTeam)) {
      candidates.push({ team: awayTeam, score: 13 })
    }

    for (const { team } of candidates) {
      const wk = dateToWeek(g.game_date)
      if (!wk) continue
      const key = `${wk}-${team}-${g.game_date}`
      if (addedGames.has(key)) continue
      addedGames.add(key)

      const owner = teamOwner.get(team)!
      addToWeek(wk, {
        memberName: owner,
        team,
        payoutAmount: null, // no payout data from game_results
        gameDate: g.game_date,
      })
    }
  }

  // Third: fill any remaining weeks from historical_results.week_wins[]
  // (catches weeks where game_results might be missing)
  for (const row of histRows) {
    const weekWins: number[] = Array.isArray(row.week_wins) ? row.week_wins : []
    const team = normalizeTeamAbbr((row.team ?? '').toUpperCase())
    const shares = row.shares ?? weekWins.length

    // If shares > week_wins.length, there are hidden duplicates
    // (e.g. team hit 13 twice in one week but week_wins only has [1])
    // We can't know which weeks have dupes, but we can distribute
    // the extra shares proportionally — for now, mark them
    const extraShares = Math.max(0, shares - weekWins.length)
    let extrasAdded = 0

    for (const wk of weekWins) {
      const existing = weekMap.get(wk) ?? []
      const countForTeam = existing.filter(
        (w) => w.memberName === row.member_name && w.team === team
      ).length

      if (countForTeam === 0) {
        // No entry yet — add one (no estimated payout, only payouts table has real amounts)
        addToWeek(wk, {
          memberName: row.member_name,
          team,
          payoutAmount: null,
          gameDate: null,
        })
      }

      // If we have extra shares to distribute, add a duplicate entry
      // This is a best-effort heuristic for missing game_results data
      if (extrasAdded < extraShares && countForTeam <= 1) {
        addToWeek(wk, {
          memberName: row.member_name,
          team,
          payoutAmount: null,
          gameDate: null,
        })
        extrasAdded++
      }
    }
  }

  // ── Game score matching (in memory) ───────────────────────────────────────

  // Map: week → array of GameScore (one per win in that week)
  const scoreMap = new Map<number, Map<string, GameScore>>()

  for (const [wk, wins] of weekMap.entries()) {
    const weekScores = new Map<string, GameScore>()

    for (const win of wins) {
      const team = win.team

      // Helper: does this game match our team AND did our team score 13?
      const isTeamThirteen = (sg: NonNullable<typeof seasonGames>[number]) => {
        const home = normalizeTeamAbbr(sg.home_team.toUpperCase())
        const away = normalizeTeamAbbr(sg.away_team.toUpperCase())
        return (
          (home === team && sg.home_score === 13) ||
          (away === team && sg.away_score === 13)
        )
      }

      let found: GameScore | null = null

      if (win.gameDate) {
        // Match by exact game date + team scored 13
        const g = (seasonGames ?? []).find(
          (sg) => sg.game_date === win.gameDate && isTeamThirteen(sg)
        )
        if (g) {
          found = {
            homeTeam: normalizeTeamAbbr(g.home_team.toUpperCase()),
            awayTeam: normalizeTeamAbbr(g.away_team.toUpperCase()),
            homeScore: g.home_score,
            awayScore: g.away_score,
            gameDate: g.game_date,
          }
        }
      } else {
        // Match by week window + team scored 13
        const ws = weekStart(year, wk)
        const we = weekEnd(year, wk)
        const wsStr = ws.toISOString().slice(0, 10)
        const weStr = we.toISOString().slice(0, 10)

        const g = (seasonGames ?? []).find(
          (sg) =>
            sg.game_date >= wsStr &&
            sg.game_date <= weStr &&
            isTeamThirteen(sg)
        )
        if (g) {
          found = {
            homeTeam: normalizeTeamAbbr(g.home_team.toUpperCase()),
            awayTeam: normalizeTeamAbbr(g.away_team.toUpperCase()),
            homeScore: g.home_score,
            awayScore: g.away_score,
            gameDate: g.game_date,
          }
        }
      }

      if (found) {
        const key = `${team}-${found.gameDate}`
        weekScores.set(key, found)
      }
    }

    if (weekScores.size > 0) scoreMap.set(wk, weekScores)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  // Flatten all wins for stats
  const allWins = [...weekMap.values()].flat()

  // Champion: most wins
  const winsByMember = new Map<string, number>()
  for (const win of allWins) {
    winsByMember.set(win.memberName, (winsByMember.get(win.memberName) ?? 0) + 1)
  }
  let champion = ''
  let championWins = 0
  for (const [name, count] of winsByMember.entries()) {
    if (count > championWins) {
      champion = name
      championWins = count
    }
  }

  // Most earned: from histRows total_won
  const earnedByMember = new Map<string, number>()
  for (const row of histRows) {
    earnedByMember.set(
      row.member_name,
      (earnedByMember.get(row.member_name) ?? 0) + (row.total_won ?? 0)
    )
  }
  let mostEarned = ''
  let mostEarnedAmount = 0
  for (const [name, amt] of earnedByMember.entries()) {
    if (amt > mostEarnedAmount) {
      mostEarned = name
      mostEarnedAmount = amt
    }
  }

  // Biggest pot
  const biggestPot = Math.max(
    ...(payoutRows ?? []).map((p) => p.payout_amount ?? 0),
    0
  )

  // Hottest team
  const winsByTeam = new Map<string, number>()
  for (const win of allWins) {
    winsByTeam.set(win.team, (winsByTeam.get(win.team) ?? 0) + 1)
  }
  let hottestTeam = ''
  let hottestTeamCount = 0
  for (const [team, count] of winsByTeam.entries()) {
    if (count > hottestTeamCount) {
      hottestTeam = team
      hottestTeamCount = count
    }
  }

  // Longest streak (consecutive weeks with at least one win by same member)
  let longestStreak = 0
  let longestStreakMember = ''
  // Track per-member streaks
  const memberStreaks = new Map<string, number>()
  for (let wk = 1; wk <= SEASON_WEEKS; wk++) {
    const wins = weekMap.get(wk) ?? []
    const winnersThisWeek = new Set(wins.map((w) => w.memberName))
    const nextStreaks = new Map<string, number>()

    for (const name of winnersThisWeek) {
      const prev = memberStreaks.get(name) ?? 0
      const streak = prev + 1
      nextStreaks.set(name, streak)
      if (streak > longestStreak) {
        longestStreak = streak
        longestStreakMember = name
      }
    }

    memberStreaks.clear()
    for (const [k, v] of nextStreaks) {
      memberStreaks.set(k, v)
    }
  }

  // ── Score string helper ────────────────────────────────────────────────────

  function buildScoreStr(wk: number, team: string, gameDate: string | null): string | null {
    const weekScores = scoreMap.get(wk)
    if (!weekScores) return null

    // Try exact match by team+date, then fall back to any match for this team
    let gs: GameScore | undefined
    if (gameDate) {
      gs = weekScores.get(`${team}-${gameDate}`)
    }
    if (!gs) {
      for (const score of weekScores.values()) {
        if (score.homeTeam === team || score.awayTeam === team) {
          gs = score
          break
        }
      }
    }
    if (!gs) return null

    const isHome = gs.homeTeam === team
    const myScore = isHome ? gs.homeScore : gs.awayScore
    const oppScore = isHome ? gs.awayScore : gs.homeScore
    const oppTeam = isHome ? gs.awayTeam : gs.homeTeam
    return `${myScore}–${oppScore} ${oppTeam}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Year nav */}
        <div className="flex flex-wrap gap-2">
          {availableYears.map((y) => (
            <Link
              key={y}
              href={`/league/${slug}/history/${y}`}
              className={
                y === year
                  ? 'px-3 py-1 rounded-full text-sm font-bold bg-[#39ff14] text-black'
                  : 'px-3 py-1 rounded-full text-sm bg-[#1a1a1a] text-gray-400 border border-[#333] hover:text-white'
              }
            >
              {y}
            </Link>
          ))}
        </div>

        {/* Title block */}
        <div className="text-center border-t border-b border-[#222] py-5 space-y-1">
          <p className="text-gray-500 text-xs uppercase tracking-widest">{league.name}</p>
          <p className="text-5xl font-black text-[#39ff14]">{year}</p>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Season</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

          {champion && championWins > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">🏆 Champion</p>
              <p className="font-bold text-white text-sm">{champion}</p>
              <p className="text-[#39ff14] text-xs">{championWins} wins</p>
            </div>
          )}

          {mostEarned && mostEarnedAmount > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">💰 Most Earned</p>
              <p className="font-bold text-white text-sm">{mostEarned}</p>
              <p className="text-[#39ff14] text-xs">${mostEarnedAmount.toFixed(0)}</p>
            </div>
          )}

          {biggestPot > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">💸 Biggest Pot</p>
              <p className="font-black text-[#39ff14] text-xl">${biggestPot.toFixed(0)}</p>
            </div>
          )}

          {longestStreak > 1 && longestStreakMember && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">🔥 Hot Streak</p>
              <p className="font-bold text-white text-sm">{longestStreakMember}</p>
              <p className="text-[#39ff14] text-xs">{longestStreak} in a row</p>
            </div>
          )}

          {hottestTeam && hottestTeamCount > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">⚡ Hottest Team</p>
              <p className="font-bold text-white text-sm">{hottestTeam}</p>
              <p className="text-[#39ff14] text-xs">{hottestTeamCount}× this season</p>
            </div>
          )}

          {(mlbCount ?? 0) > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">⚾ MLB 13s</p>
              <p className="font-bold text-white text-sm">{mlbCount}</p>
              <p className="text-[#39ff14] text-xs">games that season</p>
            </div>
          )}

        </div>

        {/* Week list */}
        <div className="space-y-0.5">
          {Array.from({ length: SEASON_WEEKS }, (_, i) => i + 1).map((wk) => {
            const wins = weekMap.get(wk) ?? []
            const weekLabel = formatWeekDate(weekStart(year, wk))
            const weekRange = formatWeekRange(year, wk)
            const weekNumStr = String(wk).padStart(2, '0')

            if (wins.length === 0) {
              return (
                <div
                  key={wk}
                  className="flex items-center gap-4 py-2 px-3 text-gray-400 hover:bg-[#0f0f0f] rounded"
                >
                  <span className="font-mono text-xs w-6 text-right">{weekNumStr}</span>
                  <span className="text-xs w-16 text-gray-400">{weekLabel}</span>
                  <span className="text-xs tracking-[0.2em] text-gray-400">· · · ROLLOVER · · ·</span>
                </div>
              )
            }

            return (
              <div key={wk} className="space-y-0">
                {wins.map((win, idx) => {
                  const teamColors = getTeamColor(win.team)
                  const displayDate = win.gameDate ? formatGameDate(win.gameDate) : weekLabel
                  const scoreStr = buildScoreStr(wk, win.team, win.gameDate)

                  return (
                    <div
                      key={`${wk}-${idx}`}
                      className="flex items-center gap-3 py-2.5 px-3 hover:bg-[#0f0f0f] rounded border-l-2 border-[#39ff14]/20 hover:border-[#39ff14]/60"
                    >
                      {/* Show week number only on first entry */}
                      <span className="font-mono text-xs w-6 text-right text-gray-500">
                        {idx === 0 ? weekNumStr : ''}
                      </span>
                      <span className="text-xs w-16 text-gray-500">{displayDate}</span>
                      <span className="font-semibold text-white text-sm flex-1">{win.memberName}</span>
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: teamColors.primaryColor,
                          color: teamColors.textColor,
                        }}
                      >
                        {win.team}
                      </span>
                      {scoreStr && (
                        <span className="text-gray-400 text-xs font-mono">{scoreStr}</span>
                      )}
                      {win.payoutAmount != null && (
                        <span className="text-[#39ff14] text-xs font-mono font-bold">
                          ${win.payoutAmount.toFixed(0)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Back link */}
        <div className="pt-4 border-t border-[#1a1a1a]">
          <Link
            href={`/league/${slug}`}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← {league.name}
          </Link>
        </div>

      </div>
    </main>
  )
}
