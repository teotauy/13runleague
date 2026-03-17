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
      className="fixed bottom-4 left-4 z-40 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-950 border border-gray-700 shadow-lg hover:border-[#39ff14] hover:shadow-[0_0_12px_rgba(57,255,20,0.15)] transition-all group cursor-pointer"
      aria-label="Get your crew in next season — 13runleague.com"
    >
      {/* Pulsing 13 */}
      <span className="text-[#39ff14] font-black text-xl leading-none relative">
        13
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
      </span>

      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span className="text-white text-xs font-bold">Get your crew in next season</span>
        <span className="text-gray-500 text-[10px] group-hover:text-[#39ff14] transition-colors">13runleague.com →</span>
      </div>
    </Link>
  )
}
