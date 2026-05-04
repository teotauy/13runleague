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

export interface WeekWinnerResult {
  memberName: string
  team: string
  /** Net payout (after any buy-in deduction). */
  payoutAmount: number
  /** How many shares this member won (≥1 if their team scored 13 multiple times). */
  shares: number
}

export interface ThirteenRunGameResult {
  gameDate: string  // YYYY-MM-DD
  winningTeam: string
}

export interface WeekResults {
  thirteenRunGames: ThirteenRunGameResult[]
  winners: WeekWinnerResult[]
  /** Sum of all payouts distributed. 0 = rollover. */
  totalDistributed: number
  /** Pot amount rolling to next week (0 if there were winners). */
  rolloverAmount: number
  nextWeekNumber: number
}

interface WeeklyRecapProps {
  weekNumber: number
  upcomingGames: HighProbGame[]
  leagues: LeagueSummary[]
  /** Auto-populated results from the settled week — winner card or rollover card. */
  weekResults?: WeekResults
  /** Sanitized HTML from commissioner editor (images, GIFs, layout). */
  commissionerHtml?: string
  /** When false, hides auto-generated pot / league summary block. */
  showLeaguePot?: boolean
  /** When false, hides 13 header + Retrosheet / footer (commissioner supplies narrative only). */
  showBranding?: boolean
}

function fmtGameDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function WeeklyRecap({
  weekNumber,
  upcomingGames,
  leagues,
  weekResults,
  commissionerHtml,
  showLeaguePot = true,
  showBranding = true,
}: WeeklyRecapProps) {
  const hasWinners = (weekResults?.winners.length ?? 0) > 0
  const isRollover = weekResults && !hasWinners

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

          {/* ── Winner card ─────────────────────────────────────── */}
          {weekResults && hasWinners && (
            <Section style={{
              backgroundColor: '#0a1a0a',
              border: '1px solid #166534',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '28px',
            }}>
              <Text style={{
                color: '#39ff14',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                margin: '0 0 16px',
              }}>
                🏆 Week {weekNumber} — Winner{weekResults.winners.length > 1 ? 's' : ''}
              </Text>

              {weekResults.winners.map((w, i) => (
                <Row key={i} style={{ marginBottom: '10px' }}>
                  <Column>
                    <Text style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', margin: '0 0 2px' }}>
                      {w.memberName}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: '12px', margin: '0' }}>
                      {w.team}
                      {w.shares > 1 && (
                        <span style={{ color: '#4b5563' }}> · {w.shares} shares</span>
                      )}
                      {' · '}
                      <span style={{ color: '#39ff14', fontWeight: 'bold' }}>
                        ${w.payoutAmount.toLocaleString()}
                      </span>
                    </Text>
                  </Column>
                </Row>
              ))}

              {weekResults.thirteenRunGames.length > 0 && (
                <>
                  <Hr style={{ borderColor: '#166534', margin: '16px 0' }} />
                  <Text style={{ color: '#4b5563', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    13-Run Games
                  </Text>
                  {weekResults.thirteenRunGames.map((g, i) => (
                    <Text key={i} style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 4px', fontFamily: 'monospace' }}>
                      {fmtGameDate(g.gameDate)}
                      <span style={{ color: '#39ff14', fontWeight: 'bold' }}> {g.winningTeam}</span>
                      {' scored 13'}
                    </Text>
                  ))}
                </>
              )}
            </Section>
          )}

          {/* ── Rollover card ────────────────────────────────────── */}
          {isRollover && (
            <Section style={{
              backgroundColor: '#1a1000',
              border: '1px solid #92400e',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '28px',
            }}>
              <Text style={{
                color: '#f59e0b',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                margin: '0 0 10px',
              }}>
                🔄 Week {weekNumber} — No Winner
              </Text>
              <Text style={{ color: '#d1d5db', fontSize: '15px', margin: '0 0 8px' }}>
                No team scored exactly 13 runs this week.
              </Text>
              {weekResults.rolloverAmount > 0 && (
                <Text style={{ color: '#9ca3af', fontSize: '13px', margin: '0' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                    ${weekResults.rolloverAmount.toLocaleString()}
                  </span>
                  {' rolls over to Week '}
                  {weekResults.nextWeekNumber}.
                </Text>
              )}
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
                  href="https://13runleague.com/unsubscribe"
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
  weekNumber: 6,
  upcomingGames: [],
  leagues: [
    { leagueName: 'South Brooklyn League', potTotal: 310, weeklyBuyIn: 10 },
  ],
  weekResults: {
    thirteenRunGames: [
      { gameDate: '2026-04-28', winningTeam: 'MIL' },
      { gameDate: '2026-04-29', winningTeam: 'COL' },
      { gameDate: '2026-04-30', winningTeam: 'MIL' },
    ],
    winners: [
      { memberName: 'Loam', team: 'MIL', payoutAmount: 400, shares: 2 },
      { memberName: 'Kevin Newsum', team: 'COL', payoutAmount: 200, shares: 1 },
    ],
    totalDistributed: 600,
    rolloverAmount: 0,
    nextWeekNumber: 7,
  },
} satisfies WeeklyRecapProps
