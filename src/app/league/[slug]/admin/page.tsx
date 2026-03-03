import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MemberRoster from '@/components/admin/MemberRoster'
import PaymentBoard from '@/components/admin/PaymentBoard'
import TeamAssignment from '@/components/admin/TeamAssignment'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AdminDashboard({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug, password_hash, weekly_buy_in')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  const { data: members } = await supabase
    .from('members')
    .select('id, name, assigned_team, phone, email')
    .eq('league_id', league.id)
    .order('name')

  const { data: payments } = await supabase
    .from('weekly_payments')
    .select('id, member_id, week_number, payment_status, override_note')
    .in('member_id', (members ?? []).map((m) => m.id))
    .order('week_number', { ascending: false })

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
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
            <a href={`/league/${slug}`} className="text-gray-600 text-sm hover:text-gray-400">
              ← League Dashboard
            </a>
          </div>
        </header>

        {/* Member Roster Management */}
        <section>
          <h2 className="text-xl font-bold mb-4">Roster</h2>
          <MemberRoster
            leagueId={league.id}
            leagueSlug={slug}
            members={members ?? []}
          />
        </section>

        {/* Team Assignment */}
        <section>
          <h2 className="text-xl font-bold mb-4">Team Assignment</h2>
          <TeamAssignment
            members={members ?? []}
            leagueSlug={slug}
          />
        </section>

        {/* Payment Board */}
        <section>
          <h2 className="text-xl font-bold mb-4">Payment Status</h2>
          <PaymentBoard
            members={members ?? []}
            payments={payments ?? []}
            leagueSlug={slug}
          />
        </section>
      </div>
    </main>
  )
}
