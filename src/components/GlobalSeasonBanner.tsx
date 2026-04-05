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

  // This year's opening day — used for season-state detection
  const thisYearOpening = new Date(`${bY}-03-25T00:00:00`)
  // Next opening day — used for the countdown display only
  const nextOpeningYear = now >= thisYearOpening ? bY + 1 : bY
  const nextOpeningDay = new Date(`${nextOpeningYear}-03-25T00:00:00`)
  const daysToOpening = Math.max(0, Math.ceil((nextOpeningDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const openingDateStr = nextOpeningDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const isOffseason  = (bMonth > 9) || (bMonth === 9 && bDay >= 5) || bMonth === 0 || (bMonth === 1 && bDay < 20)
  const isSpring     = !isOffseason && now < thisYearOpening
  const isOpeningDay = bMonth === 2 && (bDay === 25 || bDay === 26)
  // Opening Week = March 27–28 (Thu–Sat after opening day, still in Week 1)
  // Week 2 starts Sunday March 29 — show regular season banner from then on
  const isOpeningWeek = bMonth === 2 && bDay >= 27 && bDay <= 28
  const isSeason     = !isOffseason && !isSpring && !isOpeningDay && !isOpeningWeek

  // Weeks run Sunday–Saturday, anchored to the Sunday on or before March 25.
  // Must match getWeekNumber() in pot.ts — Sunday is the FIRST day of a new week.
  const openingDow = thisYearOpening.getDay() // 0=Sun … 6=Sat
  const week1Sunday = new Date(thisYearOpening)
  week1Sunday.setDate(week1Sunday.getDate() - openingDow)
  const weekNumber = isSeason
    ? Math.floor((now.getTime() - week1Sunday.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1
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
