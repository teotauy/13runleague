import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
  Button,
} from '@react-email/components'
import type { SeasonWrappedPayload } from '../src/lib/seasonWrappedData'

export type SeasonWrappedProps = SeasonWrappedPayload

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <Section
      style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '10px',
        padding: '16px 18px',
        marginBottom: '12px',
      }}
    >
      <Text
        style={{
          color: '#39ff14',
          fontSize: '11px',
          fontWeight: 'bold',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          margin: '0 0 8px',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: '#ffffff',
          fontSize: '28px',
          fontWeight: 'bold',
          lineHeight: '1.2',
          margin: '0',
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '6px 0 0' }}>{sub}</Text>
      ) : null}
    </Section>
  )
}

export default function SeasonWrapped({
  league,
  member,
  links,
  commissionerNote,
}: SeasonWrappedProps) {
  const firstName = member.memberName.split(' ')[0] ?? member.memberName
  const nextYear = league.seasonYear + 1
  const winWeeks =
    member.wins.length > 0
      ? member.wins.map((w) => `W${w.weekNumber}`).join(', ')
      : null

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0a0a0a', fontFamily: 'monospace', margin: 0, padding: 0 }}>
        <Container
          style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px', backgroundColor: '#0a0a0a' }}
        >
          <Section>
            <Heading style={{ color: '#39ff14', fontSize: '32px', margin: '0 0 4px' }}>
              13 Run League
            </Heading>
            <Text
              style={{
                color: '#6b7280',
                margin: '0 0 8px',
                fontSize: '12px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {league.seasonYear} Season Wrapped
            </Text>
            <Heading
              as="h2"
              style={{ color: '#ffffff', fontSize: '22px', margin: '0 0 24px', lineHeight: '1.3' }}
            >
              {firstName}, here&apos;s your year.
            </Heading>
          </Section>

          {/* League highlights */}
          <Section
            style={{
              backgroundColor: '#061a06',
              border: '1px solid #39ff14',
              borderRadius: '10px',
              padding: '18px',
              marginBottom: '24px',
            }}
          >
            <Text
              style={{
                color: '#39ff14',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                margin: '0 0 10px',
              }}
            >
              League story · {league.leagueName}
            </Text>
            <Text style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 6px', lineHeight: '1.6' }}>
              <span style={{ color: '#39ff14', fontWeight: 'bold' }}>{league.totalThirteenGames}</span>
              {' '}MLB games hit exactly 13 ·{' '}
              <span style={{ color: '#39ff14', fontWeight: 'bold' }}>
                ${league.totalDistributed.toLocaleString()}
              </span>
              {' '}paid out across{' '}
              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{league.weeksWithWinners}</span>
              {' '}winning week{league.weeksWithWinners === 1 ? '' : 's'}
              {league.weeksRollover > 0
                ? ` · ${league.weeksRollover} rollover week${league.weeksRollover === 1 ? '' : 's'}`
                : ''}
            </Text>
            {league.biggestPotWeek ? (
              <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '8px 0 0' }}>
                Biggest pot: Week {league.biggestPotWeek.weekNumber} · $
                {league.biggestPotWeek.potAmount.toLocaleString()}
              </Text>
            ) : null}
            {league.topEarner ? (
              <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '4px 0 0' }}>
                Top earner: {league.topEarner.name} · ${league.topEarner.amount.toLocaleString()}
              </Text>
            ) : null}
          </Section>

          {/* Personal team arc */}
          <Section style={{ marginBottom: '8px' }}>
            <Text
              style={{
                color: '#6b7280',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                margin: '0 0 12px',
              }}
            >
              Your team · {member.teamAbbr} {member.teamName}
            </Text>
          </Section>

          <StatCard
            label="Season rank"
            value={`#${member.rank}`}
            sub={`of ${member.memberCount} owners · $${member.totalWon.toLocaleString()} earned`}
          />
          <StatCard
            label="Times you hit 13"
            value={String(member.shares)}
            sub={
              winWeeks
                ? `Weeks: ${winWeeks}`
                : 'No 13s this year — droughts make the comeback stories.'
            }
          />
          {member.isTopEarner ? (
            <StatCard label="Season title" value="Top earner" sub="You led the league in $ won." />
          ) : null}
          {member.isMostWins && !member.isTopEarner ? (
            <StatCard
              label="Season title"
              value="Most 13s"
              sub="You led the league in shares."
            />
          ) : null}
          {member.nearMissLabel ? (
            <StatCard label="Heartbreak" value={String(member.nearMissCount)} sub={member.nearMissLabel} />
          ) : null}

          {commissionerNote ? (
            <Section style={{ marginBottom: '24px', marginTop: '8px' }}>
              <Text
                style={{
                  color: '#6b7280',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  margin: '0 0 10px',
                }}
              >
                From Colby
              </Text>
              <Text style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>
                {commissionerNote}
              </Text>
            </Section>
          ) : null}

          <Hr style={{ borderColor: '#1f2937', margin: '28px 0' }} />

          {/* Come back + pay */}
          <Section
            style={{
              backgroundColor: '#0c1220',
              border: '1px solid #1e3a5f',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <Heading as="h2" style={{ color: '#ffffff', fontSize: '18px', margin: '0 0 8px' }}>
              {nextYear}?
            </Heading>
            <Text style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 16px', lineHeight: '1.6' }}>
              One tap locks your RSVP in the admin board. Season buy-in is{' '}
              <span style={{ color: '#39ff14', fontWeight: 'bold' }}>
                ${league.nextSeasonBuyIn}
              </span>
              {' '}(${league.weeklyBuyIn} × {28} weeks).
            </Text>

            <Button
              href={links.rsvpYesUrl}
              style={{
                backgroundColor: '#39ff14',
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '12px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-block',
                marginBottom: '10px',
                marginRight: '8px',
              }}
            >
              I&apos;m in for {nextYear}
            </Button>
            <Button
              href={links.rsvpMaybeUrl}
              style={{
                backgroundColor: '#1f2937',
                color: '#fbbf24',
                fontWeight: 'bold',
                fontSize: '13px',
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-block',
                marginBottom: '10px',
                marginRight: '8px',
              }}
            >
              Maybe
            </Button>
            <Button
              href={links.rsvpNoUrl}
              style={{
                backgroundColor: '#1f2937',
                color: '#f87171',
                fontWeight: 'bold',
                fontSize: '13px',
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-block',
                marginBottom: '10px',
              }}
            >
              I&apos;m out
            </Button>

            {links.payUrl ? (
              <Section style={{ marginTop: '16px' }}>
                <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 10px' }}>
                  Ready to pay next year&apos;s ${league.nextSeasonBuyIn}? Venmo Colby:
                </Text>
                <Button
                  href={links.payUrl}
                  style={{
                    backgroundColor: '#008CFF',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Pay ${league.nextSeasonBuyIn} on Venmo
                </Button>
                {links.venmoUsername ? (
                  <Text style={{ color: '#6b7280', fontSize: '12px', margin: '10px 0 0' }}>
                    @{links.venmoUsername} · note: 13 Run League {nextYear} buy-in
                  </Text>
                ) : null}
              </Section>
            ) : (
              <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '16px 0 0', lineHeight: '1.5' }}>
                After you RSVP, Venmo Colby ${league.nextSeasonBuyIn} with note &quot;13 Run League{' '}
                {nextYear} buy-in&quot;. He&apos;ll mark you paid in Pre-Season Status.
              </Text>
            )}
          </Section>

          <Section>
            <Text style={{ color: '#374151', fontSize: '11px', lineHeight: '1.6' }}>
              Stats are from your league ledger for {league.seasonYear}. Team assignment is your roster
              team on file — not a player claim.{' '}
              <Link href={links.leagueUrl} style={{ color: '#4b5563' }}>
                League dashboard
              </Link>
              {' · '}
              <Link href="https://13runleague.com/unsubscribe" style={{ color: '#4b5563' }}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={{ color: '#374151', fontSize: '11px', marginTop: '8px' }}>
              As always, no wagering, please. — Colby &amp; Cliff
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

SeasonWrapped.PreviewProps = {
  league: {
    seasonYear: 2026,
    leagueName: 'South Brooklyn League',
    leagueSlug: 'south-brooklyn',
    totalThirteenGames: 42,
    totalDistributed: 8400,
    weeksWithWinners: 18,
    weeksRollover: 8,
    biggestPotWeek: { weekNumber: 12, potAmount: 620 },
    topEarner: { name: 'Loam', amount: 1200 },
    mostWins: { name: 'Loam', shares: 4 },
    memberCount: 30,
    nextSeasonBuyIn: 280,
    weeklyBuyIn: 10,
  },
  member: {
    memberId: 'preview',
    memberName: 'Alex Owner',
    email: 'alex@example.com',
    teamAbbr: 'MIL',
    teamName: 'Milwaukee Brewers',
    totalWon: 400,
    shares: 2,
    wins: [
      { weekNumber: 6, amount: 200, team: 'MIL', gameDate: '2026-05-03' },
      { weekNumber: 19, amount: 200, team: 'MIL', gameDate: '2026-08-02' },
    ],
    rank: 7,
    memberCount: 30,
    nearMissCount: 3,
    nearMissLabel: 'MIL scored exactly 12 runs 3 times this season',
    isTopEarner: false,
    isMostWins: false,
  },
  links: {
    rsvpYesUrl: 'https://13runleague.com/rsvp/preview-yes',
    rsvpMaybeUrl: 'https://13runleague.com/rsvp/preview-maybe',
    rsvpNoUrl: 'https://13runleague.com/rsvp/preview-no',
    payUrl: 'https://venmo.com/?txn=pay&recipients=example&amount=280',
    venmoUsername: 'example',
    leagueUrl: 'https://13runleague.com/league/south-brooklyn',
  },
  commissionerNote:
    'What a season. Draft Day is February 13. Hit I’m in + Venmo $280 when you’re ready.',
} satisfies SeasonWrappedProps
