'use client'

import { useEffect, useState } from 'react'

export type SeasonState = 'offseason' | 'spring' | 'opening-day' | 'season' | null

interface Props {
  type: SeasonState
  daysToOpening: number
  openingDate: string // e.g. "March 25, 2026"
  weekNumber?: number
}

// Key includes the type so dismissing offseason doesn't suppress spring
function storageKey(type: SeasonState) {
  return `season-banner-dismissed:${type}`
}

export default function SeasonBanner({ type, daysToOpening, openingDate, weekNumber }: Props) {
  // Start true (hidden) to prevent flash-of-banner on load
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!type) return
    const stored = localStorage.getItem(storageKey(type))
    if (!stored) setDismissed(false)
  }, [type])

  if (!type || dismissed) return null

  const styles: Record<NonNullable<SeasonState>, { bg: string; text: string; muted: string; btn: string }> = {
    'offseason':    { bg: 'bg-[#1a1206] border-b border-amber-900/60',  text: 'text-amber-200', muted: 'text-amber-400', btn: 'text-amber-500 hover:text-amber-200' },
    'spring':       { bg: 'bg-[#0a1628] border-b border-sky-900/60',    text: 'text-sky-200',   muted: 'text-sky-400',   btn: 'text-sky-500 hover:text-sky-200' },
    'opening-day':  { bg: 'bg-[#0a1f0a] border-b border-green-700/60',  text: 'text-green-200', muted: 'text-[#39ff14]', btn: 'text-green-500 hover:text-green-200' },
    'season':       { bg: 'bg-[#0f1115] border-b border-white/10',      text: 'text-gray-300',  muted: 'text-[#39ff14]', btn: 'text-gray-500 hover:text-gray-200' },
  }

  const { bg: bgClass, text: textClass, muted: mutedClass, btn: btnClass } = styles[type]

  const message = type === 'opening-day'
    ? <>
        <span className={mutedClass}>⚾</span>
        {' '}<span className="font-bold">Opening Day is here.</span>
        <span className="mx-2 opacity-30">·</span>
        The hunt for 13 begins today.
      </>
    : type === 'season'
    ? <>
        <span className={mutedClass}>⚾</span>
        {' '}2026 Season is live
        <span className="mx-2 opacity-30">·</span>
        {weekNumber ? <>Week <span className="font-bold">{weekNumber}</span> — </> : ''}
        Any team. Any day. Exactly 13.
      </>
    : type === 'spring'
    ? <>
        <span className={mutedClass}>🌵</span>
        {' '}Spring Training is live
        <span className="mx-2 opacity-30">·</span>
        Opening Day in{' '}
        <span className="font-bold">{daysToOpening} {daysToOpening === 1 ? 'day' : 'days'}</span>
        {' '}—{' '}
        <span className="font-bold">{openingDate}</span>
      </>
    : <>
        <span className={mutedClass}>⚾</span>
        {' '}MLB Offseason
        <span className="mx-2 opacity-30">·</span>
        Opening Day in{' '}
        <span className="font-bold">{daysToOpening} {daysToOpening === 1 ? 'day' : 'days'}</span>
        {' '}—{' '}
        <span className="font-bold">{openingDate}</span>
      </>

  return (
    <div className={`w-full sticky top-0 z-50 ${bgClass}`}>
      <div className="max-w-6xl mx-auto px-4 h-10 flex items-center justify-between gap-4">
        <div className="flex-1" />
        <p className={`text-xs sm:text-sm ${textClass} text-center`}>
          {message}
        </p>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => {
              localStorage.setItem(storageKey(type), '1')
              setDismissed(true)
            }}
            className={`text-lg leading-none ${btnClass} transition-colors`}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
