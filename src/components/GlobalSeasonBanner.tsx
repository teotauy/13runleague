'use client'

import { useMemo } from 'react'
import SeasonBanner, { type SeasonState } from './SeasonBanner'
import { getFestiveTheme } from '@/lib/festiveThemes'

// Computes season state from current date — no props needed.
// Drop this in layout.tsx so it appears on every page.
// localStorage dismiss key is shared, so dismissing on one page dismisses everywhere.
function computeState(): {
  seasonState: SeasonState
  daysToOpening: number
  openingDateStr: string
  weekNumber?: number
} {
  const now = new Date()
  const bY = now.getFullYear()
  const bMonth = now.getMonth() // 0-indexed
  const bDay = now.getDate()

  const openingYear = (bMonth > 2 || (bMonth === 2 && bDay >= 25)) ? bY + 1 : bY
  const openingDayDate = new Date(`${openingYear}-03-25T00:00:00`)
  const daysToOpening = Math.max(0, Math.ceil((openingDayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const openingDateStr = openingDayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const isOffseason  = (bMonth > 9) || (bMonth === 9 && bDay >= 5) || bMonth === 0 || (bMonth === 1 && bDay < 20)
  const isSpring     = !isOffseason && now < openingDayDate
  const isOpeningDay = bMonth === 2 && (bDay === 25 || bDay === 26)
  const isOpeningWeek = bMonth === 2 && bDay >= 27 && bDay <= 29
  const isSeason     = !isOffseason && !isSpring && !isOpeningDay && !isOpeningWeek

  const openingDayThisYear = new Date(`${bY}-03-25T00:00:00`)
  const weekNumber = isSeason
    ? Math.floor((now.getTime() - openingDayThisYear.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
    : undefined

  const seasonState: SeasonState = isOffseason ? 'offseason'
    : isSpring      ? 'spring'
    : isOpeningDay  ? 'opening-day'
    : isOpeningWeek ? 'opening-week'
    : isSeason      ? 'season'
    : null

  return { seasonState, daysToOpening, openingDateStr, weekNumber }
}

export default function GlobalSeasonBanner() {
  const { seasonState, daysToOpening, openingDateStr, weekNumber } = useMemo(computeState, [])
  const festiveTheme = useMemo(() => getFestiveTheme(new Date()), [])

  return (
    <SeasonBanner
      type={seasonState}
      daysToOpening={daysToOpening}
      openingDate={openingDateStr}
      weekNumber={weekNumber}
      festiveTheme={festiveTheme}
    />
  )
}
