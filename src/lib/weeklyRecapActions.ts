'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import WeeklyRecap from '../../emails/WeeklyRecap'
import {
  getWeekNumber,
  getSeasonYear,
  getEffectiveRolloverPotForDashboard,
  getWeekCalendarBoundsForSeasonYear,
} from '@/lib/pot'
import type { WeekResults } from '../../emails/WeeklyRecap'
import { verifyRecapCapability } from '@/lib/recapCapability'
import { sanitizeRecapHtml } from '@/lib/recapHtmlSanitize'
import { buildRecapSuggestions, type RecapSuggestionBlock } from '@/lib/recapSuggestions'

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

  const today = new Date()
  // Recap is always for the most recently completed week (Sun–Sat window).
  // A new playing week starts on Sunday, so Saturday is the last day of the
  // completed week. Regardless of what day the commissioner opens the recap
  // editor, anchor to the most recent Saturday so we query the right week's
  // payouts. Sun(0)→back 1 day, Mon(1)→back 2, …, Sat(6)→back 0.
  const dayOfWeek = today.getDay()
  const daysToLastSat = (dayOfWeek + 1) % 7
  const recapAnchor = new Date(today.getTime() - daysToLastSat * 24 * 60 * 60 * 1000)
  const weekNumber = getWeekNumber(recapAnchor)
  const seasonYear = getSeasonYear(recapAnchor)
  const rolloverPot = await getEffectiveRolloverPotForDashboard(
    league.id,
    league.pot_total,
    seasonYear,
    weekNumber,
    supabase
  )

  // ── Week results: settled payouts + 13-run games ──────────────────────────
  const { start: weekStart, end: weekEnd } =
    getWeekCalendarBoundsForSeasonYear(seasonYear, weekNumber)

  const [thirteenGamesRes, payoutRowsRes, ledgerRes] = await Promise.all([
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
  ])

  const payoutRows = payoutRowsRes.data ?? []
  const thirteenGames = thirteenGamesRes.data ?? []
  const ledger = ledgerRes.data

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
  const rolloverAmount = weekWinners.length === 0 ? (ledger?.pot_amount ?? 0) : 0

  const weekResults: WeekResults = {
    thirteenRunGames: thirteenGames.map((g) => ({
      gameDate: g.game_date,
      winningTeam: g.winning_team,
    })),
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
      potTotal: rolloverPot + weeklyPot,
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
  | { ok: true; html: string; weekNumber: number; recipientCount: number }
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

  const html = await render(WeeklyRecap(mergeRecapProps(data, options)))
  return {
    ok: true,
    html,
    weekNumber: data.weekNumber,
    recipientCount: data.emails.length,
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

  const { error } = await resend.emails.send({
    from: '13 Run League <recap@13runleague.com>',
    to: ['recap@13runleague.com'],
    bcc: data.emails,
    subject: `13 Run League — Week ${data.weekNumber} Recap`,
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
