'use client'
import { useEffect, useState } from 'react'

export default function AddToHomeScreenBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone === true
    const dismissed = localStorage.getItem('a2hs-dismissed')
    if (isIOS && !isStandalone && !dismissed) {
      // Small delay so it doesn't flash on first render
      const t = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('a2hs-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

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
          className="text-gray-600 hover:text-gray-400 text-lg shrink-0 mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
