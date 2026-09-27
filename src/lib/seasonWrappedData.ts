import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSeasonYear,
  getWeekCalendarBoundsForSeasonYear,
} from '@/lib/pot'
import { franchiseAbbrs, normalizeTeamAbbr } from '@/lib/teamColors'

/** Full club names for email copy — same map as send-receipts. */
const TEAM_FULL_NAMES: Record<string, string> = {
  ARI: 'Arizona Diamondbacks',
  ATH: 'Athletics',
  ATL: 'Atlanta Braves',
  BAL: 'Baltimore Orioles',
  BOS: 'Boston Red Sox',
  CHC: 'Chicago Cubs',
  CWS: 'Chicago White Sox',
  CIN: 'Cincinnati Reds',
  CLE: 'Cleveland Guardians',
  COL: 'Colorado Rockies',
  DET: 'Detroit Tigers',
  HOU: 'Houston Astros',
  KC: 'Kansas City Royals',
  LAA: 'Los Angeles Angels',
  LAD: 'Los Angeles Dodgers',
  MIA: 'Miami Marlins',
  MIL: 'Milwaukee Brewers',
  MIN: 'Minnesota Twins',
  NYM: 'New York Mets',
  NYY: 'New York Yankees',
  PHI: 'Philadelphia Phillies',
  PIT: 'Pittsburgh Pirates',
  SD: 'San Diego Padres',
  SEA: 'Seattle Mariners',
  SF: 'San Francisco Giants',
  STL: 'St. Louis Cardinals',
  TB: 'Tampa Bay Rays',
  TEX: 'Texas Rangers',
  TOR: 'Toronto Blue Jays',
  WSH: 'Washington Nationals',
}

function teamFullName(abbr: string): string {
  const canon = normalizeTeamAbbr(abbr)
  return TEAM_FULL_NAMES[canon] ?? TEAM_FULL_NAMES[abbr.toUpperCase()] ?? abbr
}
import {
  buildVenmoPayUrl,
  resolveVenmoUsername,
  signRsvpToken,
  type RsvpResponse,
} from '@/lib/rsvpToken'

/** Playing weeks in a season — matches pot.ts buy-in math. */
export const SEASON_WEEKS = 28

export function seasonBuyInAmount(weeklyBuyIn: number): number {
  return (weeklyBuyIn || 10) * SEASON_WEEKS
}

export interface SeasonWin {
  weekNumber: number
  amount: number
  team: string
  gameDate: string | null
}

export interface MemberSeasonStats {
  memberId: string
  memberName: string
  email: string | null
  teamAbbr: string
  teamName: string
  totalWon: number
  shares: number
  wins: SeasonWin[]
  rank: number
  memberCount: number
  nearMissCount: number
  nearMissLabel: string | null
  isTopEarner: boolean
  isMostWins: boolean
}

export interface LeagueSeasonHighlights {
  seasonYear: number
  leagueName: string
  leagueSlug: string
  totalThirteenGames: number
  totalDistributed: number
  weeksWithWinners: number
  weeksRollover: number
  biggestPotWeek: { weekNumber: number; potAmount: number } | null
  topEarner: { name: string; amount: number } | null
  mostWins: { name: string; shares: number } | null
  memberCount: number
  nextSeasonBuyIn: number
  weeklyBuyIn: number
}

export interface SeasonWrappedLinks {
  rsvpYesUrl: string
  rsvpMaybeUrl: string
  rsvpNoUrl: string
  payUrl: string | null
  venmoUsername: string | null
  leagueUrl: string
}

export interface SeasonWrappedPayload {
  league: LeagueSeasonHighlights
  member: MemberSeasonStats
  links: SeasonWrappedLinks
  commissionerNote?: string
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://13runleague.com'
}

function rsvpUrl(token: string): string {
  return `${appBaseUrl()}/rsvp/${encodeURIComponent(token)}`
}

function buildLinks(
  leagueId: string,
  slug: string,
  memberId: string,
  seasonYear: number,
  buyIn: number,
  leagueRules: unknown
): SeasonWrappedLinks {
  const make = (response: RsvpResponse) =>
    rsvpUrl(signRsvpToken(leagueId, memberId, response))

  const venmoUsername = resolveVenmoUsername(leagueRules)
  const payUrl = venmoUsername
    ? buildVenmoPayUrl({
        username: venmoUsername,
        amount: buyIn,
        note: `13 Run League ${seasonYear + 1} buy-in`,
      })
    : null

  return {
    rsvpYesUrl: make('yes'),
    rsvpMaybeUrl: make('maybe'),
    rsvpNoUrl: make('no'),
    payUrl,
    venmoUsername,
    leagueUrl: `${appBaseUrl()}/league/${slug}`,
  }
}

/**
 * Aggregate league + per-member season stats for Wrapped emails.
 * All player/team ownership claims come from live Supabase rows this call.
 */
export async function buildSeasonWrappedData(
  supabase: SupabaseClient,
  slug: string,
  seasonYear?: number
): Promise<{
  league: LeagueSeasonHighlights
  members: MemberSeasonStats[]
  leagueId: string
  leagueRules: unknown
  emails: string[]
} | null> {
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, slug, pot_total, weekly_buy_in, rules')
    .eq('slug', slug)
    .single()

  if (!league) return null

  const year = seasonYear ?? getSeasonYear(new Date())
  const weeklyBuyIn = league.weekly_buy_in ?? 10
  const nextSeasonBuyIn = seasonBuyInAmount(weeklyBuyIn)
  const { start: seasonStart } = getWeekCalendarBoundsForSeasonYear(year, 1)
  const { end: seasonEnd } = getWeekCalendarBoundsForSeasonYear(year, SEASON_WEEKS)

  const { data: membersRaw } = await supabase
    .from('members')
    .select('id, name, email, assigned_team, is_active')
    .eq('league_id', league.id)
    .neq('is_active', false)
    .order('name')

  const membersList = membersRaw ?? []

  const [payoutsRes, ledgerRes, thirteenRes, nearMissRes, unsubRes] = await Promise.all([
    supabase
      .from('payouts')
      .select('member_id, payout_amount, winning_team, game_date, shares_count, week_number')
      .eq('league_id', league.id)
      .eq('year', year),
    supabase
      .from('weekly_pot_ledger')
      .select('week_number, pot_amount, number_of_winners')
      .eq('league_id', league.id)
      .eq('year', year),
    supabase
      .from('game_results')
      .select('winning_team, game_date')
      .eq('was_thirteen', true)
      .gte('game_date', seasonStart)
      .lte('game_date', seasonEnd),
    // Near-miss games: a team scored exactly 12 (classic heartbreak) in season window
    supabase
      .from('game_results')
      .select('game_date, home_team, away_team, home_score, away_score')
      .eq('final', true)
      .gte('game_date', seasonStart)
      .lte('game_date', seasonEnd)
      .or('home_score.eq.12,away_score.eq.12'),
    supabase.from('email_unsubscribes').select('email'),
  ])

  const payouts = payoutsRes.data ?? []
  const ledger = ledgerRes.data ?? []
  const thirteenGames = thirteenRes.data ?? []
  const nearMissGames = nearMissRes.data ?? []

  const byMember = new Map<
    string,
    { totalWon: number; shares: number; wins: SeasonWin[] }
  >()

  for (const p of payouts) {
    const cur = byMember.get(p.member_id) ?? { totalWon: 0, shares: 0, wins: [] }
    const amount = p.payout_amount ?? 0
    // One payout row = one share for this member. Do NOT sum shares_count —
    // that column is how many winners split the pot that week (see pot.ts).
    cur.totalWon += amount
    cur.shares += 1
    cur.wins.push({
      weekNumber: p.week_number ?? 0,
      amount,
      team: p.winning_team ?? '',
      gameDate: p.game_date ?? null,
    })
    byMember.set(p.member_id, cur)
  }

  // Near-miss counts keyed by franchise abbr
  const nearMissByTeam = new Map<string, number>()
  for (const g of nearMissGames) {
    if (g.home_score === 12) {
      const t = normalizeTeamAbbr(g.home_team)
      nearMissByTeam.set(t, (nearMissByTeam.get(t) ?? 0) + 1)
    }
    if (g.away_score === 12) {
      const t = normalizeTeamAbbr(g.away_team)
      nearMissByTeam.set(t, (nearMissByTeam.get(t) ?? 0) + 1)
    }
  }

  const ranked = membersList
    .map((m) => {
      const stats = byMember.get(m.id) ?? { totalWon: 0, shares: 0, wins: [] }
      return { id: m.id, totalWon: stats.totalWon, shares: stats.shares }
    })
    .sort((a, b) => b.totalWon - a.totalWon || b.shares - a.shares || a.id.localeCompare(b.id))

  const rankMap = new Map<string, number>()
  ranked.forEach((r, i) => rankMap.set(r.id, i + 1))

  const topEarnerRow = ranked.find((r) => r.totalWon > 0) ?? null
  const mostWinsRow = [...ranked].sort((a, b) => b.shares - a.shares)[0]
  const topEarnerMember = topEarnerRow
    ? membersList.find((m) => m.id === topEarnerRow.id)
    : null
  const mostWinsMember =
    mostWinsRow && mostWinsRow.shares > 0
      ? membersList.find((m) => m.id === mostWinsRow.id)
      : null

  const weeksWithWinners = ledger.filter((w) => (w.number_of_winners ?? 0) > 0).length
  const weeksRollover = ledger.filter((w) => (w.number_of_winners ?? 0) === 0).length
  const totalDistributed = ledger
    .filter((w) => (w.number_of_winners ?? 0) > 0)
    .reduce((s, w) => s + (w.pot_amount ?? 0), 0)

  let biggestPotWeek: { weekNumber: number; potAmount: number } | null = null
  for (const w of ledger) {
    if ((w.number_of_winners ?? 0) <= 0) continue
    const amt = w.pot_amount ?? 0
    if (!biggestPotWeek || amt > biggestPotWeek.potAmount) {
      biggestPotWeek = { weekNumber: w.week_number, potAmount: amt }
    }
  }

  const leagueHighlights: LeagueSeasonHighlights = {
    seasonYear: year,
    leagueName: league.name,
    leagueSlug: league.slug,
    totalThirteenGames: thirteenGames.length,
    totalDistributed,
    weeksWithWinners,
    weeksRollover,
    biggestPotWeek,
    topEarner: topEarnerMember
      ? { name: topEarnerMember.name, amount: topEarnerRow!.totalWon }
      : null,
    mostWins: mostWinsMember
      ? { name: mostWinsMember.name, shares: mostWinsRow!.shares }
      : null,
    memberCount: membersList.length,
    nextSeasonBuyIn,
    weeklyBuyIn,
  }

  const memberStats: MemberSeasonStats[] = membersList.map((m) => {
    const stats = byMember.get(m.id) ?? { totalWon: 0, shares: 0, wins: [] }
    const teamAbbr = normalizeTeamAbbr(m.assigned_team)
    const nearMissCount = franchiseAbbrs(teamAbbr).reduce(
      (sum, abbr) => sum + (nearMissByTeam.get(abbr) ?? 0),
      0
    )
    const wins = [...stats.wins].sort((a, b) => a.weekNumber - b.weekNumber)

    return {
      memberId: m.id,
      memberName: m.name,
      email: m.email,
      teamAbbr,
      teamName: teamFullName(teamAbbr),
      totalWon: stats.totalWon,
      shares: stats.shares,
      wins,
      rank: rankMap.get(m.id) ?? membersList.length,
      memberCount: membersList.length,
      nearMissCount,
      nearMissLabel:
        nearMissCount > 0
          ? `${teamAbbr} scored exactly 12 run${nearMissCount === 1 ? '' : 's'} ${nearMissCount} time${nearMissCount === 1 ? '' : 's'} this season`
          : null,
      isTopEarner: topEarnerRow?.id === m.id && (topEarnerRow?.totalWon ?? 0) > 0,
      isMostWins: mostWinsRow?.id === m.id && (mostWinsRow?.shares ?? 0) > 0,
    }
  })

  const unsubSet = new Set(
    (unsubRes.data ?? []).map((r: { email: string }) => r.email.toLowerCase())
  )
  const emails = memberStats
    .flatMap((m) =>
      m.email
        ? m.email.split(',').map((e) => e.trim()).filter(Boolean)
        : []
    )
    .filter((e) => !unsubSet.has(e.toLowerCase()))

  return {
    league: leagueHighlights,
    members: memberStats,
    leagueId: league.id,
    leagueRules: league.rules,
    emails,
  }
}

export function buildWrappedPayloadForMember(
  data: NonNullable<Awaited<ReturnType<typeof buildSeasonWrappedData>>>,
  memberId: string,
  commissionerNote?: string
): SeasonWrappedPayload | null {
  const member = data.members.find((m) => m.memberId === memberId)
  if (!member) return null
  return {
    league: data.league,
    member,
    links: buildLinks(
      data.leagueId,
      data.league.leagueSlug,
      member.memberId,
      data.league.seasonYear,
      data.league.nextSeasonBuyIn,
      data.leagueRules
    ),
    commissionerNote,
  }
}
