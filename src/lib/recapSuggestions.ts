import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchScheduleForDate } from '@/lib/mlb'
import { getSeasonYear, getWeekNumber, getWeekCalendarBoundsForSeasonYear } from '@/lib/pot'
import { franchiseAbbrs, normalizeTeamAbbr } from '@/lib/teamColors'

export interface RecapSuggestionBlock {
  id: string
  title: string
  bodyLines: string[]
  /** Minimal HTML inserted into the recap body */
  insertHtml: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function priorPlayingWeekBounds(today: Date): { seasonYear: number; week: number; start: string; end: string } {
  const seasonYear = getSeasonYear(today)
  const w = getWeekNumber(today)
  if (w > 1) {
    const { start, end } = getWeekCalendarBoundsForSeasonYear(seasonYear, w - 1)
    return { seasonYear, week: w - 1, start, end }
  }
  const { start, end } = getWeekCalendarBoundsForSeasonYear(seasonYear - 1, 28)
  return { seasonYear: seasonYear - 1, week: 28, start, end }
}

function eachDateInRange(start: string, end: string): string[] {
  const out: string[] = []
  const [ys, ms, ds] = start.split('-').map(Number)
  const endT = new Date(end + 'T12:00:00')
  const cur = new Date(ys, ms - 1, ds, 12, 0, 0)
  while (cur <= endT) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    )
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

const NEAR = new Set([11, 12, 14])

function teamRuns(game: {
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
}, abbr: string): number | null {
  const a = normalizeTeamAbbr(abbr.toUpperCase())
  if (normalizeTeamAbbr(game.home_team.toUpperCase()) === a) return game.home_score
  if (normalizeTeamAbbr(game.away_team.toUpperCase()) === a) return game.away_score
  return null
}

/** Count all-time 13-run wins for `team` against `opponent` (either ballpark). */
function buildThirteenVsOpponentMap(
  rows: { home_team: string; away_team: string; winning_team: string | null }[]
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const g of rows) {
    if (!g.winning_team) continue
    const w = normalizeTeamAbbr(g.winning_team.toUpperCase())
    const awayC = normalizeTeamAbbr(g.away_team.toUpperCase())
    const homeC = normalizeTeamAbbr(g.home_team.toUpperCase())
    const opp = awayC === w ? homeC : homeC === w ? awayC : null
    if (opp == null) continue
    if (!out.has(w)) out.set(w, new Map())
    const m = out.get(w)!
    m.set(opp, (m.get(opp) ?? 0) + 1)
  }
  return out
}

export async function buildRecapSuggestions(
  leagueId: string,
  supabase: SupabaseClient
): Promise<RecapSuggestionBlock[]> {
  const today = new Date()
  const seasonYear = getSeasonYear(today)
  const currentWeek = getWeekNumber(today)
  const blocks: RecapSuggestionBlock[] = []

  const { data: members } = await supabase
    .from('members')
    .select('id, name, assigned_team, is_active')
    .eq('league_id', leagueId)

  const active = (members ?? []).filter((m) => m.assigned_team && m.is_active !== false)
  if (active.length === 0) return staticIdeaBlocks()

  const teamSet = [...new Set(active.map((m) => m.assigned_team.toUpperCase()))]
  const teamSetForSql = [
    ...new Set(teamSet.flatMap((t) => franchiseAbbrs(normalizeTeamAbbr(t)))),
  ]

  const { data: streakRows } = await supabase
    .from('streaks')
    .select('member_id, current_streak')
    .in(
      'member_id',
      active.map((m) => m.id)
    )

  const streakByMember = new Map((streakRows ?? []).map((r) => [r.member_id, r.current_streak ?? 0]))
  let droughtLeader: { name: string; team: string; weeks: number } | null = null
  for (const m of active) {
    const w = streakByMember.get(m.id) ?? 0
    if (!droughtLeader || w > droughtLeader.weeks) {
      droughtLeader = { name: m.name, team: m.assigned_team.toUpperCase(), weeks: w }
    }
  }

  if (droughtLeader && droughtLeader.weeks > 0) {
    const lines = [
      `${droughtLeader.name} (${droughtLeader.team}) is riding a ${droughtLeader.weeks}-week pot drought — longest in the league right now.`,
      `current_streak here is “weeks since last 13-run payout,” not MLB wins/losses.`,
    ]
    blocks.push({
      id: 'drought',
      title: 'Longest active pot drought',
      bodyLines: lines,
      insertHtml: `<p><strong>Pot drought watch:</strong> ${droughtLeader.name} (${droughtLeader.team}) — <strong>${droughtLeader.weeks} weeks</strong> since a 13-run payday. Send good vibes (or trash talk).</p>`,
    })
  }

  const prior = priorPlayingWeekBounds(today)
  const { data: weekGames } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, home_score, away_score, was_thirteen, final')
    .gte('game_date', prior.start)
    .lte('game_date', prior.end)

  const misses: string[] = []
  for (const g of weekGames ?? []) {
    if (g.was_thirteen) continue
    if (g.final !== true) continue
    for (const m of active) {
      const abbr = m.assigned_team.toUpperCase()
      const ac = normalizeTeamAbbr(abbr)
      if (
        normalizeTeamAbbr(g.home_team.toUpperCase()) !== ac &&
        normalizeTeamAbbr(g.away_team.toUpperCase()) !== ac
      ) {
        continue
      }
      const runs = teamRuns(g, abbr)
      if (runs == null || !NEAR.has(runs)) continue
      const opp = normalizeTeamAbbr(g.home_team.toUpperCase()) === ac ? g.away_team : g.home_team
      const label = runs === 14 ? 'heartbreak 14' : `landed on ${runs}`
      misses.push(`${m.name} (${abbr}) ${label} vs ${opp} (${g.game_date})`)
    }
  }

  if (misses.length > 0) {
    const top = misses.slice(0, 8)
    blocks.push({
      id: 'near-miss',
      title: `Near-misses (week ${prior.week}, ${prior.seasonYear})`,
      bodyLines: top,
      insertHtml: `<p><strong>So close last week:</strong></p><ul>${top.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`,
    })
  }

  const { data: thirteenGames } = await supabase
    .from('game_results')
    .select('game_date, winning_team')
    .eq('was_thirteen', true)
    .in('winning_team', teamSetForSql)

  const monthByTeam = new Map<string, Map<number, number>>()
  for (const g of thirteenGames ?? []) {
    const t = normalizeTeamAbbr(g.winning_team!.toUpperCase())
    const mo = parseInt(g.game_date.slice(5, 7), 10) - 1
    if (!monthByTeam.has(t)) monthByTeam.set(t, new Map())
    const mm = monthByTeam.get(t)!
    mm.set(mo, (mm.get(mo) ?? 0) + 1)
  }

  const peakLines: string[] = []
  const peakHtmlParts: string[] = []
  for (const m of active) {
    const t = normalizeTeamAbbr(m.assigned_team.toUpperCase())
    const mm = monthByTeam.get(t)
    if (!mm || mm.size === 0) continue
    let bestM = 0
    let bestC = 0
    for (const [mo, c] of mm) {
      if (c > bestC) {
        bestC = c
        bestM = mo
      }
    }
    if (bestC < 2) continue
    const label = MONTH_NAMES[bestM] ?? `Month ${bestM + 1}`
    peakLines.push(
      `${m.assigned_team.toUpperCase()}: most franchise 13-run games in ${label} (historical sample) — ${bestC} games.`
    )
    peakHtmlParts.push(
      `<li><strong>${escapeHtml(m.assigned_team.toUpperCase())}</strong>: peak month <strong>${label}</strong> (${bestC} historical 13-run wins logged)</li>`
    )
  }
  if (peakLines.length > 0) {
    blocks.push({
      id: 'peak-month',
      title: 'Peak calendar months (historical 13s)',
      bodyLines: peakLines.slice(0, 10),
      insertHtml: `<p><strong>Historical “hot months”</strong> for your teams (Retrosheet-era 13-run wins):</p><ul>${peakHtmlParts.slice(0, 10).join('')}</ul>`,
    })
  }

  const { start: upStart, end: upEnd } = getWeekCalendarBoundsForSeasonYear(seasonYear, currentWeek)
  const dates = eachDateInRange(upStart, upEnd)

  const schedulePairs = new Map<string, Map<string, number>>()
  for (const d of dates) {
    let games: Awaited<ReturnType<typeof fetchScheduleForDate>> = []
    try {
      games = await fetchScheduleForDate(d)
    } catch {
      continue
    }
    for (const g of games) {
      const away = normalizeTeamAbbr(g.teams.away.team.abbreviation.toUpperCase())
      const home = normalizeTeamAbbr(g.teams.home.team.abbreviation.toUpperCase())
      for (const t of teamSet) {
        const tc = normalizeTeamAbbr(t)
        if (tc !== away && tc !== home) continue
        const opp = tc === away ? home : away
        if (!schedulePairs.has(t)) schedulePairs.set(t, new Map())
        const om = schedulePairs.get(t)!
        om.set(opp, (om.get(opp) ?? 0) + 1)
      }
    }
  }

  const { data: h2h } = await supabase
    .from('game_results')
    .select('home_team, away_team, winning_team')
    .eq('was_thirteen', true)
    .in('winning_team', teamSetForSql)

  const vsMap = buildThirteenVsOpponentMap(h2h ?? [])

  type MatchRow = { team: string; opp: string; gamesThisWeek: number; hist: number; memberNames: string }
  const rows: MatchRow[] = []
  for (const t of teamSet) {
    const opps = schedulePairs.get(t)
    if (!opps) continue
    const tMembers = active.filter((m) => m.assigned_team.toUpperCase() === t).map((m) => m.name).join(', ')
    for (const [opp, cnt] of opps) {
      const hist = vsMap.get(normalizeTeamAbbr(t))?.get(opp) ?? 0
      if (hist < 1 && cnt < 2) continue
      rows.push({ team: t, opp, gamesThisWeek: cnt, hist, memberNames: tMembers })
    }
  }
  rows.sort((a, b) => b.hist * Math.sqrt(b.gamesThisWeek) - a.hist * Math.sqrt(a.gamesThisWeek))

  if (rows.length > 0) {
    const top = rows.slice(0, 6)
    const lines = top.map(
      (r) =>
        `${r.team} (${r.memberNames}) faces ${r.opp} ${r.gamesThisWeek}× this week — ${r.hist} all-time 13-run wins vs ${r.opp} (any site).`
    )
    blocks.push({
      id: 'favorable',
      title: 'Schedule vs history (this playing week)',
      bodyLines: lines,
      insertHtml: `<p><strong>Favorable schedule angles</strong> (this week’s matchups × historical 13s vs opponent):</p><ul>${top
        .map(
          (r) =>
            `<li><strong>${r.team}</strong> vs <strong>${r.opp}</strong> — <strong>${r.gamesThisWeek} game${r.gamesThisWeek > 1 ? 's' : ''}</strong> this week, <strong>${r.hist}</strong> franchise 13-run wins vs ${r.opp} in the database.</li>`
        )
        .join('')}</ul>`,
    })
  }

  blocks.push(...staticIdeaBlocks())

  return blocks
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function staticIdeaBlocks(): RecapSuggestionBlock[] {
  return [
    {
      id: 'tips-media',
      title: 'Images & motion in email',
      bodyLines: [
        'Use absolute https:// image URLs. Host on your site, Imgur, etc.',
        'Most inboxes do not run CSS animations. For motion, use an animated GIF.',
        'Keep images under ~1MB when possible.',
      ],
      insertHtml:
        '<p><strong>Pro tip:</strong> Inline images need a public <code>https://</code> URL. For “animation,” use a GIF — most email apps ignore CSS keyframes.</p>',
    },
    {
      id: 'tips-matchup-links',
      title: 'Deep links',
      bodyLines: [
        'Matchup history pages: /matchup/AWAY/HOME (e.g. /matchup/NYY/BAL).',
      ],
      insertHtml:
        '<p>Peep full <a href="https://13runleague.com/matchup/NYY/BAL" style="color:#39ff14">NYY @ BAL 13-run history</a> (swap abbrs for any matchup).</p>',
    },
    {
      id: 'ideas-more',
      title: 'More angles to riff on',
      bodyLines: [
        'Teams with multiple league members — shared destiny week.',
        'Rollover pot size vs last season same week.',
        'Any 13-run winner last week → call the payout drama.',
        'Interleague novelty matchups someone drew.',
      ],
      insertHtml:
        '<p><strong>Ideas:</strong> co-owned teams sweating the same scoresheet · compare this week’s pot to last April · shout out last week’s winner · weird interleague draws.</p>',
    },
  ]
}
