import { createHmac, timingSafeEqual } from 'crypto'

function secretKey(): string {
  const s =
    process.env.RECAP_ACTION_SECRET ?? process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) {
    throw new Error(
      'Missing RECAP_ACTION_SECRET, CRON_SECRET, or SUPABASE_SERVICE_ROLE_KEY for weekly recap actions'
    )
  }
  return s
}

/** Issued on the admin page (server component) after league cookie auth; validated in server actions. */
export function signRecapCapability(leagueId: string, slug: string, ttlSeconds = 8 * 60 * 60): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = JSON.stringify({ leagueId, slug, exp })
  const sig = createHmac('sha256', secretKey()).update(payload).digest()
  return `${Buffer.from(payload).toString('base64url')}.${Buffer.from(sig).toString('base64url')}`
}

export function verifyRecapCapability(
  token: string
): { leagueId: string; slug: string } | null {
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
  let data: { leagueId?: string; slug?: string; exp?: number }
  try {
    data = JSON.parse(payload) as { leagueId?: string; slug?: string; exp?: number }
  } catch {
    return null
  }
  if (
    typeof data.leagueId !== 'string' ||
    typeof data.slug !== 'string' ||
    typeof data.exp !== 'number'
  ) {
    return null
  }
  if (Date.now() / 1000 > data.exp) return null
  return { leagueId: data.leagueId, slug: data.slug }
}
