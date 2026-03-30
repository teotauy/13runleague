'use client'

import { useState } from 'react'
import { previewWeeklyRecapEmail, sendWeeklyRecapEmail } from '@/lib/weeklyRecapActions'

interface Props {
  leagueSlug: string
  /** HMAC token from admin RSC — server actions cannot rely on league cookies in all Next.js builds */
  recapCapabilityToken: string
}

export default function WeeklyRecapSection({ leagueSlug, recapCapabilityToken }: Props) {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function loadPreview() {
    setLoadStatus('loading')
    try {
      const data = await previewWeeklyRecapEmail(leagueSlug, recapCapabilityToken)
      if (!data.ok) throw new Error(data.error)
      setPreviewHtml(data.html)
      setWeekNumber(data.weekNumber)
      setRecipientCount(data.recipientCount)
      setLoadStatus('loaded')
    } catch (e) {
      setLoadStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  async function handleSend() {
    if (!confirm(`Send Week ${weekNumber} recap to ${recipientCount} members? This cannot be undone.`)) return
    setSendStatus('sending')
    try {
      const data = await sendWeeklyRecapEmail(leagueSlug, recapCapabilityToken)
      if (!data.ok) throw new Error(data.error)
      setSendStatus('sent')
    } catch (e) {
      setSendStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {weekNumber ? `Week ${weekNumber}` : 'Current week'}{recipientCount ? ` · ${recipientCount} recipients` : ''}
        </div>
        <div className="flex gap-3 items-center">
          {loadStatus !== 'loaded' && (
            <button
              onClick={loadPreview}
              disabled={loadStatus === 'loading'}
              className="text-sm text-gray-300 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              {loadStatus === 'loading' ? 'Loading…' : 'Load Preview'}
            </button>
          )}
          {loadStatus === 'loaded' && sendStatus !== 'sent' && (
            <button
              onClick={handleSend}
              disabled={sendStatus === 'sending'}
              className="text-sm font-bold bg-[#39ff14] text-black px-4 py-1.5 rounded disabled:opacity-40 hover:bg-[#2ecc10] transition-colors"
            >
              {sendStatus === 'sending' ? 'Sending…' : `Send to ${recipientCount}`}
            </button>
          )}
          {sendStatus === 'sent' && (
            <span className="text-[#39ff14] text-sm font-mono">Sent ✓</span>
          )}
        </div>
      </div>

      {(loadStatus === 'error' || sendStatus === 'error') && (
        <div className="text-red-400 text-xs font-mono bg-red-950/30 border border-red-900 rounded p-2">
          {errorMsg}
        </div>
      )}

      {loadStatus === 'idle' && (
        <p className="text-xs text-gray-600">Load the preview to see every word before sending.</p>
      )}

      {previewHtml && (
        <div className="border border-gray-800 rounded overflow-hidden">
          <div className="bg-[#111] text-xs text-gray-500 px-3 py-1.5 border-b border-gray-800 font-mono">
            Preview — Week {weekNumber} Recap · {recipientCount} recipients
          </div>
          <iframe
            srcDoc={previewHtml}
            className="w-full"
            style={{ height: '600px' }}
            sandbox="allow-same-origin"
            title="Email preview"
          />
        </div>
      )}
    </div>
  )
}
