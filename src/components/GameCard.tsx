import { getProbabilityTier, getProbabilityColor, type LambdaBreakdown } from '@/lib/probability'
import { parkFactors } from '@/lib/probability'

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
}: GameCardProps) {
  const tier = getProbabilityTier(combinedProbability)
  const color = getProbabilityColor(tier)
  const pct = (combinedProbability * 100).toFixed(2)
  const parkFactor = parkFactors[venueId]

  return (
    <div
      className="rounded-lg border bg-[#111] p-4 flex flex-col gap-3 transition-all"
      style={{ borderColor: tier === 'high' ? color : '#1f2937' }}
    >
      {/* Header: matchup */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-white font-mono">
          {awayTeam} <span className="text-gray-500">@</span> {homeTeam}
        </div>
        <div
          className="text-xl font-bold font-mono"
          style={{ color }}
        >
          {pct}%
        </div>
      </div>

      {/* Venue + park factor */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
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

      {/* Lambda breakdown */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <LambdaCol label={awayTeam} lambda={awayLambda} />
        <LambdaCol label={homeTeam} lambda={homeLambda} />
      </div>

      {/* Probability bar */}
      <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(combinedProbability * 1000, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>

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
      <div className="flex items-center gap-1 text-gray-400">
        <span className="text-gray-600">base</span> {lambda.base.toFixed(2)}
      </div>
      <div className="flex items-center gap-1 text-gray-400">
        <span className="text-gray-600">park</span> {lambda.parkAdjusted.toFixed(2)}
      </div>
      <div className="flex items-center gap-1 text-white font-semibold">
        <span className="text-gray-600">adj</span> {lambda.pitcherAdjusted.toFixed(2)}
      </div>
    </div>
  )
}
