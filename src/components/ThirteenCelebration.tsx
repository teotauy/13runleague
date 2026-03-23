'use client'
import { useEffect, useState } from 'react'
import { TEAM_COLORS } from '@/lib/teamColors'

export interface ThirteenGame {
  game_date: string
  winning_team: string
  home_team: string
  away_team: string
  home_score: number
  away_score: number
}

interface Props {
  games: ThirteenGame[]
}

export default function ThirteenCelebration({ games }: Props) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [current, setCurrent] = useState<ThirteenGame | null>(null)

  useEffect(() => {
    // Find the first game that hasn't been dismissed yet
    const unseen = games.find((g) => {
      const key = `thirteen-celebrated-${g.game_date}-${g.winning_team}-${g.away_team}-${g.home_team}`
      return !localStorage.getItem(key)
    })
    if (unseen) {
      setCurrent(unseen)
      setDismissed(false)
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [games])

  function dismiss() {
    setVisible(false)
    setTimeout(() => {
      if (current) {
        const key = `thirteen-celebrated-${current.game_date}-${current.winning_team}-${current.away_team}-${current.home_team}`
        localStorage.setItem(key, '1')
      }
      setDismissed(true)
    }, 400)
  }

  if (dismissed || !current) return null

  const teamColor = TEAM_COLORS[current.winning_team]
  const bgColor = teamColor?.primaryColor ?? '#1a1a1a'
  const textColor = teamColor?.textColor ?? '#ffffff'
  const darkVariant = teamColor?.darkVariant ?? '#0a0a0a'
  const teamName = teamColor?.name ?? current.winning_team

  const opponent = current.winning_team === current.home_team
    ? current.away_team
    : current.home_team

  const confettiItems = [
    { left: '4%',  color: '#39ff14', delay: '0s',    duration: '3.2s' },
    { left: '11%', color: '#ffffff', delay: '0.3s',  duration: '3.8s' },
    { left: '19%', color: '#fbbf24', delay: '0.1s',  duration: '3.5s' },
    { left: '27%', color: '#39ff14', delay: '0.5s',  duration: '3.1s' },
    { left: '35%', color: '#ffffff', delay: '0.2s',  duration: '4.0s' },
    { left: '43%', color: '#fbbf24', delay: '0.7s',  duration: '3.3s' },
    { left: '51%', color: '#39ff14', delay: '0.4s',  duration: '3.7s' },
    { left: '59%', color: '#ffffff', delay: '0.6s',  duration: '3.4s' },
    { left: '67%', color: '#fbbf24', delay: '0.1s',  duration: '3.9s' },
    { left: '75%', color: '#39ff14', delay: '0.8s',  duration: '3.2s' },
    { left: '83%', color: '#ffffff', delay: '0.3s',  duration: '3.6s' },
    { left: '91%', color: '#fbbf24', delay: '0.5s',  duration: '3.0s' },
  ]

  return (
    <>
      <style>{`
        @keyframes thirteenConfettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110%) rotate(720deg); opacity: 0; }
        }
        @keyframes thirteenSlideDown {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        .thirteen-banner-enter {
          animation: thirteenSlideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .thirteen-banner-exit {
          transition: transform 0.4s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.4s;
          transform: translateY(-100%);
          opacity: 0;
        }
      `}</style>

      <div
        className={`relative w-full overflow-hidden ${visible ? 'thirteen-banner-enter' : 'thirteen-banner-exit'}`}
        style={{ backgroundColor: bgColor }}
        role="banner"
        aria-label="13-run game celebration"
      >
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {confettiItems.map((c, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-3 rounded-sm opacity-80"
              style={{
                left: c.left,
                top: '-20px',
                backgroundColor: c.color,
                animationName: 'thirteenConfettiFall',
                animationDuration: c.duration,
                animationDelay: c.delay,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationFillMode: 'both',
              }}
            />
          ))}
        </div>

        {/* Bottom edge depth */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
          style={{ backgroundColor: darkVariant, opacity: 0.5 }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex-1 flex flex-col items-center text-center gap-1">
            {/* Label */}
            <div
              className="text-xs tracking-widest uppercase font-semibold"
              style={{ color: textColor, opacity: 0.7 }}
            >
              13 runs scored today
            </div>

            {/* Big number */}
            <div className="flex items-center gap-3">
              <span className="text-5xl font-black" style={{ color: '#39ff14' }}>13</span>
              <div className="flex flex-col items-start">
                <span className="text-2xl font-black leading-tight" style={{ color: textColor }}>
                  {teamName}
                </span>
                <span className="text-sm font-medium" style={{ color: textColor, opacity: 0.65 }}>
                  vs {opponent}
                </span>
              </div>
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-xl leading-none p-1"
            style={{ color: textColor }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}
