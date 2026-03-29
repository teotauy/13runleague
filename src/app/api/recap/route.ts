import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/components'
import WeeklyRecap from '../../../../emails/WeeklyRecap'
import { getWeekNumber } from '@/lib/pot'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

// Supabase admin client for server-side access
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()

  // Fetch all leagues with member emails
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, pot_total, weekly_buy_in')

  const weekNumber = getWeekNumber(new Date())

  // For each league, get member emails and send recap
  const results = await Promise.allSettled(
    (leagues ?? []).map(async (league) => {
      const { data: members } = await supabase
        .from('members')
        .select('name, phone, email, is_active')
        .eq('league_id', league.id)
        .neq('is_active', false)

      // Support comma-separated emails (e.g. joint memberships)
      const emails = (members ?? [])
        .flatMap((m) =>
          m.email
            ? m.email.split(',').map((e: string) => e.trim()).filter(Boolean)
            : []
        )
        .filter((e: string): e is string => !!e)

      if (emails.length === 0) return { league: league.name, sent: 0 }

      const emailHtml = await render(WeeklyRecap({
        weekNumber,
        upcomingGames: [],
        leagues: [
          {
            leagueName: league.name,
            potTotal: league.pot_total ?? 0,
            weeklyBuyIn: league.weekly_buy_in ?? 10,
          },
        ],
      }))

      const { error: sendError } = await getResend().emails.send({
        from: '13 Run League <recap@13runleague.com>',
        to: emails,
        subject: `13 Run League — Week ${weekNumber} Recap`,
        html: emailHtml,
      })

      if (sendError) {
        throw new Error(`Resend error: ${sendError.message}`)
      }

      return { league: league.name, sent: emails.length }
    })
  )

  const serialized = results.map((r) =>
    r.status === 'fulfilled'
      ? { status: 'fulfilled', value: r.value }
      : { status: 'rejected', reason: r.reason instanceof Error ? r.reason.message : String(r.reason) }
  )
  return NextResponse.json({ ok: true, results: serialized })
}
