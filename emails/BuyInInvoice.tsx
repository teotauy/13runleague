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
} from '@react-email/components'

export interface BuyInInvoiceProps {
  memberName: string
  leagueName: string
  seasonYear: number
  seasonBuyIn: number
  buyInOwed: number
  seasonWins: number
  amountDue: number
  paymentStatus: 'paid' | '50%' | 'unpaid'
  team?: string | null
  winWeeks?: { weekNumber: number; amount: number }[]
  leagueUrl?: string
  /** Optional commissioner addendum (plain text). */
  commissionerNote?: string | null
}

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`
}

export function buyInInvoiceSubject(seasonYear: number, amountDue: number) {
  return `13 Run League — ${seasonYear} buy-in balance (${money(amountDue)})`
}

export default function BuyInInvoice({
  memberName,
  leagueName,
  seasonYear,
  seasonBuyIn,
  buyInOwed,
  seasonWins,
  amountDue,
  paymentStatus,
  team,
  winWeeks = [],
  leagueUrl,
  commissionerNote,
}: BuyInInvoiceProps) {
  const firstName = memberName.split(' ')[0] || memberName
  const statusLabel =
    paymentStatus === '50%' ? 'Half season buy-in on file' : 'Season buy-in not marked paid'

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandMark}>13</Text>
            <Text style={brandSub}>Run League · {seasonYear} Season</Text>
          </Section>

          <Heading style={h1}>{firstName} — buy-in balance</Heading>
          <Text style={lead}>
            This is a balance reminder for <strong style={{ color: '#fff' }}>{leagueName}</strong>
            {team ? (
              <>
                {' '}
                ({team})
              </>
            ) : null}
            . Season entry is {money(seasonBuyIn)}. Wins this season are credited against what you
            still owe.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Amount due</Text>
            <Text style={amount}>{money(amountDue)}</Text>
            <Text style={meta}>{statusLabel}</Text>
          </Section>

          <Section style={breakdown}>
            <Text style={row}>Season buy-in: {money(seasonBuyIn)}</Text>
            {buyInOwed < seasonBuyIn && (
              <Text style={row}>Buy-in still tracked as owed: {money(buyInOwed)}</Text>
            )}
            <Text style={row}>Wins credited ({seasonYear}): −{money(seasonWins)}</Text>
            <Hr style={hr} />
            <Text style={rowTotal}>Balance: {money(amountDue)}</Text>
          </Section>

          {winWeeks.length > 0 && (
            <Section style={{ marginBottom: '24px' }}>
              <Text style={cardLabel}>Wins this season</Text>
              {winWeeks.map((w) => (
                <Text key={w.weekNumber} style={row}>
                  Week {w.weekNumber}: {money(w.amount)}
                </Text>
              ))}
            </Section>
          )}

          <Text style={bodyText}>
            Please settle {money(amountDue)} by Venmo or cash. Reply to this email once you&apos;ve
            paid so we can mark you paid in the ledger.
          </Text>

          {commissionerNote?.trim() ? (
            <Section style={noteBox}>
              <Text style={cardLabel}>From the commissioner</Text>
              <Text style={bodyText}>{commissionerNote.trim()}</Text>
            </Section>
          ) : null}

          {leagueUrl ? (
            <Text style={bodyText}>
              League dashboard:{' '}
              <Link href={leagueUrl} style={link}>
                {leagueUrl}
              </Link>
            </Text>
          ) : null}

          <Hr style={hr} />
          <Text style={footerNote}>As always, no wagering, please.</Text>
          <Text style={signoff}>— Colby &amp; Cliff</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: '#0f1115',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 24px',
}

const header = {
  marginBottom: '28px',
  borderBottom: '1px solid #2a2f38',
  paddingBottom: '20px',
}

const brandMark = {
  color: '#39ff14',
  fontSize: '42px',
  fontWeight: 900,
  margin: '0 0 4px',
  lineHeight: 1,
}

const brandSub = {
  color: '#555',
  fontSize: '11px',
  margin: 0,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
}

const h1 = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 900,
  margin: '0 0 12px',
}

const lead = {
  color: '#9ca3af',
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 24px',
}

const card = {
  backgroundColor: '#161a1f',
  border: '1px solid #2a2f38',
  borderLeft: '3px solid #39ff14',
  borderRadius: '8px',
  padding: '20px 24px',
  marginBottom: '20px',
}

const cardLabel = {
  color: '#39ff14',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}

const amount = {
  color: '#ffffff',
  fontSize: '36px',
  fontWeight: 900,
  margin: '0 0 6px',
  lineHeight: 1,
}

const meta = {
  color: '#6b7280',
  fontSize: '12px',
  margin: 0,
}

const breakdown = {
  backgroundColor: '#161a1f',
  border: '1px solid #2a2f38',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '24px',
}

const row = {
  color: '#9ca3af',
  fontSize: '14px',
  margin: '0 0 8px',
}

const rowTotal = {
  color: '#39ff14',
  fontSize: '15px',
  fontWeight: 700,
  margin: 0,
}

const bodyText = {
  color: '#d1d5db',
  fontSize: '14px',
  lineHeight: 1.7,
  margin: '0 0 16px',
}

const noteBox = {
  backgroundColor: '#161a1f',
  border: '1px solid #2a2f38',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '20px',
}

const link = {
  color: '#39ff14',
  textDecoration: 'none',
}

const hr = {
  borderColor: '#2a2f38',
  margin: '16px 0',
}

const footerNote = {
  color: '#9ca3af',
  fontSize: '13px',
  fontStyle: 'italic' as const,
  margin: '0 0 4px',
}

const signoff = {
  color: '#39ff14',
  fontSize: '14px',
  fontWeight: 700,
  margin: 0,
}
