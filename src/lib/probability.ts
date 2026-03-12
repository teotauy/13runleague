/**
 * Probability engine for 13 Run League.
 *
 * Historical lookup data:
 * The information used here was obtained free of charge from and is copyrighted
 * by Retrosheet. Interested parties may contact Retrosheet at 20 Sunset Rd.,
 * Newark, DE 19711.
 */

import rawLookup from '../data/thirteen_lookup.json'

interface LookupEntry {
  total: number
  ended_at_13: number
  probability: number
  probability_pct: string
}

const lookupTable = (rawLookup as { lookup: Record<string, LookupEntry> }).lookup

// ---------------------------------------------------------------------------
// Park factors (keyed by MLB venue ID — never hardcode team/city names)
// ---------------------------------------------------------------------------
export const parkFactors: Record<string, number> = {
  '19': 1.35,   // Coors Field — "The 13-Run Factory"
  '2602': 1.15, // Great American Ball Park
  '3': 0.85,    // Oracle Park
  '2680': 0.88, // Petco Park
}

// ---------------------------------------------------------------------------
// Core Poisson functions
// ---------------------------------------------------------------------------
export function calculateThirteenProbability(lambda: number): number {
  const k = 13
  const factorial13 = 6227020800
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial13
}

export function gameThirteenProbability(lambdaHome: number, lambdaAway: number): number {
  const pH = calculateThirteenProbability(lambdaHome)
  const pA = calculateThirteenProbability(lambdaAway)
  return 1 - (1 - pH) * (1 - pA)
}

// ---------------------------------------------------------------------------
// Lambda construction
// ---------------------------------------------------------------------------

export interface LambdaInput {
  baseRunsPerGame: number        // team's runs/game from current season
  gamesPlayed: number            // current season games played
  lastSeasonRunsPerGame?: number // for early-season blend
  venueId: string                // MLB venue ID of today's game
  starterEra?: number            // opposing starter ERA (optional)
}

export interface LambdaBreakdown {
  base: number
  parkAdjusted: number
  pitcherAdjusted: number
  isBlended: boolean
  parkFactor: number
  pitcherMultiplier: number
}

const FALLBACK_RUNS = 4.5
const EARLY_SEASON_THRESHOLD = 10

export function buildLambda(input: LambdaInput): LambdaBreakdown {
  const { baseRunsPerGame, gamesPlayed, lastSeasonRunsPerGame, venueId, starterEra } = input

  // 1. Base λ — blend early season
  let base: number
  let isBlended = false

  if (gamesPlayed < EARLY_SEASON_THRESHOLD) {
    if (lastSeasonRunsPerGame !== undefined && gamesPlayed > 0) {
      const weight = gamesPlayed / EARLY_SEASON_THRESHOLD
      base = (1 - weight) * 0.7 * lastSeasonRunsPerGame +
             weight * 0.3 * baseRunsPerGame +
             (1 - weight) * 0.7 * lastSeasonRunsPerGame
      // Simplified: 70% last season + 30% current, fading in
      base = lastSeasonRunsPerGame * 0.7 + baseRunsPerGame * 0.3
      isBlended = true
    } else if (gamesPlayed === 0) {
      base = lastSeasonRunsPerGame ?? FALLBACK_RUNS
      isBlended = lastSeasonRunsPerGame !== undefined
    } else {
      base = baseRunsPerGame > 0 ? baseRunsPerGame : FALLBACK_RUNS
    }
  } else {
    base = baseRunsPerGame > 0 ? baseRunsPerGame : FALLBACK_RUNS
  }

  // 2. Park factor — use venue ID, never name string
  const parkFactor = parkFactors[venueId] ?? 1.0
  const parkAdjusted = base * parkFactor

  // 3. Pitcher adjustment
  let pitcherMultiplier = 1.0
  if (starterEra !== undefined) {
    if (starterEra > 5.0) pitcherMultiplier = 1.15
    else if (starterEra < 3.0) pitcherMultiplier = 0.85
  }
  const pitcherAdjusted = parkAdjusted * pitcherMultiplier

  return { base, parkAdjusted, pitcherAdjusted, isBlended, parkFactor, pitcherMultiplier }
}

// ---------------------------------------------------------------------------
// Historical lookup (Retrosheet conditional probability)
// ---------------------------------------------------------------------------

export interface LiveGameState {
  side: 'vis' | 'home'
  inningCompleted: number
  currentScore: number
  isHomeTeamWinning: boolean
  inning: number
  isBottom: boolean
}

const MIN_SAMPLE_SIZE = 25

export function lookupConditionalProbability(state: LiveGameState): number | null {
  const { side, inningCompleted, currentScore, isHomeTeamWinning, inning, isBottom } = state

  // Critical home team rule: if home team is winning they won't bat in the 9th
  if (side === 'home' && isHomeTeamWinning && inning >= 9 && isBottom) {
    return 0
  }

  const key = `${side}|${inningCompleted}|${currentScore}`
  const entry = lookupTable[key]

  if (!entry || entry.total < MIN_SAMPLE_SIZE) return null

  return entry.probability
}

export function getConditionalProbability(
  state: LiveGameState,
  lambda: number
): { probability: number; source: 'lookup' | 'poisson' } {
  const fromLookup = lookupConditionalProbability(state)

  if (fromLookup !== null) {
    return { probability: fromLookup, source: 'lookup' }
  }

  // Fall back to Poisson using remaining expected runs
  const remainingInnings = Math.max(0, 9 - state.inningCompleted)
  const remainingLambda = lambda * (remainingInnings / 9)
  const runsNeeded = 13 - state.currentScore

  if (runsNeeded <= 0) return { probability: 0, source: 'poisson' }

  const prob = calculateThirteenProbability(remainingLambda)
  return { probability: prob, source: 'poisson' }
}

// ---------------------------------------------------------------------------
// Probability color coding
// ---------------------------------------------------------------------------
export type ProbabilityTier = 'high' | 'medium' | 'low'

export function getProbabilityTier(prob: number): ProbabilityTier {
  if (prob >= 0.05) return 'high'
  if (prob >= 0.02) return 'medium'
  return 'low'
}

export function getProbabilityColor(tier: ProbabilityTier): string {
  switch (tier) {
    case 'high': return '#39ff14'   // neon green
    case 'medium': return '#f59e0b' // amber
    case 'low': return '#9ca3af'    // gray
  }
}

// ---------------------------------------------------------------------------
// Alert thresholds
// ---------------------------------------------------------------------------
export type AlertTier = 'watching' | 'radar' | 'active' | null

export function getAlertTier(prob: number): AlertTier {
  if (prob > 0.80) return 'active'
  if (prob > 0.65) return 'radar'
  if (prob > 0.40) return 'watching'
  return null
}
