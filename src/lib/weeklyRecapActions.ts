'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import WeeklyRecap from '../../emails/WeeklyRecap'
import {
  getWeekNumber,
  getSeasonYear,
  getWeekCalendarBoundsForSeasonYear,
} from '@/lib/pot'
import { fetchWeeklyFinalScores } from '@/lib/mlb'
import type { WeekResults } from '../../emails/WeeklyRecap'
import { verifyRecapCapability } from '@/lib/recapCapability'
import { sanitizeRecapHtml } from '@/lib/recapHtmlSanitize'
import { buildRecapSuggestions, type RecapSuggestionBlock } from '@/lib/recapSuggestions'

/** Calendar Y/M/D and weekday (0=Sun) in America/New_York. */
function etCalendar(date: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10)
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10)
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10)
  const wd = parts.find((p) => p.type === 'weekday')!.value
  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)
  return { year, month, day, dayOfWeek }
}

/**
 * Most recent Saturday on the ET baseball calendar, as a local Date at noon.
 * Playing weeks are Sun–Sat ET; never use the server's UTC weekday.
 */
function mostRecentSaturdayEt(today: Date = new Date()): Date {
  const et = etCalendar(today)
  const daysToLastSat = (et.dayOfWeek + 1) % 7
  // Walk the ET calendar date back to Saturday, then build a noon local Date
  // so getWeekNumber/getSeasonYear see the intended calendar day on UTC hosts.
  const utcNoon = Date.UTC(et.year, et.month - 1, et.day - daysToLastSat, 12, 0, 0)
  const sat = new Date(utcNoon)
  return new Date(sat.getUTCFullYear(), sat.getUTCMonth(), sat.getUTCDate(), 12, 0, 0)
}

function thirteenGameKey(gameDate: string, winningTeam: string): string {
  return `${gameDate}|${winningTeam.split(',').map((t) => t.trim().toUpperCase()).sort().join(',')}`
}

async function buildRecapData(slug: string) {
  const supabase = createServiceClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, pot_total, weekly_buy_in')
    .eq('slug', slug)
    .single()

  if (!league) return null

  const { data: members } = await supabase
    .from('members')
    .select('name, email, is_active')
    .eq('league_id', league.id)
    .neq('is_active', false)

  const rawEmails = (members ?? [])
    .flatMap((m) =>
      m.email
        ? m.email.split(',').map((e: string) => e.trim()).filter(Boolean)
        : []
    )
    .filter((e): e is string => !!e)

  // Filter out anyone who has unsubscribed
  const { data: unsubRows } = await supabase
    .from('email_unsubscribes')
    .select('email')
  const unsubSet = new Set((unsubRows ?? []).map((r: { email: string }) => r.email.toLowerCase()))
  const emails = rawEmails.filter((e) => !unsubSet.has(e.toLowerCase()))

  const activeMemberCount = (members ?? []).length
  const weeklyPot = (league.weekly_buy_in ?? 10) * activeMemberCount

  // Recap is always for the most recently completed week (Sun–Sat ET window).
  // Anchor to the most recent Saturday in Eastern Time so UTC hosts (Vercel)
  // don't shift the week when ET is still Saturday / early Sunday.
  const recapAnchor = mostRecentSaturdayEt()
  const weekNumber = getWeekNumber(recapAnchor)
  const seasonYear = getSeasonYear(recapAnchor)

  // ── Week results: settled payouts + 13-run games ──────────────────────────
  const { start: weekStart, end: weekEnd } =
    getWeekCalendarBoundsForSeasonYear(seasonYear, weekNumber)

  const [thirteenGamesRes, payoutRowsRes, ledgerRes, mlbThirteenGames] = await Promise.all([
    supabase
      .from('game_results')
      .select('winning_team, game_date')
      .eq('was_thirteen', true)
      .gte('game_date', weekStart)
      .lte('game_date', weekEnd)
      .order('game_date', { ascending: true }),
    supabase
      .from('payouts')
      .select('member_id, payout_amount, winning_team, game_date, shares_count')
      .eq('league_id', league.id)
      .eq('week_number', weekNumber)
      .eq('year', seasonYear),
    supabase
      .from('weekly_pot_ledger')
      .select('pot_amount, number_of_winners')
      .eq('league_id', league.id)
      .eq('week_number', weekNumber)
      .eq('year', seasonYear)
      .maybeSingle(),
    // Live MLB cross-check — same source settle-preview uses — so a late
    // West Coast 13 (officialDate still Saturday) appears even if game_results
    // is lagging behind the push cron.
    fetchWeeklyFinalScores(weekStart, weekEnd),
  ])

  const payoutRows = payoutRowsRes.data ?? []
  const dbThirteenGames = thirteenGamesRes.data ?? []
  const ledger = ledgerRes.data

  // Merge DB + MLB; prefer official schedule dates from MLB when present.
  const thirteenByKey = new Map<string, { gameDate: string; winningTeam: string }>()
  for (const g of dbThirteenGames) {
    if (!g.winning_team) continue
    thirteenByKey.set(thirteenGameKey(g.game_date, g.winning_team), {
      gameDate: g.game_date,
      winningTeam: g.winning_team,
    })
  }
  for (const g of mlbThirteenGames) {
    const winningTeam = g.winningAbbrs.join(',')
    if (!winningTeam) continue
    const key = thirteenGameKey(g.gameDate, winningTeam)
    // MLB officialDate wins on conflict (corrects ISO-split / overnight misdates).
    thirteenByKey.set(key, { gameDate: g.gameDate, winningTeam })
  }
  const thirteenRunGames = [...thirteenByKey.values()].sort((a, b) =>
    a.gameDate.localeCompare(b.gameDate) || a.winningTeam.localeCompare(b.winningTeam)
  )

  // Resolve member names for payout rows
  const winnerIds = [...new Set(payoutRows.map((p) => p.member_id))]
  let winnerMembers: { id: string; name: string }[] = []
  if (winnerIds.length > 0) {
    const { data } = await supabase
      .from('members')
      .select('id, name')
      .in('id', winnerIds)
    winnerMembers = data ?? []
  }
  const nameById = new Map(winnerMembers.map((m) => [m.id, m.name]))

  // Aggregate winners — members with multiple shares sum their payouts
  const winnerMap = new Map<string, { memberName: string; team: string; payoutAmount: number; shares: number }>()
  for (const p of payoutRows) {
    const memberName = nameById.get(p.member_id) ?? 'Unknown'
    const existing = winnerMap.get(p.member_id)
    if (existing) {
      existing.payoutAmount += p.payout_amount
      existing.shares += 1
    } else {
      winnerMap.set(p.member_id, {
        memberName,
        team: p.winning_team,
        payoutAmount: p.payout_amount,
        shares: 1,
      })
    }
  }

  const weekWinners = [...winnerMap.values()]
  const totalDistributed = weekWinners.reduce((s, w) => s + w.payoutAmount, 0)
  const rolloverAmount =
    weekWinners.length === 0 && thirteenRunGames.length === 0
      ? (ledger?.pot_amount ?? 0)
      : 0

  const weekResults: WeekResults = {
    thirteenRunGames,
    winners: weekWinners,
    totalDistributed,
    rolloverAmount,
    nextWeekNumber: weekNumber + 1,
  }
  // ──────────────────────────────────────────────────────────────────────────

  const props = {
    weekNumber,
    upcomingGames: [] as { away: string; home: string; date: string; probability: number }[],
    leagues: [{
      leagueName: league.name,
      // The recap pot block should show the current post-settlement pot, while
      // the winner banner above shows the completed week's settled payout.
      potTotal: (league.pot_total ?? 0) + weeklyPot,
      weeklyBuyIn: league.weekly_buy_in ?? 10,
    }],
    weekResults,
  }

  return { league, emails, props, weekNumber }
}

export type RecapEditorOptions = {
  commissionerHtml?: string | null
  showLeaguePot?: boolean
  showBranding?: boolean
  subjectLine?: string | null
}

function mergeRecapProps(
  data: NonNullable<Awaited<ReturnType<typeof buildRecapData>>>,
  options?: RecapEditorOptions
) {
  const raw = options?.commissionerHtml
  const commissionerHtml =
    raw && String(raw).trim() ? sanitizeRecapHtml(String(raw)) : undefined
  return {
    ...data.props,
    commissionerHtml,
    showLeaguePot: options?.showLeaguePot === true,
    showBranding: options?.showBranding !== false,
  }
}

export type RecapSuggestionsResult =
  | { ok: true; blocks: RecapSuggestionBlock[]; weekNumber: number; recipientCount: number }
  | { ok: false; error: string }

export async function fetchRecapSuggestions(
  slug: string,
  capabilityToken: string
): Promise<RecapSuggestionsResult> {
  const verified = verifyRecapCapability(capabilityToken)
  if (!verified || verified.slug !== slug) {
    return { ok: false, error: 'Unauthorized' }
  }

  const supabase = createServiceClient()
  const { data: league } = await supabase.from('leagues').select('id').eq('slug', slug).single()
  if (!league || league.id !== verified.leagueId) {
    return { ok: false, error: 'Unauthorized' }
  }

  const data = await buildRecapData(slug)
  if (!data || data.league.id !== verified.leagueId) {
    return { ok: false, error: 'Unauthorized' }
  }

  const blocks = await buildRecapSuggestions(league.id, supabase)
  return {
    ok: true,
    blocks,
    weekNumber: data.weekNumber,
    recipientCount: data.emails.length,
  }
}

export type WeeklyRecapPreviewResult =
  | { ok: true; html: string; weekNumber: number; recipientCount: number; subjectLine: string }
  | { ok: false; error: string }

export async function previewWeeklyRecapEmail(
  slug: string,
  capabilityToken: string,
  options?: RecapEditorOptions
): Promise<WeeklyRecapPreviewResult> {
  const verified = verifyRecapCapability(capabilityToken)
  if (!verified || verified.slug !== slug) {
    return { ok: false, error: 'Unauthorized' }
  }

  const data = await buildRecapData(slug)
  if (!data) return { ok: false, error: 'League not found' }

  if (data.league.id !== verified.leagueId) {
    return { ok: false, error: 'Unauthorized' }
  }

  const mergedProps = mergeRecapProps(data, options)
  const html = await render(WeeklyRecap(mergedProps))
  const subjectLine = options?.subjectLine?.trim() || `13 Run League — Week ${data.weekNumber} Recap`
  return {
    ok: true,
    html,
    weekNumber: data.weekNumber,
    recipientCount: data.emails.length,
    subjectLine,
  }
}

export type WeeklyRecapSendResult =
  | { ok: true; sent: number; weekNumber: number }
  | { ok: false; error: string }

export async function sendWeeklyRecapEmail(
  slug: string,
  capabilityToken: string,
  options?: RecapEditorOptions
): Promise<WeeklyRecapSendResult> {
  const verified = verifyRecapCapability(capabilityToken)
  if (!verified || verified.slug !== slug) {
    return { ok: false, error: 'Unauthorized' }
  }

  const data = await buildRecapData(slug)
  if (!data) return { ok: false, error: 'League not found' }

  if (data.league.id !== verified.leagueId) {
    return { ok: false, error: 'Unauthorized' }
  }

  if (data.emails.length === 0) {
    return { ok: false, error: 'No recipient emails found' }
  }

  const html = await render(WeeklyRecap(mergeRecapProps(data, options)))
  const resend = new Resend(process.env.RESEND_API_KEY)
  const subjectLine = options?.subjectLine?.trim() || `13 Run League — Week ${data.weekNumber} Recap`

  const { error } = await resend.emails.send({
    from: '13 Run League <recap@13runleague.com>',
    to: ['recap@13runleague.com'],
    bcc: data.emails,
    subject: subjectLine,
    html,
    headers: {
      'List-Unsubscribe': '<mailto:recap@13runleague.com?subject=unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, sent: data.emails.length, weekNumber: data.weekNumber }
}
