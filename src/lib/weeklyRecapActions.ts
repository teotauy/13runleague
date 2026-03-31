'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import WeeklyRecap from '../../emails/WeeklyRecap'
import {
  getWeekNumber,
  getSeasonYear,
  getEffectiveRolloverPotForDashboard,
} from '@/lib/pot'
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

  const emails = (members ?? [])
    .flatMap((m) =>
      m.email
        ? m.email.split(',').map((e: string) => e.trim()).filter(Boolean)
        : []
    )
    .filter((e): e is string => !!e)

  const activeMemberCount = (members ?? []).length
  const weeklyPot = (league.weekly_buy_in ?? 10) * activeMemberCount

  const today = new Date()
  const weekNumber = getWeekNumber(today)
  const seasonYear = getSeasonYear(today)
  const rolloverPot = await getEffectiveRolloverPotForDashboard(
    league.id,
    league.pot_total,
    seasonYear,
    weekNumber,
    supabase
  )

  const props = {
    weekNumber,
    upcomingGames: [] as { away: string; home: string; date: string; probability: number }[],
    leagues: [{
      leagueName: league.name,
      potTotal: rolloverPot + weeklyPot,
      weeklyBuyIn: league.weekly_buy_in ?? 10,
    }],
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
    showLeaguePot: options?.showLeaguePot !== false,
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
    to: data.emails,
    subject: `13 Run League — Week ${data.weekNumber} Recap`,
    html,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, sent: data.emails.length, weekNumber: data.weekNumber }
}
