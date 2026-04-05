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
  Row,
  Column,
} from '@react-email/components'

interface HighProbGame {
  away: string
  home: string
  date: string
  probability: number
}

interface LeagueSummary {
  leagueName: string
  potTotal: number
  weeklyBuyIn: number
}

interface WeeklyRecapProps {
  weekNumber: number
  upcomingGames: HighProbGame[]
  leagues: LeagueSummary[]
  /** Sanitized HTML from commissioner editor (images, GIFs, layout). */
  commissionerHtml?: string
  /** When false, hides auto-generated pot / league summary block. */
  showLeaguePot?: boolean
  /** When false, hides 13 header + Retrosheet / footer (commissioner supplies narrative only). */
  showBranding?: boolean
}

export default function WeeklyRecap({
  weekNumber,
  upcomingGames,
  leagues,
  commissionerHtml,
  showLeaguePot = true,
  showBranding = true,
}: WeeklyRecapProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#0a0a0a', fontFamily: 'monospace', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px', backgroundColor: '#0a0a0a' }}>

          {/* Header */}
          {showBranding && (
            <Section>
              <Heading style={{ color: '#39ff14', fontSize: '28px', margin: '0 0 4px' }}>
                13 Run League
              </Heading>
              <Text style={{ color: '#6b7280', margin: '0 0 32px', fontSize: '14px' }}>
                Week {weekNumber} Recap
              </Text>
            </Section>
          )}

          {/* Upcoming high-probability games */}
          {upcomingGames.length > 0 && (
            <Section>
              <Heading as="h2" style={{ color: '#ffffff', fontSize: '18px', marginBottom: '12px' }}>
                🎯 High-Probability Games This Week
              </Heading>
              {upcomingGames.map((game, i) => (
                <Row key={i} style={{ marginBottom: '8px' }}>
                  <Column>
                    <Text style={{ color: '#d1d5db', margin: '0', fontSize: '14px' }}>
                      <span style={{ color: '#39ff14', fontWeight: 'bold' }}>
                        {(game.probability * 100).toFixed(2)}%
                      </span>
                      {' — '}
                      {game.away} @ {game.home}
                      <span style={{ color: '#4b5563', fontSize: '12px' }}> · {game.date}</span>
                    </Text>
                  </Column>
                </Row>
              ))}
              <Hr style={{ borderColor: '#1f2937', margin: '24px 0' }} />
            </Section>
          )}

          {/* League pot totals */}
          {showLeaguePot && leagues.length > 0 && (
            <Section>
              <Heading as="h2" style={{ color: '#ffffff', fontSize: '18px', marginBottom: '12px' }}>
                💰 League Pot Totals
              </Heading>
              {leagues.map((league, i) => (
                <Row key={i} style={{ marginBottom: '8px' }}>
                  <Column>
                    <Text style={{ color: '#d1d5db', margin: '0', fontSize: '14px' }}>
                      {league.leagueName}
                      {' — '}
                      <span style={{ color: '#39ff14', fontWeight: 'bold' }}>
                        ${league.potTotal}
                      </span>
                      <span style={{ color: '#4b5563', fontSize: '12px' }}>
                        {' '}(${league.weeklyBuyIn}/week)
                      </span>
                    </Text>
                  </Column>
                </Row>
              ))}
              <Hr style={{ borderColor: '#1f2937', margin: '24px 0' }} />
            </Section>
          )}

          {/* Commissioner-editable narrative (after pot, before footer) */}
          {commissionerHtml ? (
            <Section style={{ marginBottom: '24px' }}>
              <div
                style={{ color: '#d1d5db', fontSize: '14px', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: commissionerHtml }}
              />
            </Section>
          ) : null}

          {/* Footer */}
          {showBranding && (
            <Section>
              <Text style={{ color: '#374151', fontSize: '11px', lineHeight: '1.6' }}>
                The information used here was obtained free of charge from and is copyrighted by{' '}
                <Link href="https://www.retrosheet.org" style={{ color: '#4b5563' }}>
                  Retrosheet
                </Link>
                . Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
              </Text>
              <Text style={{ color: '#374151', fontSize: '11px' }}>
                13runleague.com · You&apos;re receiving this because you&apos;re in a 13 Run League.{' '}
                <Link
                  href="mailto:recap@13runleague.com?subject=unsubscribe"
                  style={{ color: '#4b5563' }}
                >
                  Unsubscribe
                </Link>
              </Text>
              <Text style={{ fontSize: '12px', marginTop: '8px' }}>
                <Link href="https://buymeacoffee.com/colbyblack" style={{ color: '#eab308' }}>
                  ☕ Buy me a coffee
                </Link>
              </Text>
            </Section>
          )}

        </Container>
      </Body>
    </Html>
  )
}

WeeklyRecap.PreviewProps = {
  weekNumber: 12,
  upcomingGames: [
    { away: 'COL', home: 'CIN', date: 'Mon Apr 22', probability: 0.047 },
  ],
  leagues: [
    { leagueName: 'The Original League', potTotal: 480, weeklyBuyIn: 10 },
  ],
} satisfies WeeklyRecapProps
