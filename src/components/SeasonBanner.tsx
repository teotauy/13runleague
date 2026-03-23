'use client'

import { useEffect, useState } from 'react'

export type SeasonState = 'offseason' | 'spring' | null

interface Props {
  type: SeasonState
  daysToOpening: number
  openingDate: string // e.g. "March 25, 2026"
}

// Key includes the type so dismissing offseason doesn't suppress spring
function storageKey(type: SeasonState) {
  return `season-banner-dismissed:${type}`
}

export default function SeasonBanner({ type, daysToOpening, openingDate }: Props) {
  // Start true (hidden) to prevent flash-of-banner on load
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!type) return
    const stored = localStorage.getItem(storageKey(type))
    if (!stored) setDismissed(false)
  }, [type])

  if (!type || dismissed) return null

  const isSpring = type === 'spring'

  const bgClass = isSpring
    ? 'bg-[#0a1628] border-b border-sky-900/60'
    : 'bg-[#1a1206] border-b border-amber-900/60'

  const textClass = isSpring ? 'text-sky-200' : 'text-amber-200'
  const mutedClass = isSpring ? 'text-sky-400' : 'text-amber-400'
  const btnClass = isSpring
    ? 'text-sky-500 hover:text-sky-200'
    : 'text-amber-500 hover:text-amber-200'

  const message = isSpring
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
