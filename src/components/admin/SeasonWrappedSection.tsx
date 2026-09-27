'use client'

import { useEffect, useState } from 'react'
import {
  listSeasonWrappedMembers,
  previewSeasonWrappedEmail,
  sendSeasonWrappedEmails,
} from '@/lib/seasonWrappedActions'

interface Props {
  leagueSlug: string
  recapCapabilityToken: string
  defaultSeasonYear: number
}

export default function SeasonWrappedSection({
  leagueSlug,
  recapCapabilityToken,
  defaultSeasonYear,
}: Props) {
  const [seasonYear, setSeasonYear] = useState(defaultSeasonYear)
  const [members, setMembers] = useState<
    { id: string; name: string; email: string | null; hasEmail: boolean }[]
  >([])
  const [memberId, setMemberId] = useState('')
  const [commissionerNote, setCommissionerNote] = useState(
    `What a season. Draft Day is February 13 — hit I'm in and Venmo next year's buy-in when you're ready.`
  )
  const [subjectLine, setSubjectLine] = useState('')
  const [nextSeasonBuyIn, setNextSeasonBuyIn] = useState(280)
  const [venmoConfigured, setVenmoConfigured] = useState(false)

  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [previewMemberName, setPreviewMemberName] = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sendSummary, setSendSummary] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setListStatus('loading')
      setErrorMsg('')
      try {
        const r = await listSeasonWrappedMembers(leagueSlug, recapCapabilityToken, seasonYear)
        if (cancelled) return
        if (!r.ok) {
          setListStatus('error')
          setErrorMsg(r.error)
          return
        }
        setMembers(r.members)
        setNextSeasonBuyIn(r.nextSeasonBuyIn)
        setVenmoConfigured(r.venmoConfigured)
        if (!memberId || !r.members.some((m) => m.id === memberId)) {
          setMemberId(r.members[0]?.id ?? '')
        }
        setListStatus('ready')
      } catch (e) {
        if (!cancelled) {
          setListStatus('error')
          setErrorMsg(e instanceof Error ? e.message : 'Failed to load members')
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when year/slug/token change; memberId intentionally omitted
  }, [leagueSlug, recapCapabilityToken, seasonYear])

  async function refreshPreview() {
    if (!memberId) {
      setErrorMsg('Pick a member to preview')
      setPreviewStatus('error')
      return
    }
    setPreviewStatus('loading')
    setErrorMsg('')
    try {
      const r = await previewSeasonWrappedEmail(leagueSlug, recapCapabilityToken, memberId, {
        seasonYear,
        commissionerNote,
        subjectLine,
      })
      if (!r.ok) throw new Error(r.error)
      setPreviewHtml(r.html)
      setPreviewSubject(r.subjectLine)
      setPreviewMemberName(r.memberName)
      setNextSeasonBuyIn(r.nextSeasonBuyIn)
      setVenmoConfigured(r.venmoConfigured)
      setPreviewStatus('ready')
    } catch (e) {
      setPreviewStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Preview failed')
    }
  }

  async function handleSendAll() {
    const withEmail = members.filter((m) => m.hasEmail).length
    if (
      !confirm(
        `Send personalized ${seasonYear} Season Wrapped to ${withEmail} owners?\n\nEach email is unique (their team + RSVP links).\nOnly Colby should click this after reading a preview.`
      )
    ) {
      return
    }
    if (previewStatus !== 'ready') {
      await refreshPreview()
    }
    setSendStatus('sending')
    setErrorMsg('')
    setSendSummary('')
    try {
      const r = await sendSeasonWrappedEmails(leagueSlug, recapCapabilityToken, {
        seasonYear,
        commissionerNote,
        subjectLine,
      })
      if (!r.ok) throw new Error(r.error)
      setSendStatus('sent')
      setSendSummary(`Sent ${r.sent}${r.failed ? ` · ${r.failed} failed` : ''}`)
      if (r.errors.length) setErrorMsg(r.errors.slice(0, 5).join('\n'))
    } catch (e) {
      setSendStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Send failed')
    }
  }

  async function handleSendOne() {
    if (!memberId) return
    const name = members.find((m) => m.id === memberId)?.name ?? 'this owner'
    if (
      !confirm(
        `Send ${seasonYear} Season Wrapped to ${name} only?\n\nOnly Colby should click this after reading the preview.`
      )
    ) {
      return
    }
    setSendStatus('sending')
    setErrorMsg('')
    setSendSummary('')
    try {
      const r = await sendSeasonWrappedEmails(leagueSlug, recapCapabilityToken, {
        seasonYear,
        commissionerNote,
        subjectLine,
        memberIds: [memberId],
      })
      if (!r.ok) throw new Error(r.error)
      setSendStatus('sent')
      setSendSummary(`Sent ${r.sent} to ${name}${r.failed ? ` · ${r.failed} failed` : ''}`)
      if (r.errors.length) setErrorMsg(r.errors.join('\n'))
    } catch (e) {
      setSendStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Send failed')
    }
  }

  const emailReady = members.filter((m) => m.hasEmail).length

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Spotify Wrapped-style end-of-season email: league highlights + that owner&apos;s team stats,
        plus one-click RSVP (writes <span className="font-mono text-gray-400">pre_season_returning</span>)
        and Venmo pay for next year&apos;s{' '}
        <span className="text-gray-300 font-mono">${nextSeasonBuyIn}</span>. Preview only until you
        explicitly send — never auto-sends.
      </p>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Season year</label>
          <input
            type="number"
            value={seasonYear}
            onChange={(e) => setSeasonYear(parseInt(e.target.value, 10) || defaultSeasonYear)}
            className="w-28 px-3 py-1.5 rounded border border-gray-700 bg-[#0a0a0a] text-gray-200 text-sm outline-none focus:border-[#39ff14]/50"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs text-gray-500 mb-1">Preview as owner</label>
          <select
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value)
              setPreviewStatus('idle')
              setPreviewHtml(null)
            }}
            disabled={listStatus !== 'ready'}
            className="w-full px-3 py-1.5 rounded border border-gray-700 bg-[#0a0a0a] text-gray-200 text-sm outline-none focus:border-[#39ff14]/50"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {!m.hasEmail ? ' (no email)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-500 font-mono pb-2">
          {listStatus === 'loading' ? 'Loading…' : `${emailReady} with email`}
          {' · '}
          {venmoConfigured ? (
            <span className="text-[#39ff14]">Venmo link on</span>
          ) : (
            <span className="text-amber-400">set NEXT_PUBLIC_VENMO_USERNAME</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Subject line</label>
        <input
          type="text"
          value={subjectLine}
          onChange={(e) => setSubjectLine(e.target.value)}
          placeholder={`Your ${seasonYear} Season Wrapped — 13 Run League`}
          className="w-full px-3 py-1.5 rounded border border-gray-700 bg-[#0a0a0a] text-gray-200 text-sm outline-none focus:border-[#39ff14]/50"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Commissioner note (plain text)</label>
        <textarea
          value={commissionerNote}
          onChange={(e) => setCommissionerNote(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded border border-gray-700 bg-[#0a0a0a] text-gray-200 text-sm outline-none focus:border-[#39ff14]/50"
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={refreshPreview}
          disabled={previewStatus === 'loading' || !memberId}
          className="text-sm text-gray-300 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
        >
          {previewStatus === 'loading' ? 'Rendering…' : 'Refresh preview'}
        </button>
        {previewStatus === 'ready' && sendStatus !== 'sent' && (
          <>
            <button
              type="button"
              onClick={handleSendOne}
              disabled={sendStatus === 'sending'}
              className="text-sm font-bold border border-[#39ff14]/40 text-[#39ff14] px-4 py-1.5 rounded disabled:opacity-40 hover:bg-[#39ff14]/10 transition-colors"
            >
              {sendStatus === 'sending' ? 'Sending…' : 'Send to this owner'}
            </button>
            <button
              type="button"
              onClick={handleSendAll}
              disabled={sendStatus === 'sending'}
              className="text-sm font-bold bg-[#39ff14] text-black px-4 py-1.5 rounded disabled:opacity-40 hover:bg-[#2ecc10] transition-colors"
            >
              {sendStatus === 'sending' ? 'Sending…' : `Send all (${emailReady})`}
            </button>
          </>
        )}
        {sendStatus === 'sent' && (
          <span className="text-[#39ff14] text-sm font-mono">{sendSummary || 'Sent ✓'}</span>
        )}
      </div>

      {(previewStatus === 'error' || sendStatus === 'error' || listStatus === 'error') && errorMsg && (
        <div className="text-red-400 text-xs font-mono bg-red-950/30 border border-red-900 rounded p-2 whitespace-pre-wrap">
          {errorMsg}
        </div>
      )}

      <p className="text-xs text-gray-600">
        Read every pixel before you send. RSVP links write to Pre-Season Status. Paid stays
        commissioner-marked after Venmo lands.
      </p>

      {previewHtml && (
        <div className="border border-gray-800 rounded overflow-hidden">
          <div className="bg-[#111] border-b border-gray-800 p-3 space-y-1.5">
            <div className="text-xs text-gray-500 font-mono">
              Email preview — {previewMemberName} · {seasonYear} Wrapped
            </div>
            {previewSubject && (
              <div className="text-xs text-gray-400 font-mono">
                Subject: <span className="text-gray-200">{previewSubject}</span>
              </div>
            )}
          </div>
          <iframe
            srcDoc={previewHtml}
            className="w-full bg-white"
            style={{ height: '720px' }}
            sandbox="allow-same-origin"
            title="Season Wrapped preview"
          />
        </div>
      )}
    </div>
  )
}
