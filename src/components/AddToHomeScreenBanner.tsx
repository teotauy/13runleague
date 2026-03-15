'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'a2hs-dismiss'

// Progressive snooze: 7d → 14d → 30d → never
const SNOOZE_DAYS = [7, 14, 30]

function getSnoozState(): { count: number; until: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0, until: 0 }
    return JSON.parse(raw)
  } catch {
    return { count: 0, until: 0 }
  }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

function isStandalone() {
  return ('standalone' in window.navigator) && (window.navigator as any).standalone === true
}

export default function AddToHomeScreenBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isIOS() || isStandalone()) return

    const { count, until } = getSnoozState()
    if (count >= SNOOZE_DAYS.length + 1) return // permanently dismissed
    if (Date.now() < until) return              // still snoozed

    const t = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    const { count } = getSnoozState()
    const nextCount = count + 1
    const days = SNOOZE_DAYS[count] // undefined if count >= SNOOZE_DAYS.length → permanent
    const until = days ? Date.now() + days * 24 * 60 * 60 * 1000 : Infinity
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: nextCount, until }))
    setShow(false)
  }

  if (!show) return null

  const { count } = getSnoozState()
  const snoozeLabel = SNOOZE_DAYS[count]
    ? `Remind me in ${SNOOZE_DAYS[count]} days`
    : "Don't show again"

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#111] border-t border-[#39ff14]/30 shadow-lg">
      <div className="max-w-lg mx-auto flex items-start gap-3">
        <div className="text-2xl shrink-0">⚡</div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-bold mb-0.5">Add to Home Screen</div>
          <div className="text-gray-400 text-xs leading-relaxed">
            Tap <span className="text-[#39ff14] font-mono">⬆ Share</span> then{' '}
            <span className="text-white">"Add to Home Screen"</span> to get push notifications when your team scores 13.
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-gray-600 hover:text-gray-400 text-[10px] shrink-0 mt-0.5 text-right leading-tight"
          aria-label="Dismiss"
        >
          ✕<br />
          <span className="text-[9px] text-gray-700">{snoozeLabel}</span>
        </button>
      </div>
    </div>
  )
}

/**
 * Small inline link for the footer — always visible on iOS Safari (not in PWA mode).
 * Gives dismissed users a permanent path back to the install instructions.
 */
export function InstallAppLink() {
  const [show, setShow] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (isIOS() && !isStandalone()) setShow(true)
  }, [])

  if (!show) return null

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="text-[#39ff14]/70 hover:text-[#39ff14] transition-colors"
      >
        📱 Install App
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#111] border border-[#39ff14]/30 rounded-xl p-6 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[#39ff14] font-bold text-base">Add to Home Screen</div>
            <ol className="text-gray-300 text-sm space-y-2 list-none">
              <li>1. Tap <span className="text-[#39ff14]">⬆ Share</span> at the bottom of Safari</li>
              <li>2. Scroll down and tap <span className="text-white font-semibold">"Add to Home Screen"</span></li>
              <li>3. Tap <span className="text-white font-semibold">Add</span> — done!</li>
            </ol>
            <p className="text-gray-500 text-xs">Once installed, you'll get push notifications when any team scores 13.</p>
            <button
              onClick={() => setModalOpen(false)}
              className="w-full mt-2 py-2 rounded bg-[#1a1a1a] border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
