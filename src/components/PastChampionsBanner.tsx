'use client'

import { useEffect, useRef, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { getTeamColor, RANK_COLORS } from '@/lib/teamColors'

export interface Champion {
  rank: 1 | 2 | 3 | number
  memberName: string
  team: string
  totalWon: number
  year: number
}

export interface YearlyChampions {
  year: number
  champions: Champion[]
}

interface Props {
  yearlyChampions: YearlyChampions[]
}

export default function PastChampionsBanner({ yearlyChampions }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null)

  // Check if mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Flatten champions array for carousel
  const allChampions: (Champion & { displayYear: number })[] = []
  yearlyChampions.forEach((yc) => {
    yc.champions.forEach((champion) => {
      allChampions.push({
        ...champion,
        displayYear: yc.year,
      })
    })
  })

  // Auto-scroll animation for desktop
  useEffect(() => {
    if (isMobile || !isAutoScrolling || isHovering) {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current)
      return
    }

    autoScrollRef.current = setInterval(() => {
      if (containerRef.current) {
        const scrollAmount = 2 // pixels per frame
        containerRef.current.scrollLeft += scrollAmount

        // Reset to beginning when reaching end
        if (
          containerRef.current.scrollLeft >=
          containerRef.current.scrollWidth - containerRef.current.clientWidth
        ) {
          containerRef.current.scrollLeft = 0
        }
      }
    }, 30)

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current)
    }
  }, [isMobile, isAutoScrolling, isHovering])

  // Swipe handlers for mobile
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isMobile && currentIndex < allChampions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    },
    onSwipedRight: () => {
      if (isMobile && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    },
    trackTouch: true,
    trackMouse: false,
  })

  if (allChampions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-[#111] p-8 text-center">
        <p className="text-gray-500">No champion data available</p>
      </div>
    )
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return RANK_COLORS[1]
      case 2:
        return RANK_COLORS[2]
      case 3:
        return RANK_COLORS[3]
      default:
        return RANK_COLORS.other
    }
  }

  const ChampionCard = ({
    champion,
  }: {
    champion: Champion & { displayYear: number }
  }) => {
    const teamColor = getTeamColor(champion.team)
    const rankColor = getRankColor(champion.rank)

    return (
      <div
        className="relative flex-shrink-0 rounded-lg border border-gray-700 p-4"
        style={{
          width: isMobile ? '100%' : '200px',
          backgroundColor: teamColor.primaryColor,
          color: teamColor.textColor,
        }}
      >
        {/* Rank badge */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl">{rankColor.badge}</span>
          <span
            className="rounded px-2 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: rankColor.background,
              color: rankColor.text,
            }}
          >
            #{champion.rank}
          </span>
        </div>

        {/* Year */}
        <div className="text-2xl font-bold opacity-80">{champion.displayYear}</div>

        {/* Name */}
        <div className="mt-2 text-sm font-bold line-clamp-2">{champion.memberName}</div>

        {/* Team */}
        <div className="mt-1 text-xs opacity-75">{champion.team}</div>

        {/* Earnings */}
        <div className="mt-3 border-t border-current border-opacity-30 pt-2">
          <div className="text-xs opacity-75">Earnings</div>
          <div className="text-lg font-bold text-[#39ff14]">${champion.totalWon}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Past Champions</h2>
        {!isMobile && (
          <span className="text-xs text-gray-500">
            {allChampions.length} champion{allChampions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Desktop: Auto-scrolling carousel */}
      {!isMobile ? (
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto rounded-lg bg-[#0a0a0a] p-4"
          style={{ scrollBehavior: 'smooth' }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {allChampions.map((champion, idx) => (
            <ChampionCard key={`${champion.displayYear}-${champion.rank}-${idx}`} champion={champion} />
          ))}
        </div>
      ) : (
        /* Mobile: Swipe carousel */
        <div {...handlers} className="overflow-hidden rounded-lg bg-[#0a0a0a]">
          <div className="relative">
            {/* Current card */}
            <div className="p-4">
              <ChampionCard champion={allChampions[currentIndex]} />
            </div>

            {/* Indicators */}
            <div className="flex items-center justify-center gap-2 pb-4">
              {allChampions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'w-6 bg-[#39ff14]' : 'w-2 bg-gray-700'
                  }`}
                  aria-label={`Go to champion ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation info */}
            <div className="text-center text-xs text-gray-500 pb-2">
              {currentIndex + 1} of {allChampions.length}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-lg">🥇</span>
          <span>1st Place</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🥈</span>
          <span>2nd Place</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🥉</span>
          <span>3rd Place</span>
        </div>
      </div>
    </div>
  )
}
