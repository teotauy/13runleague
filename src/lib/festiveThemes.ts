// Festive theme engine — special MLB calendar days get their own banner + bg treatment

export interface FestiveTheme {
  name: string
  emoji: string
  message: string
  bannerBg: string       // Tailwind classes for banner background
  bannerText: string     // Tailwind class for main text
  bannerAccent: string   // Tailwind class for accent/bold text
  bannerBtn: string      // Tailwind class for dismiss button
  bodyClass?: string     // Optional class applied to page root for bg treatment
  animate?: boolean      // Whether to use the festive shimmer/float animation
}

function getNthWeekday(year: number, month: number, weekday: number, n: number): number {
  // month: 0-indexed, weekday: 0=Sun, 1=Mon...
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d)
    if (date.getMonth() !== month) break
    if (date.getDay() === weekday) {
      count++
      if (count === n) return d
    }
  }
  return -1
}

function getLastWeekday(year: number, month: number, weekday: number): number {
  for (let d = 31; d >= 1; d--) {
    const date = new Date(year, month, d)
    if (date.getMonth() !== month) continue
    if (date.getDay() === weekday) return d
  }
  return -1
}

export function getFestiveTheme(date: Date): FestiveTheme | null {
  const m = date.getMonth() // 0-indexed
  const d = date.getDate()
  const y = date.getFullYear()

  // ── Opening Day: March 25 ─────────────────────────────────────────────────
  if (m === 2 && d === 25) return {
    name: 'opening-day',
    emoji: '⚾',
    message: 'Opening Day is here. The hunt for 13 begins.',
    bannerBg: 'bg-[#061a06] border-b border-[#39ff14]/30',
    bannerText: 'text-green-200',
    bannerAccent: 'text-[#39ff14]',
    bannerBtn: 'text-green-600 hover:text-green-200',
    bodyClass: 'festive-opening-day',
    animate: true,
  }

  // ── Jackie Robinson Day: April 15 ─────────────────────────────────────────
  if (m === 3 && d === 15) return {
    name: 'jackie-robinson',
    emoji: '42',
    message: 'Jackie Robinson Day — #42 forever. Breaking barriers since 1947.',
    bannerBg: 'bg-[#0a0a2e] border-b border-blue-600/40',
    bannerText: 'text-blue-100',
    bannerAccent: 'text-blue-400',
    bannerBtn: 'text-blue-600 hover:text-blue-200',
    bodyClass: 'festive-jackie',
    animate: false,
  }

  // ── Mother's Day: 2nd Sunday in May ───────────────────────────────────────
  const mothersDayDate = getNthWeekday(y, 4, 0, 2)
  if (m === 4 && d === mothersDayDate) return {
    name: 'mothers-day',
    emoji: '🌸',
    message: "Happy Mother's Day — Even the pink bats can score 13.",
    bannerBg: 'bg-[#1f0a14] border-b border-pink-700/40',
    bannerText: 'text-pink-200',
    bannerAccent: 'text-pink-400',
    bannerBtn: 'text-pink-600 hover:text-pink-200',
    animate: false,
  }

  // ── Memorial Day: last Monday in May ─────────────────────────────────────
  const memorialDate = getLastWeekday(y, 4, 1)
  if (m === 4 && d === memorialDate) return {
    name: 'memorial-day',
    emoji: '🇺🇸',
    message: 'Memorial Day — Honor those who served. Play ball.',
    bannerBg: 'bg-[#0a0a1a] border-b border-red-700/40',
    bannerText: 'text-white',
    bannerAccent: 'text-red-400',
    bannerBtn: 'text-gray-500 hover:text-white',
    bodyClass: 'festive-bunting',
    animate: false,
  }

  // ── Father's Day: 3rd Sunday in June ─────────────────────────────────────
  const fathersDayDate = getNthWeekday(y, 5, 0, 3)
  if (m === 5 && d === fathersDayDate) return {
    name: 'fathers-day',
    emoji: '👔',
    message: "Happy Father's Day — The blue bats are for you.",
    bannerBg: 'bg-[#0a1628] border-b border-sky-700/40',
    bannerText: 'text-sky-200',
    bannerAccent: 'text-sky-400',
    bannerBtn: 'text-sky-600 hover:text-sky-200',
    animate: false,
  }

  // ── Independence Day: July 4 ──────────────────────────────────────────────
  if (m === 6 && d === 4) return {
    name: 'july-4',
    emoji: '🎆',
    message: 'Independence Day — Baseball, apple pie, and exactly 13.',
    bannerBg: 'bg-[#0a0a1a] border-b border-red-700/40',
    bannerText: 'text-white',
    bannerAccent: 'text-red-400',
    bannerBtn: 'text-gray-500 hover:text-white',
    bodyClass: 'festive-bunting',
    animate: true,
  }

  // ── Roberto Clemente Day: September 15 ───────────────────────────────────
  if (m === 8 && d === 15) return {
    name: 'roberto-clemente',
    emoji: '21',
    message: 'Roberto Clemente Day — #21. Playing the game the right way.',
    bannerBg: 'bg-[#1a0e00] border-b border-yellow-700/40',
    bannerText: 'text-yellow-100',
    bannerAccent: 'text-yellow-400',
    bannerBtn: 'text-yellow-600 hover:text-yellow-200',
    animate: false,
  }

  // ── Hispanic Heritage Month opener: September 15 overlaps above,
  //    so no separate entry needed.

  return null
}
