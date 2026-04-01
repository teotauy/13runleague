'use client'

import {
  useState,
  useMemo,
  ReactNode,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  children: ReactNode
  label: string
  /** Pass a string for a single line, or string[] for multi-line bullet points */
  explanation: string | string[]
}

const GAP = 10
const VIEW_MARGIN = 12
/** Max tooltip width — enough for Poisson / park-factor copy without clipping */
const MAX_TOOLTIP_W = 320

export default function Tooltip({ children, label, explanation }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{
    top: number
    left: number
    arrowX: number
    placeAbove: boolean
  } | null>(null)

  const lines = useMemo(
    () => (Array.isArray(explanation) ? explanation : [explanation]),
    [explanation]
  )

  const updatePosition = useCallback(() => {
    const trigger = containerRef.current
    const tip = tooltipRef.current
    if (!trigger || !tip || !isVisible) return

    const tr = trigger.getBoundingClientRect()
    const tw = tip.offsetWidth
    const th = tip.offsetHeight

    let placeAbove =
      tr.bottom + th + GAP > window.innerHeight - VIEW_MARGIN &&
      tr.top > th + GAP + VIEW_MARGIN

    let top = placeAbove ? tr.top - th - GAP : tr.bottom + GAP
    let left = tr.left + tr.width / 2 - tw / 2
    left = Math.max(VIEW_MARGIN, Math.min(left, window.innerWidth - tw - VIEW_MARGIN))

    if (top < VIEW_MARGIN) {
      top = VIEW_MARGIN
      placeAbove = false
    }
    if (top + th > window.innerHeight - VIEW_MARGIN) {
      top = Math.max(VIEW_MARGIN, window.innerHeight - th - VIEW_MARGIN)
    }

    const triggerCenter = tr.left + tr.width / 2
    const arrowX = Math.min(Math.max(triggerCenter - left - 6, 16), tw - 28)

    setBox({ top, left, arrowX, placeAbove })
  }, [isVisible])

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!isVisible) {
      setBox(null)
      return
    }
    updatePosition()
    const ro = new ResizeObserver(() => updatePosition())
    if (tooltipRef.current) ro.observe(tooltipRef.current)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, updatePosition, lines, label])

  useEffect(() => {
    if (!isVisible) return
    const handleOutsideClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        containerRef.current?.contains(t) ||
        tooltipRef.current?.contains(t)
      ) {
        return
      }
      setIsVisible(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isVisible])

  const tooltipNode =
    isVisible &&
    mounted &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={tooltipRef}
        role="tooltip"
        className="fixed z-[100] rounded-lg bg-[#111] border border-[#39ff14] text-white text-xs shadow-xl pointer-events-none"
        style={{
          top: box?.top ?? -9999,
          left: box?.left ?? 0,
          maxWidth: `min(${MAX_TOOLTIP_W}px, calc(100vw - ${VIEW_MARGIN * 2}px))`,
          width: 'max-content',
          padding: '0.75rem 1rem 0.875rem',
          visibility: box ? 'visible' : 'hidden',
        }}
      >
        <div className="font-bold text-[#39ff14] mb-2 text-[11px] tracking-wide uppercase">
          {label}
        </div>
        {lines.length === 1 ? (
          <p className="text-gray-300 leading-relaxed break-words">{lines[0]}</p>
        ) : (
          <ul className="list-none space-y-1.5 m-0 p-0">
            {lines.map((line, i) => (
              <li
                key={i}
                className="text-gray-300 leading-relaxed break-words pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#39ff14]/60"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
        {box && (
          <div
            className={`pointer-events-none absolute w-2 h-2 bg-[#111] border-r border-b border-[#39ff14] ${
              box.placeAbove ? '-bottom-1 -rotate-45' : '-top-1 rotate-45'
            }`}
            style={{ left: box.arrowX }}
          />
        )}
      </div>,
      document.body
    )

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
      {tooltipNode}
    </div>
  )
}
