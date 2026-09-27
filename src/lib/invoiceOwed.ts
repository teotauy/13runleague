import type { SupabaseClient } from '@supabase/supabase-js'
import { buyInOwed, getSeasonYear, SEASON_WEEKS } from '@/lib/pot'

export type SeasonPaymentStatus = 'paid' | '50%' | 'unpaid'

export interface InvoiceCandidate {
  memberId: string
  memberName: string
  email: string | null
  team: string | null
  paymentStatus: SeasonPaymentStatus
  seasonBuyIn: number
  buyInOwed: number
  seasonWins: number
  /** max(0, buyInOwed − seasonWins) — amount the invoice asks for */
  amountDue: number
  winWeeks: { weekNumber: number; amount: number }[]
}

export interface InvoiceOwedResult {
  leagueId: string
  leagueName: string
  seasonYear: number
  weeklyBuyIn: number
  seasonBuyIn: number
  /** Members with amountDue > 0 (unpaid / partial, wins did not cover buy-in) */
  invoices: InvoiceCandidate[]
  /** Unpaid/partial members whose wins already cover buy-in — no invoice */
  coveredByWins: InvoiceCandidate[]
  /** Fully paid members (for transparency in admin UI) */
  paidCount: number
  activeMemberCount: number
}

/**
 * Season paid signal for this league (not a weekly pay-in league).
 * Prefer `pre_season_paid`; fall back to weekly board only when it clearly marks paid/50%.
 */
export function resolveSeasonPaymentStatus(
  preSeasonPaid: boolean | null | undefined,
  weeklyStatuses: (string | null | undefined)[]
): SeasonPaymentStatus {
  if (preSeasonPaid) return 'paid'
  if (weeklyStatuses.some((s) => s === 'paid')) return 'paid'
  if (weeklyStatuses.some((s) => s === '50%')) return '50%'
  return 'unpaid'
}

/** Pure: net invoice amount after crediting season wins against buy-in owed. */
export function computeInvoiceAmount(
  weeklyBuyIn: number,
  paymentStatus: SeasonPaymentStatus,
  seasonWins: number
): {
  seasonBuyIn: number
  buyInOwed: number
  seasonWins: number
  amountDue: number
} {
  const seasonBuyIn = weeklyBuyIn * SEASON_WEEKS
  const owed = buyInOwed(paymentStatus === 'unpaid' ? null : paymentStatus, weeklyBuyIn)
  const wins = Math.max(0, Math.round(seasonWins))
  return {
    seasonBuyIn,
    buyInOwed: owed,
    seasonWins: wins,
    amountDue: Math.max(0, owed - wins),
  }
}

type MemberRow = {
  id: string
  name: string
  email: string | null
  assigned_team: string | null
  pre_season_paid: boolean | null
  is_active: boolean | null
}

/**
 * Live DB: active members who still owe buy-in after crediting season wins.
 * Invoice list = amountDue > 0 only.
 */
export async function loadInvoiceOwed(
  supabase: SupabaseClient,
  leagueSlug: string,
  asOf: Date = new Date()
): Promise<InvoiceOwedResult | null> {
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, weekly_buy_in')
    .eq('slug', leagueSlug)
    .single()

  if (leagueError || !league) return null

  const seasonYear = getSeasonYear(asOf)
  const weeklyBuyIn = league.weekly_buy_in ?? 10
  const seasonBuyIn = weeklyBuyIn * SEASON_WEEKS

  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, name, email, assigned_team, pre_season_paid, is_active')
    .eq('league_id', league.id)
    .order('name')

  if (membersError) throw new Error(membersError.message)

  const active = ((members ?? []) as MemberRow[]).filter((m) => m.is_active !== false)
  const memberIds = active.map((m) => m.id)

  const [weeklyRes, payoutsRes] = await Promise.all([
    memberIds.length > 0
      ? supabase
          .from('weekly_payments')
          .select('member_id, payment_status')
          .in('member_id', memberIds)
      : Promise.resolve({ data: [] as { member_id: string; payment_status: string }[], error: null }),
    memberIds.length > 0
      ? supabase
          .from('payouts')
          .select('member_id, payout_amount, week_number')
          .eq('league_id', league.id)
          .eq('year', seasonYear)
          .in('member_id', memberIds)
      : Promise.resolve({
          data: [] as { member_id: string; payout_amount: number; week_number: number }[],
          error: null,
        }),
  ])

  if (weeklyRes.error) throw new Error(weeklyRes.error.message)
  if (payoutsRes.error) throw new Error(payoutsRes.error.message)

  const weeklyByMember = new Map<string, string[]>()
  for (const row of weeklyRes.data ?? []) {
    const list = weeklyByMember.get(row.member_id) ?? []
    list.push(row.payment_status)
    weeklyByMember.set(row.member_id, list)
  }

  const winsByMember = new Map<string, number>()
  const winWeeksByMember = new Map<string, Map<number, number>>()
  for (const row of payoutsRes.data ?? []) {
    winsByMember.set(row.member_id, (winsByMember.get(row.member_id) ?? 0) + Number(row.payout_amount ?? 0))
    const weeks = winWeeksByMember.get(row.member_id) ?? new Map<number, number>()
    weeks.set(row.week_number, (weeks.get(row.week_number) ?? 0) + Number(row.payout_amount ?? 0))
    winWeeksByMember.set(row.member_id, weeks)
  }

  const invoices: InvoiceCandidate[] = []
  const coveredByWins: InvoiceCandidate[] = []
  let paidCount = 0

  for (const member of active) {
    const paymentStatus = resolveSeasonPaymentStatus(
      member.pre_season_paid,
      weeklyByMember.get(member.id) ?? []
    )
    if (paymentStatus === 'paid') {
      paidCount++
      continue
    }

    const seasonWins = winsByMember.get(member.id) ?? 0
    const amounts = computeInvoiceAmount(weeklyBuyIn, paymentStatus, seasonWins)
    const weekMap = winWeeksByMember.get(member.id)
    const winWeeks = weekMap
      ? [...weekMap.entries()]
          .map(([weekNumber, amount]) => ({ weekNumber, amount }))
          .sort((a, b) => a.weekNumber - b.weekNumber)
      : []

    const candidate: InvoiceCandidate = {
      memberId: member.id,
      memberName: member.name,
      email: member.email,
      team: member.assigned_team,
      paymentStatus,
      seasonBuyIn: amounts.seasonBuyIn,
      buyInOwed: amounts.buyInOwed,
      seasonWins: amounts.seasonWins,
      amountDue: amounts.amountDue,
      winWeeks,
    }

    if (amounts.amountDue > 0) {
      invoices.push(candidate)
    } else {
      coveredByWins.push(candidate)
    }
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    seasonYear,
    weeklyBuyIn,
    seasonBuyIn,
    invoices,
    coveredByWins,
    paidCount,
    activeMemberCount: active.length,
  }
}
