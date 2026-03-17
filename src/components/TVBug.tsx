'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TVBug() {
  const pathname = usePathname()

  // Hide on all league-gated pages
  if (pathname.startsWith('/league/')) return null

  return (
    <Link
      href="/waitlist"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 border border-gray-800 backdrop-blur-sm hover:border-[#39ff14]/50 transition-colors group"
      aria-label="Get your crew in next season — 13runleague.com"
    >
      <span className="text-[#39ff14] font-black text-sm leading-none">13</span>
      <span className="text-[10px] text-gray-500 group-hover:text-gray-300 transition-colors leading-tight">
        13runleague.com
      </span>
    </Link>
  )
}
