'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import SeasonWrapped from '../../emails/SeasonWrapped'
import { verifyRecapCapability } from '@/lib/recapCapability'
import {
  buildSeasonWrappedData,
  buildWrappedPayloadForMember,
} from '@/lib/seasonWrappedData'
import { resolveVenmoUsername } from '@/lib/rsvpToken'

export type SeasonWrappedPreviewResult =
  | {
      ok: true
      html: string
      subjectLine: string
      seasonYear: number
      memberId: string
      memberName: string
      recipientCount: number
      members: { id: string; name: string; email: string | null; hasEmail: boolean }[]
      nextSeasonBuyIn: number
      venmoConfigured: boolean
    }
  | { ok: false; error: string }

export type SeasonWrappedSendResult =
  | { ok: true; sent: number; failed: number; errors: string[]; seasonYear: number }
  | { ok: false; error: string }

export async function listSeasonWrappedMembers(
  slug: string,
  capabilityToken: string,
  seasonYear?: number
): Promise<
  | {
      ok: true
      seasonYear: number
      nextSeasonBuyIn: number
      venmoConfigured: boolean
      members: { id: string; name: string; email: string | null; hasEmail: boolean }[]
    }
  | { ok: false; error: string }
> {
  const verified = verifyRecapCapability(capabilityToken)
  if (!verified || verified.slug !== slug) {
    return { ok: false, error: 'Unauthorized' }
  }

  const supabase = createServiceClient()
  const data = await buildSeasonWrappedData(supabase, slug, seasonYear)
  if (!data) return { ok: false, error: 'League not found' }
  if (data.leagueId !== verified.leagueId) return { ok: false, error: 'Unauthorized' }

  return {
    ok: true,
    seasonYear: data.league.seasonYear,
    nextSeasonBuyIn: data.league.nextSeasonBuyIn,
    venmoConfigured: !!resolveVenmoUsername(data.leagueRules),
    members: data.members.map((m) => ({
      id: m.memberId,
      name: m.memberName,
      email: m.email,
      hasEmail: !!(m.email && m.email.split(',').some((e) => e.trim())),
    })),
  }
}

export async function previewSeasonWrappedEmail(
  slug: string,
  capabilityToken: string,
  memberId: string,
  options?: { seasonYear?: number; commissionerNote?: string; subjectLine?: string }
): Promise<SeasonWrappedPreviewResult> {
  const verified = verifyRecapCapability(capabilityToken)
  if (!verified || verified.slug !== slug) {
    return { ok: false, error: 'Unauthorized' }
  }

  const supabase = createServiceClient()
  const data = await buildSeasonWrappedData(supabase, slug, options?.seasonYear)
  if (!data) return { ok: false, error: 'League not found' }
  if (data.leagueId !== verified.leagueId) return { ok: false, error: 'Unauthorized' }

  const payload = buildWrappedPayloadForMember(data, memberId, options?.commissionerNote)
  if (!payload) return { ok: false, error: 'Member not found' }

  const html = await render(SeasonWrapped(payload))
  const subjectLine =
    options?.subjectLine?.trim() ||
    `Your ${data.league.seasonYear} Season Wrapped — 13 Run League`

  return {
    ok: true,
    html,
    subjectLine,
    seasonYear: data.league.seasonYear,
    memberId: payload.member.memberId,
    memberName: payload.member.memberName,
    recipientCount: data.members.filter((m) => m.email && m.email.split(',').some((e) => e.trim()))
      .length,
    members: data.members.map((m) => ({
      id: m.memberId,
      name: m.memberName,
      email: m.email,
      hasEmail: !!(m.email && m.email.split(',').some((e) => e.trim())),
    })),
    nextSeasonBuyIn: data.league.nextSeasonBuyIn,
    venmoConfigured: !!payload.links.venmoUsername,
  }
}

/**
 * Sends personalized Wrapped emails one-by-one.
 * Gated by admin capability token — still requires Colby's explicit send click.
 * Never call this from automation.
 */
export async function sendSeasonWrappedEmails(
  slug: string,
  capabilityToken: string,
  options?: {
    seasonYear?: number
    commissionerNote?: string
    subjectLine?: string
    /** If set, only these member IDs. Otherwise all members with email. */
    memberIds?: string[]
  }
): Promise<SeasonWrappedSendResult> {
  const verified = verifyRecapCapability(capabilityToken)
  if (!verified || verified.slug !== slug) {
    return { ok: false, error: 'Unauthorized' }
  }

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const supabase = createServiceClient()
  const data = await buildSeasonWrappedData(supabase, slug, options?.seasonYear)
  if (!data) return { ok: false, error: 'League not found' }
  if (data.leagueId !== verified.leagueId) return { ok: false, error: 'Unauthorized' }

  const unsubRows = await supabase.from('email_unsubscribes').select('email')
  const unsubSet = new Set(
    (unsubRows.data ?? []).map((r: { email: string }) => r.email.toLowerCase())
  )

  const targets = data.members.filter((m) => {
    if (options?.memberIds && !options.memberIds.includes(m.memberId)) return false
    if (!m.email) return false
    return m.email.split(',').some((e) => {
      const t = e.trim()
      return t && !unsubSet.has(t.toLowerCase())
    })
  })

  if (targets.length === 0) {
    return { ok: false, error: 'No recipient emails found' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const defaultSubject =
    options?.subjectLine?.trim() ||
    `Your ${data.league.seasonYear} Season Wrapped — 13 Run League`

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const member of targets) {
    const payload = buildWrappedPayloadForMember(data, member.memberId, options?.commissionerNote)
    if (!payload) {
      failed++
      errors.push(`${member.memberName}: payload failed`)
      continue
    }

    const to = member.email!
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e && !unsubSet.has(e.toLowerCase()))

    if (to.length === 0) continue

    try {
      const html = await render(SeasonWrapped(payload))
      const { error } = await resend.emails.send({
        from: '13 Run League <recap@13runleague.com>',
        to,
        subject: defaultSubject,
        html,
        headers: {
          'List-Unsubscribe': '<mailto:recap@13runleague.com?subject=unsubscribe>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
      if (error) {
        failed++
        errors.push(`${member.memberName}: ${error.message}`)
      } else {
        sent++
      }
    } catch (e) {
      failed++
      errors.push(`${member.memberName}: ${e instanceof Error ? e.message : 'send failed'}`)
    }
  }

  return { ok: true, sent, failed, errors, seasonYear: data.league.seasonYear }
}
