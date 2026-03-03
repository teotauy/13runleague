import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DraftRoom from '@/components/draft/DraftRoom'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DraftPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  const { data: members } = await supabase
    .from('members')
    .select('id, name, assigned_team')
    .eq('league_id', league.id)
    .order('name')

  const { data: activeDraft } = await supabase
    .from('draft_sessions')
    .select('id, draft_mode, draft_status')
    .eq('league_id', league.id)
    .neq('draft_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: draftPicks } = await supabase
    .from('draft_picks')
    .select('id, member_id, team_abbr, pick_order')
    .eq('draft_session_id', activeDraft?.id || '')
    .order('pick_order', { ascending: true })

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black">
                <span className="text-[#39ff14]">Draft</span> Room
              </h1>
              <p className="text-gray-400 text-lg mt-1">{league.name}</p>
            </div>
            <a href={`/league/${slug}/admin`} className="text-gray-600 text-sm hover:text-gray-400">
              ← Back to Admin
            </a>
          </div>
        </header>

        {/* Draft Room */}
        <DraftRoom
          leagueId={league.id}
          leagueSlug={slug}
          members={members ?? []}
          activeDraft={activeDraft}
          draftPicks={draftPicks ?? []}
        />
      </div>
    </main>
  )
}
