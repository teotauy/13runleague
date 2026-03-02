/**
 * SMS alert system via Twilio for 13 Run League.
 */

import twilio from 'twilio'
import { getAlertTier, type AlertTier } from './probability'

// Lazy initialization so Twilio doesn't crash at build time without real env vars
function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )
}

function getFromNumber() {
  return process.env.TWILIO_PHONE_NUMBER!
}

export interface AlertPayload {
  teamName: string
  currentRuns: number
  inning: number
  inningLabel: string // e.g. "7th"
  probability: number // 0–1
  gamePk: number
}

function buildSmsBody(payload: AlertPayload): string {
  const probPct = (payload.probability * 100).toFixed(0)
  return [
    `🚨 13-Watch Alert`,
    `${payload.teamName} have ${payload.currentRuns} runs in the ${payload.inningLabel} inning.`,
    `P(final=13): ${probPct}%`,
    `Watch: https://www.mlb.com/gameday/${payload.gamePk}`,
  ].join('\n')
}

export async function sendSmsAlert(to: string, payload: AlertPayload): Promise<void> {
  const tier: AlertTier = getAlertTier(payload.probability)
  if (tier !== 'active') return // Only send SMS for 🚨 tier (>80%)

  const body = buildSmsBody(payload)

  await getClient().messages.create({ body, from: getFromNumber(), to })
}

export async function sendBulkSmsAlerts(
  phoneNumbers: string[],
  payload: AlertPayload
): Promise<void> {
  await Promise.allSettled(phoneNumbers.map((to) => sendSmsAlert(to, payload)))
}
