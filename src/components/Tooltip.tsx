'use client'

import { useState, ReactNode, useRef, useEffect } from 'react'

interface TooltipProps {
  children: ReactNode
  label: string
  /** Pass a string for a single line, or string[] for multi-line bullet points */
  explanation: string | string[]
}

export default function Tooltip({ children, label, explanation }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<'below' | 'above'>('below')
  const [hAlign, setHAlign] = useState<'center' | 'left' | 'right'>('center')
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const lines = Array.isArray(explanation) ? explanation : [explanation]

  useEffect(() => {
    if (!isVisible || !containerRef.current || !tooltipRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const MARGIN = 8

    // Vertical
    const spaceBelow = window.innerHeight - containerRect.bottom
    const spaceAbove = containerRect.top
    if (spaceBelow < tooltipRect.height + MARGIN && spaceAbove > tooltipRect.height + MARGIN) {
      setPosition('above')
    } else {
      setPosition('below')
    }

    // Horizontal — check if centered tooltip bleeds off either edge
    const centeredLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2
    const centeredRight = centeredLeft + tooltipRect.width
    if (centeredLeft < MARGIN) {
      setHAlign('left')
    } else if (centeredRight > window.innerWidth - MARGIN) {
      setHAlign('right')
    } else {
      setHAlign('center')
    }
  }, [isVisible])

  // Close when clicking outside on mobile
  useEffect(() => {
    if (!isVisible) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isVisible])

  return (
    <div
      ref={containerRef}
      className="relative inline-block cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onClick={() => setIsVisible((v) => !v)}
      tabIndex={0}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute z-50 w-52 px-3 py-2.5 rounded bg-[#111] border border-[#39ff14] text-white text-xs shadow-lg ${
            position === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
          } ${
            hAlign === 'center' ? 'left-1/2 -translate-x-1/2' :
            hAlign === 'left'   ? 'left-0' :
                                  'right-0'
          }`}
        >
          <div className="font-bold text-[#39ff14] mb-1.5 text-[11px] tracking-wide uppercase">{label}</div>
          <ul className="space-y-1">
            {lines.map((line, i) => (
              <li key={i} className="text-gray-300 leading-snug">
                {line}
              </li>
            ))}
          </ul>
          {/* Arrow — tracks horizontal alignment */}
          <div
            className={`absolute w-2 h-2 bg-[#111] border-r border-b border-[#39ff14] ${
              hAlign === 'center' ? 'left-1/2 -translate-x-1/2' :
              hAlign === 'left'   ? 'left-3' :
                                    'right-3'
            } ${
              position === 'below' ? '-top-1 rotate-45' : '-bottom-1 -rotate-45'
            }`}
          />
        </div>
      )}
    </div>
  )
}
