import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function HistoryIndexPage({ params }: Props) {
  const { slug } = await params

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!authCookie) {
    redirect(`/league/${slug}/join`)
  }

  const supabase = createServiceClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  const { data: yearRows } = await supabase
    .from('historical_results')
    .select('year')
    .eq('league_id', league.id)

  if (!yearRows || yearRows.length === 0) {
    redirect(`/league/${slug}`)
  }

  const years = [...new Set(yearRows.map((r) => r.year))].sort((a, b) => b - a)
  const mostRecentYear = years[0]

  redirect(`/league/${slug}/history/${mostRecentYear}`)
}
