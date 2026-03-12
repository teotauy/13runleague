'use client'

import { useState, ReactNode, useRef, useEffect } from 'react'

interface TooltipProps {
  children: ReactNode
  label: string
  explanation: string
}

export default function Tooltip({ children, label, explanation }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<'below' | 'above'>('below')
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible || !containerRef.current || !tooltipRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    // Check if there's enough space below, otherwise show above
    const spaceBelow = window.innerHeight - containerRect.bottom
    const spaceAbove = containerRect.top

    if (spaceBelow < tooltipRect.height + 8 && spaceAbove > tooltipRect.height + 8) {
      setPosition('above')
    } else {
      setPosition('below')
    }
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-3 py-2 rounded bg-[#111] border border-[#39ff14] text-white text-xs whitespace-nowrap shadow-lg transition-opacity duration-200 ${
            position === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
          } left-1/2 -translate-x-1/2`}
        >
          <div className="font-bold text-[#39ff14] mb-1">{label}</div>
          <div className="text-gray-300">{explanation}</div>
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-[#111] border-r border-b border-[#39ff14] left-1/2 -translate-x-1/2 ${
              position === 'below' ? '-top-1 rotate-45' : '-bottom-1 -rotate-45'
            }`}
          />
        </div>
      )}
    </div>
  )
}
