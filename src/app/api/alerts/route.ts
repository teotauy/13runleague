import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBulkSmsAlerts } from '@/lib/alerts'
import { getAlertTier } from '@/lib/probability'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface AlertRequest {
  teamAbbr: string
  currentRuns: number
  inning: number
  inningLabel: string
  probability: number
  gamePk: number
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: AlertRequest = await request.json()
  const { teamAbbr, currentRuns, inning, inningLabel, probability, gamePk } = body

  const tier = getAlertTier(probability)
  if (tier !== 'active') {
    return NextResponse.json({ ok: true, tier, sent: false })
  }

  const supabase = adminClient()

  // Find all members with this team assigned who have a phone number
  const { data: members } = await supabase
    .from('members')
    .select('phone, name')
    .eq('assigned_team', teamAbbr)
    .not('phone', 'is', null)

  const phones = (members ?? [])
    .map((m) => m.phone as string)
    .filter(Boolean)

  if (phones.length === 0) {
    return NextResponse.json({ ok: true, tier, sent: false, reason: 'no phones' })
  }

  await sendBulkSmsAlerts(phones, {
    teamName: teamAbbr,
    currentRuns,
    inning,
    inningLabel,
    probability,
    gamePk,
  })

  return NextResponse.json({ ok: true, tier, sent: true, recipients: phones.length })
}
