import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getWeekNumber, getSeasonYear } from '@/lib/pot'
import MemberRoster from '@/components/admin/MemberRoster'
import TeamAssignment from '@/components/admin/TeamAssignment'
import PreSeasonStatus from '@/components/admin/PreSeasonStatus'
import MemberPasswordForm from '@/components/admin/MemberPasswordForm'
import RecalculateStreaksButton from '@/components/admin/RecalculateStreaksButton'
import SendReceiptModal from '@/components/admin/SendReceiptModal'
import WeeklyRecapSection from '@/components/admin/WeeklyRecapSection'
import PaymentBoard from '@/components/admin/PaymentBoard'
import { signRecapCapability } from '@/lib/recapCapability'

export const dynamic = 'force-dynamic'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AdminDashboard({ params }: Props) {
  const { slug } = await params

  // Auth check - admin only (middleware also enforces this)
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!isAdmin(authCookie?.value)) {
    notFound()
  }

  const supabase = createServiceClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug, password_hash, weekly_buy_in')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  const recapCapabilityToken = signRecapCapability(league.id, slug)

  // Optional query — member_password_hash column added in migration 20260305010000
  // Gracefully handles the case where the migration hasn't run yet
  const { data: leagueAuth } = await supabase
    .from('leagues')
    .select('member_password_hash')
    .eq('id', league.id)
    .single()
  const hasMemberPassword = !!(leagueAuth as { member_password_hash?: string | null } | null)?.member_password_hash

  const { data: members } = await supabase
    .from('members')
    .select('id, name, assigned_team, phone, email, pre_season_returning, pre_season_paid, is_active')
    .eq('league_id', league.id)
    .order('name')

  // Optional is_active column — added in migration 20260317000000
  // Gracefully returns null if the migration hasn't been run in production yet
  const { data: activeData } = await supabase
    .from('members')
    .select('id, is_active')
    .eq('league_id', league.id)

  const membersWithActive = (members ?? []).map((m) => ({
    ...m,
    is_active: (activeData?.find((a) => a.id === m.id)?.is_active as boolean | null) ?? null,
  }))

  // Optional pre-season columns — added in migration 20260305000000
  // Gracefully returns null if the migration hasn't been run in production yet
  const { data: preSeasonData } = await supabase
    .from('members')
    .select('id, pre_season_returning, pre_season_paid')
    .eq('league_id', league.id)

  // Merge pre-season data into members (defaults to null/false if migration not run)
  const membersWithPreSeason = membersWithActive.map((m) => ({
    ...m,
    pre_season_returning: (preSeasonData?.find((p) => p.id === m.id)?.pre_season_returning as 'yes' | 'no' | 'maybe' | null) ?? null,
    pre_season_paid: (preSeasonData?.find((p) => p.id === m.id)?.pre_season_paid as boolean | null) ?? false,
  }))

  const today = new Date()
  const currentWeekNumber = getWeekNumber(today)
  const seasonYear = getSeasonYear(today)

  const memberIds = (members ?? []).map((m) => m.id)
  let weeklyPaymentsRows: {
    id: string
    member_id: string
    week_number: number
    payment_status: string
    override_note?: string | null
  }[] = []
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from('weekly_payments')
      .select('id, member_id, week_number, payment_status, override_note')
      .in('member_id', memberIds)
    weeklyPaymentsRows = data ?? []
  }

  const { data: ledgerRows } = await supabase
    .from('weekly_pot_ledger')
    .select('week_number, number_of_winners, pot_amount')
    .eq('league_id', league.id)
    .eq('year', seasonYear)

  const payoutSummaries =
    ledgerRows?.map((row) => ({
      week_number: row.week_number,
      calculated: true,
      number_of_winners: row.number_of_winners ?? 0,
      total_distributed: row.pot_amount,
    })) ?? []

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <header>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black">
                <span className="text-[#39ff14]">Admin</span> Dashboard
              </h1>
              <p className="text-gray-400 text-lg mt-1">{league.name}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <a href={`/league/${slug}/draft`} className="text-gray-500 text-sm hover:text-gray-300">
                Draft Room →
              </a>
              <a href={`/league/${slug}`} className="text-gray-500 text-sm hover:text-gray-300">
                League Dashboard →
              </a>
              <a
                href={`/api/league/${slug}/logout`}
                className="text-sm font-semibold text-red-400/90 hover:text-red-300 border border-red-900/80 hover:border-red-700 rounded-md px-3 py-1.5 transition-colors"
              >
                Log out
              </a>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-4">
            <SendReceiptModal
              leagueSlug={slug}
              memberCount={membersWithActive.filter((m) => m.email && m.is_active !== false).length}
              members={membersWithActive.map((m) => ({ id: m.id, name: m.name }))}
            />
          </div>
          {/* Nav */}
          <div className="flex gap-4 mt-3 text-xs text-gray-400 font-mono border-t border-gray-900 pt-3 flex-wrap">
            <a href="#recap" className="hover:text-[#39ff14] transition-colors">Weekly Recap Email</a>
            <a href="#payments" className="hover:text-[#39ff14] transition-colors">Settle week &amp; payments</a>
            <a href="#roster" className="hover:text-gray-400 transition-colors">Roster</a>
            <a href="#teams" className="hover:text-gray-400 transition-colors">Teams</a>
            <a href="#settings" className="hover:text-gray-400 transition-colors">Settings</a>
          </div>
        </header>

        {/* Weekly Recap Email */}
        <section id="recap">
          <h2 className="text-xl font-bold mb-4">Weekly Recap Email</h2>
          <WeeklyRecapSection leagueSlug={slug} recapCapabilityToken={recapCapabilityToken} />
        </section>

        {/* Payments grid + settle week (payouts API) */}
        <section id="payments">
          <h2 className="text-xl font-bold mb-1">Payments &amp; settle week</h2>
          <p className="text-sm text-gray-500 mb-4">
            Track Venmo/cash per member per week. When a week is done, use <strong className="text-gray-400">Settle week</strong>{' '}
            below — that records the pot ledger, payouts (if any 13-run winners), rollover, and refreshes droughts.{' '}
            <span className="text-gray-400 font-mono">Season {seasonYear} · playing week {currentWeekNumber}</span>
          </p>
          <PaymentBoard
            members={(members ?? [])
              .filter((m) => m.is_active !== false)
              .map((m) => ({
                id: m.id,
                name: m.name,
                assigned_team: m.assigned_team,
              }))}
            payments={weeklyPaymentsRows.map((p) => ({
              ...p,
              override_note: p.override_note ?? undefined,
            }))}
            leagueSlug={slug}
            payouts={payoutSummaries}
            year={seasonYear}
            currentWeek={currentWeekNumber}
          />
        </section>

        {/* Pre-Season Status */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Pre-Season Status</h2>
            <span className="text-xs text-gray-400 font-mono">2026 draft prep</span>
          </div>
          <PreSeasonStatus
            leagueSlug={slug}
            members={(members ?? []).map((m) => ({
              id: m.id,
              name: m.name,
              assigned_team: m.assigned_team,
              pre_season_returning: (m.pre_season_returning as 'yes' | 'no' | 'maybe' | null) ?? null,
              pre_season_paid: m.pre_season_paid ?? false,
            }))}
          />
        </section>

        {/* Member Roster Management */}
        <section id="roster">
          <h2 className="text-xl font-bold mb-4">Roster</h2>
          <MemberRoster
            leagueId={league.id}
            leagueSlug={slug}
            members={membersWithActive.map((m) => ({ ...m, is_active: m.is_active ?? undefined }))}
          />
        </section>

        {/* Team Assignment */}
        <section id="teams">
          <h2 className="text-xl font-bold mb-4">Team Assignment</h2>
          <TeamAssignment
            members={(members ?? []).filter((m) => m.is_active !== false)}
            leagueSlug={slug}
          />
        </section>

        {/* Streaks */}
        <section>
          <h2 className="text-xl font-bold mb-1">Streaks &amp; Droughts</h2>
          <p className="text-xs text-gray-400 mb-4">
            Automatically recalculated whenever payouts are settled. Use this to backfill or repair the leaderboard's Drought column.
          </p>
          <RecalculateStreaksButton leagueSlug={slug} year={seasonYear} />
        </section>

        {/* League Settings */}
        <section id="settings">
          <h2 className="text-xl font-bold mb-4">League Settings</h2>
          <div className="space-y-4">
            <MemberPasswordForm
              leagueSlug={slug}
              hasMemberPassword={hasMemberPassword}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
