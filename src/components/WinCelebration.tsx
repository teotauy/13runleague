'use client'
import { useEffect, useState } from 'react'
import { TEAM_COLORS } from '@/lib/teamColors'

export interface WinCelebrationPayout {
  id: string
  member_name: string
  week_number: number
  year: number
  winning_team: string
  payout_amount: number
  game_date: string | null
}

interface WinCelebrationProps {
  payouts: WinCelebrationPayout[]
}

function formatGameDate(dateStr: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const parts = dateStr.split('-')
  const month = months[parseInt(parts[1], 10) - 1]
  const day = parseInt(parts[2], 10)
  return `${month} ${day}`
}

const confettiItems = [
  { left: '5%',  color: '#39ff14', delay: '0s',   duration: '3.2s' },
  { left: '12%', color: '#ffffff', delay: '0.3s',  duration: '3.8s' },
  { left: '20%', color: '#fbbf24', delay: '0.1s',  duration: '3.5s' },
  { left: '28%', color: '#39ff14', delay: '0.5s',  duration: '3.1s' },
  { left: '36%', color: '#ffffff', delay: '0.2s',  duration: '4.0s' },
  { left: '44%', color: '#fbbf24', delay: '0.7s',  duration: '3.3s' },
  { left: '52%', color: '#39ff14', delay: '0.4s',  duration: '3.7s' },
  { left: '60%', color: '#ffffff', delay: '0.6s',  duration: '3.4s' },
  { left: '68%', color: '#fbbf24', delay: '0.1s',  duration: '3.9s' },
  { left: '76%', color: '#39ff14', delay: '0.8s',  duration: '3.2s' },
  { left: '84%', color: '#ffffff', delay: '0.3s',  duration: '3.6s' },
  { left: '92%', color: '#fbbf24', delay: '0.5s',  duration: '3.0s' },
]

export default function WinCelebration({ payouts }: WinCelebrationProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  const first = payouts[0]
  const isMulti = payouts.length > 1
  // Dismiss key is per-week so all winners in a week dismiss together
  const dismissKey = `win-celebrated-week-${first.year}-${first.week_number}`

  useEffect(() => {
    if (localStorage.getItem(dismissKey)) {
      setDismissed(true)
    } else {
      setDismissed(false)
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [dismissKey])

  function dismiss() {
    setVisible(false)
    setTimeout(() => {
      localStorage.setItem(dismissKey, '1')
      setDismissed(true)
    }, 400)
  }

  if (dismissed) return null

  // Single winner: use team color. Multiple winners: league dark theme.
  const teamColor = !isMulti ? TEAM_COLORS[first.winning_team] : null
  const bgColor   = teamColor?.primaryColor ?? '#111827'
  const textColor = teamColor?.textColor    ?? '#ffffff'
  const darkVariant = teamColor?.darkVariant ?? '#0a0a0a'

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110%) rotate(720deg); opacity: 0; }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        .win-banner-enter { animation: slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .win-banner-exit  { transition: transform 0.4s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.4s; transform: translateY(-100%); opacity: 0; }
      `}</style>

      <div
        className={`relative w-full overflow-hidden ${visible ? 'win-banner-enter' : 'win-banner-exit'}`}
        style={{ backgroundColor: bgColor }}
        role="banner"
        aria-label="Week winner celebration"
      >
        {/* Confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {confettiItems.map((c, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-3 rounded-sm opacity-80"
              style={{
                left: c.left, top: '-20px',
                backgroundColor: c.color,
                animationName: 'confettiFall',
                animationDuration: c.duration,
                animationDelay: c.delay,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationFillMode: 'both',
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: darkVariant, opacity: 0.5 }} aria-hidden="true" />

        {/* Content */}
        <div className="relative max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="flex-1 flex flex-col items-center text-center gap-2">

            {/* Week label */}
            <div className="text-xs tracking-widest uppercase font-semibold" style={{ color: textColor, opacity: 0.7 }}>
              Week {first.week_number} {isMulti ? 'Winners' : 'Winner'}
            </div>

            {isMulti ? (
              /* Multiple winners — list each one */
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                {payouts.map((p) => {
                  const tc = TEAM_COLORS[p.winning_team]
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-xl font-black text-white">{p.member_name}</span>
                      <span
                        className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold tracking-wide"
                        style={{
                          backgroundColor: tc?.primaryColor ?? '#1f2937',
                          color: tc?.textColor ?? '#fff',
                          border: `1px solid ${tc?.textColor ?? '#fff'}30`,
                        }}
                      >
                        {p.winning_team}
                      </span>
                      {p.game_date && (
                        <span className="text-sm text-gray-400">{formatGameDate(p.game_date)}</span>
                      )}
                      <span className="text-xl font-black text-[#39ff14]">${p.payout_amount}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Single winner — existing layout */
              <>
                <div className="text-3xl font-black leading-tight" style={{ color: textColor }}>
                  {first.member_name}
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center mt-0.5">
                  <span
                    className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-bold tracking-wide"
                    style={{ backgroundColor: darkVariant, color: textColor, border: `1px solid ${textColor}30` }}
                  >
                    {first.winning_team}
                  </span>
                  {first.game_date && (
                    <span className="text-sm font-medium" style={{ color: textColor, opacity: 0.75 }}>
                      {formatGameDate(first.game_date)}
                    </span>
                  )}
                  <span className="text-2xl font-black" style={{ color: '#39ff14' }}>
                    ${first.payout_amount}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 text-white opacity-60 hover:opacity-100 transition-opacity text-xl leading-none p-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}
