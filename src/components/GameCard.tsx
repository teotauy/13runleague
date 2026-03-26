import { getProbabilityTier, getProbabilityColor, type LambdaBreakdown, type AlertTier } from '@/lib/probability'
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
  // 4.5 / 4.7 — alert tier + live conditional prob (passed from CollapsibleGameCard)
  alertTier?: AlertTier
  liveProb?: number | null
  liveProbTeam?: string | null
  // 4.5 — live game state (informational in expanded view)
  inning?: number
  isTopInning?: boolean
}

const COORS_VENUE_ID = '19'

// 4.7 alert tier banner config
const ALERT_CONFIG: Record<NonNullable<AlertTier>, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  active: {
    label: '🚨 Active Alert — P(13) above 80%',
    textColor: '#fca5a5',
    bgColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  radar: {
    label: '📡 On Radar — P(13) above 65%',
    textColor: '#fdba74',
    bgColor: 'rgba(249,115,22,0.08)',
    borderColor: 'rgba(249,115,22,0.25)',
  },
  watching: {
    label: '👀 Watching — P(13) above 40%',
    textColor: '#fde047',
    bgColor: 'rgba(234,179,8,0.08)',
    borderColor: 'rgba(234,179,8,0.20)',
  },
}

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
  alertTier,
  liveProb,
  liveProbTeam,
  inning,
  isTopInning,
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
  const hit13 = awayHit13 || homeHit13

  const alertConf = alertTier ? ALERT_CONFIG[alertTier] : null

  return (
    <div
      className={`rounded-lg border bg-[#111] p-4 flex flex-col gap-3 transition-all ${isFinal && !hit13 ? 'opacity-60' : ''}`}
      style={{
        borderColor: hit13 ? '#39ff14' : alertConf ? alertConf.borderColor : (tier === 'high' && !isFinal ? color : isFinal ? '#374151' : '#1f2937'),
        backgroundColor: hit13 ? '#071007' : '#111',
        boxShadow: hit13 ? '0 0 28px rgba(57,255,20,0.12)' : alertTier === 'active' ? '0 0 20px rgba(239,68,68,0.12)' : undefined,
      }}
    >
      {/* 13-run banner */}
      {hit13 && (
        <div className="flex items-center justify-between -mx-4 -mt-4 mb-1 px-4 py-2 rounded-t-lg bg-[#39ff14]/10 border-b border-[#39ff14]/20">
          <span className="text-[#39ff14] font-black text-xs tracking-widest uppercase">⚡ 13-Run Game</span>
          <span className="text-[#39ff14]/50 text-[10px] font-mono">
            {awayHit13 && homeHit13
              ? 'both teams scored 13'
              : `${awayHit13 ? awayTeam : homeTeam} scored 13`}
          </span>
        </div>
      )}

      {/* 4.7 — Alert tier banner (shown above matchup when not a 13) */}
      {alertConf && !hit13 && (
        <div
          className="flex items-center justify-between -mx-4 -mt-4 mb-1 px-4 py-2 rounded-t-lg border-b"
          style={{ backgroundColor: alertConf.bgColor, borderColor: alertConf.borderColor }}
        >
          <span className="text-xs font-bold tracking-wide" style={{ color: alertConf.textColor }}>
            {alertConf.label}
          </span>
          {liveProb !== null && liveProb !== undefined && (
            <span className="text-[10px] font-mono" style={{ color: alertConf.textColor, opacity: 0.7 }}>
              {liveProbTeam} live: {(liveProb * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}

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
                {inning !== undefined && (
                  <span className="text-green-600 text-[10px] font-mono ml-1">
                    {isTopInning ? '▲' : '▼'}{inning}
                  </span>
                )}
              </span>
            )}
            <span className={`font-bold font-mono ${awayHit13 ? 'text-[#39ff14]' : 'text-white'} ${awayHit13 ? 'text-2xl' : 'text-xl'}`}>
              {awayScore}
            </span>
            <span className="text-gray-600 font-mono">–</span>
            <span className={`font-bold font-mono ${homeHit13 ? 'text-[#39ff14]' : 'text-white'} ${homeHit13 ? 'text-2xl' : 'text-xl'}`}>
              {homeScore}
            </span>
            {isFinal && (
              <span className={`text-xs font-mono ml-1 ${hit13 ? 'text-[#39ff14]/60' : 'text-gray-600'}`}>FINAL</span>
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

      {/* 4.5 — Live conditional probability (expanded view) */}
      {liveProb !== null && liveProb !== undefined && !hit13 && (
        <div className="flex items-center gap-2 text-xs font-mono rounded px-2 py-1.5 border"
          style={{
            backgroundColor: liveProb > 0.65 ? 'rgba(239,68,68,0.08)' : liveProb > 0.40 ? 'rgba(249,115,22,0.08)' : 'rgba(234,179,8,0.08)',
            borderColor: liveProb > 0.65 ? 'rgba(239,68,68,0.25)' : liveProb > 0.40 ? 'rgba(249,115,22,0.25)' : 'rgba(234,179,8,0.20)',
          }}
        >
          <span className="text-gray-400">Live P(13) for {liveProbTeam}:</span>
          <span className="font-bold text-sm" style={{ color: liveProb > 0.65 ? '#ef4444' : liveProb > 0.40 ? '#f97316' : '#eab308' }}>
            {(liveProb * 100).toFixed(1)}%
          </span>
          <span className="text-gray-600 ml-auto">📚 Retrosheet lookup</span>
        </div>
      )}

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

      {/* Lambda breakdown — only for Preview games, not Live */}
      {gameStatus === 'Preview' && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-wider px-1">
            <Tooltip label="Base λ" explanation={['Expected runs based on season averages.', 'Both teams\' offensive & pitching numbers, blended with league baseline.']}>
              <div className="underline decoration-dotted cursor-help">Base</div>
            </Tooltip>
            <Tooltip label="⚾ Park" explanation={['Base λ adjusted for today\'s venue.', 'Hitter-friendly parks (like Coors) push the number up; pitcher-friendly parks push it down.']}>
              <div className="underline decoration-dotted cursor-help">⚾ Park</div>
            </Tooltip>
            <Tooltip label="🏠 Pitcher" explanation={['Final λ after accounting for today\'s starting pitcher.', 'An ace with a low ERA reduces expected runs; a weak starter increases them.', 'This is the number fed into P(13).']}>
              <div className="underline decoration-dotted cursor-help">🏠 Pitcher</div>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <LambdaCol label={awayTeam} lambda={awayLambda} />
            <LambdaCol label={homeTeam} lambda={homeLambda} />
          </div>
        </div>
      )}

      {/* For Final games: pre-game probability context */}
      {isFinal && (
        <div className="text-xs text-gray-600 font-mono">
          Pre-game{' '}
          <Tooltip label="Pre-game P(13)" explanation={['What the model predicted before first pitch.', 'Poisson model using season run averages, park factor & starting pitcher.']}>
            P(13)
          </Tooltip>
          : {pct}%
        </div>
      )}

      {/* Probability bar */}
      {!isFinal && (
        <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(combinedProbability * 1000, 100)}%`,
              backgroundColor: alertConf ? alertConf.borderColor : color,
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
        <div className="text-right text-gray-500">{lambda.parkAdjusted.toFixed(2)}</div>
        <div className="text-right text-white font-semibold">{lambda.pitcherAdjusted.toFixed(2)}</div>
      </div>
    </div>
  )
}
