'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  previewWeeklyRecapEmail,
  sendWeeklyRecapEmail,
  fetchRecapSuggestions,
  type RecapEditorOptions,
} from '@/lib/weeklyRecapActions'
import type { RecapSuggestionBlock } from '@/lib/recapSuggestions'

interface Props {
  leagueSlug: string
  recapCapabilityToken: string
}

export default function WeeklyRecapSection({ leagueSlug, recapCapabilityToken }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [blocks, setBlocks] = useState<RecapSuggestionBlock[]>([])
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [ideasError, setIdeasError] = useState('')

  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)

  const [showLeaguePot, setShowLeaguePot] = useState(true)
  const [showBranding, setShowBranding] = useState(true)

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const editorOptions = useCallback((): RecapEditorOptions => {
    return {
      commissionerHtml: editorRef.current?.innerHTML ?? '',
      showLeaguePot,
      showBranding,
    }
  }, [showLeaguePot, showBranding])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIdeasLoading(true)
      setIdeasError('')
      try {
        const r = await fetchRecapSuggestions(leagueSlug, recapCapabilityToken)
        if (cancelled) return
        if (!r.ok) {
          setIdeasError(r.error)
          return
        }
        setBlocks(r.blocks)
        setWeekNumber(r.weekNumber)
        setRecipientCount(r.recipientCount)
      } catch (e) {
        if (!cancelled) setIdeasError(e instanceof Error ? e.message : 'Failed to load ideas')
      } finally {
        if (!cancelled) setIdeasLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leagueSlug, recapCapabilityToken])

  useEffect(() => {
    const el = editorRef.current
    if (!el || el.innerHTML.trim() !== '') return
    el.innerHTML = '<p>Write your recap here — bold, links, images (https URLs), tables…</p>'
  }, [])

  function runCmd(cmd: string, val?: string) {
    editorRef.current?.focus()
    try {
      document.execCommand(cmd, false, val)
    } catch {
      /* ignore */
    }
  }

  function promptLink() {
    const url = window.prompt('Link URL (https://…)')
    if (!url) return
    const label = window.prompt('Link text', url) ?? url
    runCmd(
      'insertHTML',
      `<a href="${url.replace(/"/g, '&quot;')}" style="color:#39ff14">${escapeAttr(label)}</a>`
    )
  }

  function promptImage() {
    const url = window.prompt('Image URL (https://… — GIFs work for simple animation)')
    if (!url) return
    const alt = window.prompt('Alt text (accessibility)', '') ?? ''
    runCmd(
      'insertHTML',
      `<p><img src="${url.replace(/"/g, '&quot;')}" alt="${escapeAttr(alt)}" style="max-width:100%;height:auto;border-radius:6px" /></p>`
    )
  }

  function insertBlock(html: string) {
    editorRef.current?.focus()
    runCmd('insertHTML', html)
  }

  async function refreshPreview() {
    setPreviewStatus('loading')
    setErrorMsg('')
    try {
      const r = await previewWeeklyRecapEmail(leagueSlug, recapCapabilityToken, editorOptions())
      if (!r.ok) throw new Error(r.error)
      setPreviewHtml(r.html)
      setWeekNumber(r.weekNumber)
      setRecipientCount(r.recipientCount)
      setPreviewStatus('ready')
    } catch (e) {
      setPreviewStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Preview failed')
    }
  }

  async function handleSend() {
    if (
      !confirm(
        `Send Week ${weekNumber ?? '?'} recap to ${recipientCount ?? '?'} members? This cannot be undone.`
      )
    ) {
      return
    }
    if (previewStatus !== 'ready') {
      await refreshPreview()
    }
    setSendStatus('sending')
    setErrorMsg('')
    try {
      const r = await sendWeeklyRecapEmail(leagueSlug, recapCapabilityToken, editorOptions())
      if (!r.ok) throw new Error(r.error)
      setSendStatus('sent')
    } catch (e) {
      setSendStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Send failed')
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLeaguePot}
              onChange={(e) => setShowLeaguePot(e.target.checked)}
              className="rounded border-gray-600"
            />
            Include auto pot block
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBranding}
              onChange={(e) => setShowBranding(e.target.checked)}
              className="rounded border-gray-600"
            />
            Include 13 header &amp; footer
          </label>
        </div>

        <div className="text-sm text-gray-400">
          {weekNumber != null ? `Week ${weekNumber}` : 'Week —'}
          {recipientCount != null ? ` · ${recipientCount} recipients` : ''}
        </div>

        <div className="flex flex-wrap gap-1.5 p-2 bg-[#111] border border-gray-800 rounded">
          <ToolbarBtn onClick={() => runCmd('bold')} label="Bold" />
          <ToolbarBtn onClick={() => runCmd('italic')} label="Italic" />
          <ToolbarBtn onClick={() => runCmd('strikeThrough')} label="Strike" />
          <ToolbarBtn onClick={() => runCmd('insertUnorderedList')} label="• List" />
          <ToolbarBtn onClick={() => runCmd('insertOrderedList')} label="1. List" />
          <ToolbarBtn onClick={promptLink} label="Link" />
          <ToolbarBtn onClick={promptImage} label="Image" />
          <ToolbarBtn onClick={() => runCmd('removeFormat')} label="Clear fmt" />
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[280px] px-3 py-3 rounded border border-gray-700 bg-[#0a0a0a] text-gray-200 text-sm leading-relaxed outline-none focus:border-[#39ff14]/50 prose prose-invert max-w-none [&_a]:text-[#39ff14]"
        />

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={refreshPreview}
            disabled={previewStatus === 'loading'}
            className="text-sm text-gray-300 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            {previewStatus === 'loading' ? 'Rendering…' : 'Refresh preview'}
          </button>
          {previewStatus === 'ready' && sendStatus !== 'sent' && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sendStatus === 'sending'}
              className="text-sm font-bold bg-[#39ff14] text-black px-4 py-1.5 rounded disabled:opacity-40 hover:bg-[#2ecc10] transition-colors"
            >
              {sendStatus === 'sending' ? 'Sending…' : `Send to ${recipientCount ?? '…'}`}
            </button>
          )}
          {sendStatus === 'sent' && (
            <span className="text-[#39ff14] text-sm font-mono">Sent ✓</span>
          )}
        </div>

        {(previewStatus === 'error' || sendStatus === 'error') && errorMsg && (
          <div className="text-red-400 text-xs font-mono bg-red-950/30 border border-red-900 rounded p-2">
            {errorMsg}
          </div>
        )}

        <p className="text-xs text-gray-600">
          Preview runs the same sanitizer as send. Most inboxes ignore CSS animation — use an animated GIF if you
          need motion. Read every pixel before you send.
        </p>

        {previewHtml && (
          <div className="border border-gray-800 rounded overflow-hidden">
            <div className="bg-[#111] text-xs text-gray-500 px-3 py-1.5 border-b border-gray-800 font-mono">
              Email preview — Week {weekNumber} · {recipientCount} recipients
            </div>
            <iframe
              srcDoc={previewHtml}
              className="w-full bg-white"
              style={{ height: '640px' }}
              sandbox="allow-same-origin"
              title="Email preview"
            />
          </div>
        )}
      </div>

      <aside className="space-y-3 xl:sticky xl:top-4">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Ideas &amp; data</h3>
        {ideasLoading && <p className="text-xs text-gray-600">Loading league angles…</p>}
        {ideasError && (
          <p className="text-xs text-red-400 font-mono">{ideasError}</p>
        )}
        {!ideasLoading &&
          blocks.map((b) => (
            <div
              key={b.id}
              className="rounded border border-gray-800 bg-white/[0.03] p-3 space-y-2 text-xs"
            >
              <p className="font-bold text-[#39ff14] text-[11px] uppercase tracking-wider">{b.title}</p>
              <ul className="text-gray-400 space-y-1 list-disc pl-4">
                {b.bodyLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => insertBlock(b.insertHtml)}
                className="text-[11px] font-mono text-gray-300 hover:text-white border border-gray-700 rounded px-2 py-1"
              >
                Insert into recap
              </button>
            </div>
          ))}
      </aside>
    </div>
  )
}

function ToolbarBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-mono px-2 py-1 rounded bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800"
    >
      {label}
    </button>
  )
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}
