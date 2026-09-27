import { createServiceClient } from '@/lib/supabase/server'
import { verifyRsvpToken, buildVenmoPayUrl, resolveVenmoUsername } from '@/lib/rsvpToken'
import { seasonBuyInAmount } from '@/lib/seasonWrappedData'
import { getSeasonYear } from '@/lib/pot'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

const LABEL: Record<'yes' | 'no' | 'maybe', { title: string; body: string; color: string }> = {
  yes: {
    title: "You're in.",
    body: 'Marked returning on the Pre-Season board. Next: pay buy-in so your seat is locked.',
    color: 'text-[#39ff14]',
  },
  maybe: {
    title: 'Maybe — noted.',
    body: "We'll follow up closer to Draft Day (February 13). You can change your answer anytime from a fresh email link.",
    color: 'text-amber-400',
  },
  no: {
    title: "You're out.",
    body: "Thanks for playing. We'll open your seat for waitlist / new blood before next Draft Day.",
    color: 'text-red-400',
  },
}

export default async function RsvpPage({ params }: Props) {
  const { token: rawToken } = await params
  const token = decodeURIComponent(rawToken)
  const verified = verifyRsvpToken(token)
  if (!verified) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 font-mono">
        <div className="max-w-md text-center space-y-4">
          <div className="text-[#39ff14] text-2xl font-black">13 Run League</div>
          <p className="text-white text-lg font-bold">This RSVP link is invalid or expired.</p>
          <p className="text-gray-500 text-sm">Ask Colby for a fresh Season Wrapped email.</p>
          <Link href="/" className="text-[#39ff14] text-sm hover:underline inline-block">
            ← Home
          </Link>
        </div>
      </main>
    )
  }

  const supabase = createServiceClient()
  const { data: member } = await supabase
    .from('members')
    .select('id, name, league_id, pre_season_returning, pre_season_paid')
    .eq('id', verified.memberId)
    .eq('league_id', verified.leagueId)
    .single()

  if (!member) notFound()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, slug, weekly_buy_in, rules')
    .eq('id', verified.leagueId)
    .single()

  if (!league) notFound()

  const { error } = await supabase
    .from('members')
    .update({
      pre_season_returning: verified.response,
      ...(verified.response !== 'yes' ? { pre_season_paid: false } : {}),
    })
    .eq('id', member.id)

  const label = LABEL[verified.response]
  const firstName = member.name.split(' ')[0]
  const buyIn = seasonBuyInAmount(league.weekly_buy_in ?? 10)
  const nextYear = getSeasonYear(new Date()) + 1
  // If we're already in the next calendar season year window, still show "next" as season+1 from wrapped year.
  // RSVP is always for the upcoming draft season.
  const draftYear = nextYear
  const venmoUsername = resolveVenmoUsername(league.rules)
  const payUrl = venmoUsername
    ? buildVenmoPayUrl({
        username: venmoUsername,
        amount: buyIn,
        note: `13 Run League ${draftYear} buy-in`,
      })
    : null

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 font-mono">
      <div className="w-full max-w-md space-y-6">
        <div>
          <div className="text-[#39ff14] text-2xl font-black mb-1">13</div>
          <div className="text-gray-500 text-xs tracking-widest uppercase">
            Run League · {league.name}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-300 text-sm">
            Could not save RSVP: {error.message}
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className={`text-2xl font-black ${label.color}`}>
              {firstName}, {label.title}
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">{label.body}</p>
          </div>
        )}

        {verified.response === 'yes' && !error && (
          <div className="rounded-lg border border-[#1e3a5f] bg-[#0c1220] p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#39ff14] font-bold mb-2">
                Next year buy-in
              </div>
              <div className="text-white text-3xl font-black">${buyIn}</div>
              <p className="text-gray-500 text-xs mt-1">
                ${league.weekly_buy_in ?? 10} × 28 weeks · Draft Day Feb 13
              </p>
            </div>

            {member.pre_season_paid || false ? (
              <p className="text-[#39ff14] text-sm">Already marked paid in Pre-Season Status.</p>
            ) : payUrl ? (
              <a
                href={payUrl}
                className="block w-full text-center bg-[#008CFF] hover:bg-[#0070cc] text-white font-bold rounded-lg px-4 py-3 text-sm transition-colors"
              >
                Pay ${buyIn} on Venmo
              </a>
            ) : (
              <p className="text-gray-400 text-sm leading-relaxed">
                Venmo Colby <span className="text-white font-bold">${buyIn}</span> with note{' '}
                <span className="text-gray-300">
                  &quot;13 Run League {draftYear} buy-in&quot;
                </span>
                . He&apos;ll check you off on the Pre-Season board.
              </p>
            )}

            {venmoUsername && (
              <p className="text-gray-600 text-xs">@{venmoUsername}</p>
            )}
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <Link href={`/league/${league.slug}`} className="text-[#39ff14] hover:underline">
            League dashboard →
          </Link>
          <Link href="/" className="text-gray-500 hover:text-gray-300">
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
