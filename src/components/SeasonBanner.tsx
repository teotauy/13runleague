'use client'

import { useEffect, useState } from 'react'
import type { FestiveTheme } from '@/lib/festiveThemes'

export type SeasonState = 'offseason' | 'spring' | 'opening-day' | 'opening-week' | 'season' | null

interface Props {
  type: SeasonState
  daysToOpening: number
  openingDate: string // e.g. "March 25, 2026"
  weekNumber?: number
  festiveTheme?: FestiveTheme | null
}

// Key includes the type so dismissing offseason doesn't suppress spring
function storageKey(type: SeasonState) {
  return `season-banner-dismissed:${type}`
}

export default function SeasonBanner({ type, daysToOpening, openingDate, weekNumber, festiveTheme }: Props) {
  // Start true (hidden) to prevent flash-of-banner on load
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!type) return
    const stored = localStorage.getItem(storageKey(type))
    if (!stored) setDismissed(false)
  }, [type])

  if (!type || dismissed) return null

  const defaultStyles: Record<NonNullable<SeasonState>, { bg: string; text: string; muted: string; btn: string }> = {
    'offseason':   { bg: 'bg-[#1a1206] border-b border-amber-900/60', text: 'text-amber-200', muted: 'text-amber-400', btn: 'text-amber-500 hover:text-amber-200' },
    'spring':      { bg: 'bg-[#0a1628] border-b border-sky-900/60',   text: 'text-sky-200',   muted: 'text-sky-400',   btn: 'text-sky-500 hover:text-sky-200' },
    'opening-day':  { bg: 'bg-[#061a06] border-b border-[#39ff14]/30', text: 'text-green-200', muted: 'text-[#39ff14]', btn: 'text-green-600 hover:text-green-200' },
    'opening-week': { bg: 'bg-[#071a07] border-b border-[#39ff14]/20', text: 'text-green-300', muted: 'text-[#39ff14]', btn: 'text-green-700 hover:text-green-200' },
    'season':       { bg: 'bg-[#0f1115] border-b border-white/10',     text: 'text-gray-300',  muted: 'text-[#39ff14]', btn: 'text-gray-500 hover:text-gray-200' },
  }

  // Festive theme overrides default styles when present
  const bgClass   = festiveTheme?.bannerBg   ?? defaultStyles[type].bg
  const textClass = festiveTheme?.bannerText  ?? defaultStyles[type].text
  const mutedClass = festiveTheme?.bannerAccent ?? defaultStyles[type].muted
  const btnClass  = festiveTheme?.bannerBtn   ?? defaultStyles[type].btn
  const isAnimated = festiveTheme?.animate ?? false
  const isJackie = festiveTheme?.name === 'jackie-robinson'

  const emojiNode = festiveTheme
    ? <span className={`${isAnimated ? (festiveTheme.name === 'july-4' ? 'festive-animate-firework' : 'festive-animate-float') : ''} ${mutedClass}`}>{festiveTheme.emoji}</span>
    : null

  const message = festiveTheme
    ? <>
        {emojiNode}
        {' '}<span className={`font-bold ${isAnimated ? 'festive-animate-glow' : ''}`}>{festiveTheme.message}</span>
      </>
    : type === 'opening-day'
    ? <>
        <span className={`festive-animate-float ${mutedClass}`}>⚾</span>
        {' '}<span className={`font-bold festive-animate-glow ${textClass}`}>Opening Day is here.</span>
        <span className="mx-2 opacity-30">·</span>
        <span className={textClass}>The hunt for 13 begins today.</span>
      </>
    : type === 'opening-week'
    ? <>
        <span className={`festive-animate-float ${mutedClass}`}>⚾</span>
        {' '}<span className={`font-bold ${textClass}`}>Opening Week</span>
        <span className="mx-2 opacity-30">·</span>
        <span className={textClass}>The hunt is on. First 13 pays out Sunday.</span>
      </>
    : type === 'season'
    ? <>
        <span className={mutedClass}>⚾</span>
        {' '}<span className={textClass}>2026 Season is live</span>
        <span className="mx-2 opacity-30">·</span>
        {weekNumber ? <><span className={textClass}>Week </span><span className="font-bold">{weekNumber}</span><span className={textClass}> — </span></> : ''}
        <span className={textClass}>Any team. Any day. Exactly 13.</span>
      </>
    : type === 'spring'
    ? <>
        <span className={mutedClass}>🌵</span>
        {' '}<span className={textClass}>Spring Training is live</span>
        <span className="mx-2 opacity-30">·</span>
        <span className={textClass}>Opening Day in{' '}
        <span className="font-bold">{daysToOpening} {daysToOpening === 1 ? 'day' : 'days'}</span>
        {' '}—{' '}
        <span className="font-bold">{openingDate}</span></span>
      </>
    : <>
        <span className={mutedClass}>⚾</span>
        {' '}<span className={textClass}>MLB Offseason</span>
        <span className="mx-2 opacity-30">·</span>
        <span className={textClass}>Opening Day in{' '}
        <span className="font-bold">{daysToOpening} {daysToOpening === 1 ? 'day' : 'days'}</span>
        {' '}—{' '}
        <span className="font-bold">{openingDate}</span></span>
      </>

  return (
    <div className={`w-full sticky top-0 z-50 ${bgClass} ${isJackie ? 'festive-jackie-banner' : ''}`}>
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
