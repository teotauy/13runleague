import { getProbabilityTier, getProbabilityColor, type LambdaBreakdown } from '@/lib/probability'
import { parkFactors } from '@/lib/probability'
import Tooltip from './Tooltip'

interface GameCardProps {
  gamePk: number
  awayTeam: string
  homeTeam: string
  venueName: string
  venueId: string
  awayPitcher?: string
  homePitcher?: string
  awayLambda: LambdaBreakdown
  homeLambda: LambdaBreakdown
  combinedProbability: number
  isBlended: boolean
  // Score / status props (optional — not available for Preview games)
  gameStatus?: string  // 'Preview' | 'Live' | 'Final'
  awayScore?: number
  homeScore?: number
}

const COORS_VENUE_ID = '19'

export default function GameCard({
  gamePk,
  awayTeam,
  homeTeam,
  venueName,
  venueId,
  awayPitcher,
  homePitcher,
  awayLambda,
  homeLambda,
  combinedProbability,
  isBlended,
  gameStatus,
  awayScore,
  homeScore,
}: GameCardProps) {
  const tier = getProbabilityTier(combinedProbability)
  const color = getProbabilityColor(tier)
  const pct = (combinedProbability * 100).toFixed(2)
  const parkFactor = parkFactors[venueId]

  const isFinal = gameStatus === 'Final'
  const isLive = gameStatus === 'Live'
  const hasScore = (isLive || isFinal) && awayScore !== undefined && homeScore !== undefined

  // Highlight if either team scored exactly 13
  const awayHit13 = hasScore && awayScore === 13
  const homeHit13 = hasScore && homeScore === 13

  return (
    <div
      className={`rounded-lg border bg-[#111] p-4 flex flex-col gap-3 transition-all ${isFinal ? 'opacity-60' : ''}`}
      style={{ borderColor: tier === 'high' && !isFinal ? color : isFinal ? '#374151' : '#1f2937' }}
    >
      {/* Header: matchup + score/probability */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-lg font-bold text-white font-mono">
          {awayTeam} <span className="text-gray-500">@</span> {homeTeam}
        </div>

        {hasScore ? (
          /* Score badge for Live/Final games */
          <div className="flex items-center gap-1.5 shrink-0">
            {isLive && (
              <span className="flex items-center gap-1 bg-green-950 border border-green-800 rounded px-1.5 py-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-green-400 text-xs font-bold tracking-wide">LIVE</span>
              </span>
            )}
            <span
              className={`text-xl font-bold font-mono ${
                awayHit13 ? 'text-[#39ff14]' : 'text-white'
              }`}
            >
              {awayScore}
            </span>
            <span className="text-gray-600 font-mono">–</span>
            <span
              className={`text-xl font-bold font-mono ${
                homeHit13 ? 'text-[#39ff14]' : 'text-white'
              }`}
            >
              {homeScore}
            </span>
            {isFinal && (
              <span className="text-xs text-gray-600 font-mono ml-1">FINAL</span>
            )}
          </div>
        ) : (
          /* Probability estimate for Preview games */
          <div className="text-xl font-bold font-mono shrink-0" style={{ color }}>
            <Tooltip
              label="P(13) — What does this mean?"
              explanation={[
                'Odds that exactly 13 runs are scored today (combined, either team).',
                'Uses a Poisson model — think of it as the "how often does this happen?" math.',
                '↓ Three inputs:',
                '① Base: team\'s season run average',
                '② Park: venue run environment',
                '③ Pitcher: starter ERA adjustment',
              ]}
            >
              {pct}%
            </Tooltip>
          </div>
        )}
      </div>

      {/* Venue + park factor */}
      <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
        <span>{venueName}</span>
        {parkFactor && (
          <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-amber-950 text-amber-400">
            {venueId === COORS_VENUE_ID ? '🏔️' : '⚾'} {parkFactor >= 1 ? '+' : ''}{Math.round((parkFactor - 1) * 100)}%
          </span>
        )}
        {isBlended && (
          <span className="px-1.5 py-0.5 rounded text-xs bg-blue-950 text-blue-400">
            📊 Early Season — Blended Model
          </span>
        )}
      </div>

      {/* Pitchers */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>
          <span className="text-gray-600">SP: </span>
          <span className="text-gray-300">{awayPitcher ?? 'TBD'}</span>
        </div>
        <div>
          <span className="text-gray-600">SP: </span>
          <span className="text-gray-300">{homePitcher ?? 'TBD'}</span>
        </div>
      </div>

      {/* Lambda breakdown — still shown for context, but de-emphasized for Final games */}
      {!isFinal && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-wider px-1">
            <Tooltip
              label="Base λ"
              explanation={[
                'Expected runs based on season averages.',
                'Both teams\' offensive & pitching numbers, blended with league baseline.',
              ]}
            >
              <div className="underline decoration-dotted cursor-help">Base</div>
            </Tooltip>
            <Tooltip
              label="⚾ Park"
              explanation={[
                'Base λ adjusted for today\'s venue.',
                'Hitter-friendly parks (like Coors) push the number up; pitcher-friendly parks push it down.',
              ]}
            >
              <div className="underline decoration-dotted cursor-help">⚾ Park</div>
            </Tooltip>
            <Tooltip
              label="🏠 Pitcher"
              explanation={[
                'Final λ after accounting for today\'s starting pitcher.',
                'An ace with a low ERA reduces expected runs; a weak starter increases them.',
                'This is the number fed into P(13).',
              ]}
            >
              <div className="underline decoration-dotted cursor-help">🏠 Pitcher</div>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <LambdaCol label={awayTeam} lambda={awayLambda} />
            <LambdaCol label={homeTeam} lambda={homeLambda} />
          </div>
        </div>
      )}

      {/* For Final games: show the estimated probability in small text for context */}
      {isFinal && (
        <div className="text-xs text-gray-600 font-mono">
          Pre-game{' '}
          <Tooltip
            label="Pre-game P(13)"
            explanation={[
              'What the model predicted before first pitch.',
              'Poisson model using season run averages, park factor & starting pitcher.',
            ]}
          >
            P(13)
          </Tooltip>
          : {pct}%
          {(awayHit13 || homeHit13) && (
            <span className="text-[#39ff14] ml-2 font-bold">✓ HIT 13!</span>
          )}
        </div>
      )}

      {/* Probability bar — hide for Final games */}
      {!isFinal && (
        <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(combinedProbability * 1000, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}

      <a
        href={`https://www.mlb.com/gameday/${gamePk}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors text-right"
      >
        Gameday →
      </a>
    </div>
  )
}

function LambdaCol({ label, lambda }: { label: string; lambda: LambdaBreakdown }) {
  return (
    <div className="space-y-1">
      <div className="text-gray-500 uppercase tracking-wider text-[10px]">{label}</div>
      <div className="grid grid-cols-3 gap-2 text-gray-400">
        <div className="text-right">{lambda.base.toFixed(2)}</div>
        <div className="text-right text-gray-500">
          {lambda.parkAdjusted.toFixed(2)}
        </div>
        <div className="text-right text-white font-semibold">
          {lambda.pitcherAdjusted.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
