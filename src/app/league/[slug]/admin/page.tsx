import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getWeekNumber, getSeasonYear } from '@/lib/pot'
import MemberRoster from '@/components/admin/MemberRoster'
import PaymentBoard from '@/components/admin/PaymentBoard'
import TeamAssignment from '@/components/admin/TeamAssignment'
import PreSeasonStatus from '@/components/admin/PreSeasonStatus'
import MemberPasswordForm from '@/components/admin/MemberPasswordForm'
import RecalculateStreaksButton from '@/components/admin/RecalculateStreaksButton'

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

  const { data: payments } = await supabase
    .from('weekly_payments')
    .select('id, member_id, week_number, payment_status, override_note')
    .in('member_id', (members ?? []).map((m) => m.id))
    .order('week_number', { ascending: false })

  // Get current week and year for payout tracking
  const today = new Date()
  const currentWeekNumber = getWeekNumber(today)
  const seasonYear = getSeasonYear(today)

  // Fetch payout status for all weeks
  const { data: payoutLedger } = await supabase
    .from('weekly_pot_ledger')
    .select('week_number, number_of_winners, pot_amount, calculated_at')
    .eq('league_id', league.id)
    .eq('year', seasonYear)

  const payoutInfo = payoutLedger?.map((entry) => ({
    week_number: entry.week_number,
    calculated: entry.calculated_at !== null,
    total_distributed: entry.number_of_winners > 0 ? Math.floor((entry.pot_amount || 0) / entry.number_of_winners) * entry.number_of_winners : 0,
    number_of_winners: entry.number_of_winners,
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
            <div className="flex gap-3 items-center">
              <a href={`/league/${slug}/draft`} className="text-gray-600 text-sm hover:text-gray-400">
                Draft Room →
              </a>
              <a href={`/league/${slug}`} className="text-gray-600 text-sm hover:text-gray-400">
                League Dashboard →
              </a>
              <a href={`/api/league/${slug}/logout`} className="text-gray-600 text-xs hover:text-red-400 transition-colors">
                Log out
              </a>
            </div>
          </div>
        </header>

        {/* Pre-Season Status */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Pre-Season Status</h2>
            <span className="text-xs text-gray-600 font-mono">2026 draft prep</span>
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
        <section>
          <h2 className="text-xl font-bold mb-4">Roster</h2>
          <MemberRoster
            leagueId={league.id}
            leagueSlug={slug}
            members={membersWithActive}
            previousNames={previousNames}
            yearsPlayedByName={yearsPlayedByName}
          />
        </section>

        {/* Team Assignment */}
        <section>
          <h2 className="text-xl font-bold mb-4">Team Assignment</h2>
          <TeamAssignment
            members={(members ?? []).filter((m) => m.is_active !== false)}
            leagueSlug={slug}
          />
        </section>

        {/* Payment Board */}
        <section>
          <PaymentBoard
            members={membersWithActive}
            payments={payments ?? []}
            leagueSlug={slug}
            payouts={payoutInfo}
            year={seasonYear}
          />
        </section>

        {/* Streaks */}
        <section>
          <h2 className="text-xl font-bold mb-1">Streaks &amp; Droughts</h2>
          <p className="text-xs text-gray-600 mb-4">
            Automatically recalculated whenever payouts are settled. Use this to backfill or repair the leaderboard's Drought column.
          </p>
          <RecalculateStreaksButton leagueSlug={slug} year={seasonYear} />
        </section>

        {/* League Settings */}
        <section>
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
