import { createHmac, timingSafeEqual } from 'crypto'

export type RsvpResponse = 'yes' | 'no' | 'maybe'

function secretKey(): string {
  const s =
    process.env.RSVP_ACTION_SECRET ??
    process.env.RECAP_ACTION_SECRET ??
    process.env.CRON_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) {
    throw new Error(
      'Missing RSVP_ACTION_SECRET, RECAP_ACTION_SECRET, CRON_SECRET, or SUPABASE_SERVICE_ROLE_KEY for RSVP tokens'
    )
  }
  return s
}

/** Signed one-click RSVP link payload (member can respond without logging in). */
export function signRsvpToken(
  leagueId: string,
  memberId: string,
  response: RsvpResponse,
  ttlSeconds = 90 * 24 * 60 * 60
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = JSON.stringify({ leagueId, memberId, response, exp })
  const sig = createHmac('sha256', secretKey()).update(payload).digest()
  return `${Buffer.from(payload).toString('base64url')}.${Buffer.from(sig).toString('base64url')}`
}

export function verifyRsvpToken(
  token: string
): { leagueId: string; memberId: string; response: RsvpResponse } | null {
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const payloadB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)
  let payload: string
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  } catch {
    return null
  }
  let actualSig: Buffer
  try {
    actualSig = Buffer.from(sigB64, 'base64url')
  } catch {
    return null
  }
  const expectedSig = createHmac('sha256', secretKey()).update(payload).digest()
  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return null
  }
  let data: { leagueId?: string; memberId?: string; response?: string; exp?: number }
  try {
    data = JSON.parse(payload) as {
      leagueId?: string
      memberId?: string
      response?: string
      exp?: number
    }
  } catch {
    return null
  }
  if (
    typeof data.leagueId !== 'string' ||
    typeof data.memberId !== 'string' ||
    typeof data.exp !== 'number' ||
    (data.response !== 'yes' && data.response !== 'no' && data.response !== 'maybe')
  ) {
    return null
  }
  if (Date.now() / 1000 > data.exp) return null
  return {
    leagueId: data.leagueId,
    memberId: data.memberId,
    response: data.response,
  }
}

/** Venmo pay deep link for next-season buy-in. Returns null if username not configured. */
export function buildVenmoPayUrl(opts: {
  username: string
  amount: number
  note: string
}): string {
  const params = new URLSearchParams({
    txn: 'pay',
    audience: 'private',
    recipients: opts.username.replace(/^@/, ''),
    amount: String(opts.amount),
    note: opts.note,
  })
  return `https://venmo.com/?${params.toString()}`
}

export function resolveVenmoUsername(leagueRules: unknown): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_VENMO_USERNAME?.trim() || process.env.VENMO_USERNAME?.trim()
  if (fromEnv) return fromEnv.replace(/^@/, '')
  const rules = (leagueRules ?? {}) as { venmoUsername?: string }
  const fromRules = rules.venmoUsername?.trim()
  return fromRules ? fromRules.replace(/^@/, '') : null
}
