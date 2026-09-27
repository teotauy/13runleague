'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  InvoicePreviewHtmlResponse,
  InvoicePreviewListResponse,
} from '@/app/api/league/[slug]/invoice-preview/route'
import type { InvoiceCandidate } from '@/lib/invoiceOwed'

interface Props {
  leagueSlug: string
}

function money(n: number) {
  return `$${n.toLocaleString('en-US')}`
}

export default function InvoicePreviewSection({ leagueSlug }: Props) {
  const [list, setList] = useState<InvoicePreviewListResponse | null>(null)
  const [listStatus, setListStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [listError, setListError] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<InvoicePreviewHtmlResponse | null>(null)
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [previewError, setPreviewError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadList = useCallback(async () => {
    setListStatus('loading')
    setListError('')
    try {
      const res = await fetch(`/api/league/${leagueSlug}/invoice-preview`)
      const data = (await res.json()) as InvoicePreviewListResponse | { ok: false; error: string }
      if (!res.ok || !data.ok) {
        throw new Error(!data.ok ? data.error : 'Failed to load invoices')
      }
      setList(data)
      setListStatus('ready')
      if (data.invoices.length > 0) {
        setSelectedId((prev) => prev ?? data.invoices[0].memberId)
      }
    } catch (e) {
      setListStatus('error')
      setListError(e instanceof Error ? e.message : 'Failed to load')
    }
  }, [leagueSlug])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const loadPreview = useCallback(
    async (memberId: string) => {
      setPreviewStatus('loading')
      setPreviewError('')
      setCopied(false)
      try {
        const params = new URLSearchParams({ memberId })
        if (note.trim()) params.set('note', note.trim())
        const res = await fetch(`/api/league/${leagueSlug}/invoice-preview?${params}`)
        const data = (await res.json()) as InvoicePreviewHtmlResponse | { ok: false; error: string }
        if (!res.ok || !data.ok) {
          throw new Error(!data.ok ? data.error : 'Preview failed')
        }
        setPreview(data)
        setPreviewStatus('ready')
      } catch (e) {
        setPreview(null)
        setPreviewStatus('error')
        setPreviewError(e instanceof Error ? e.message : 'Preview failed')
      }
    },
    [leagueSlug, note]
  )

  useEffect(() => {
    if (selectedId) void loadPreview(selectedId)
  }, [selectedId, loadPreview])

  async function copyHtml() {
    if (!preview?.html) return
    try {
      await navigator.clipboard.writeText(preview.html)
      setCopied(true)
    } catch {
      setPreviewError('Could not copy HTML — select from the preview iframe manually.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200/90">
        <p className="font-bold text-amber-300">Preview only — never sends</p>
        <p className="mt-1 text-amber-200/70">
          Review each invoice, then Colby sends manually after approving every word. This tool has no
          Resend / Twilio / recap send path.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={listStatus === 'loading'}
          className="px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-50"
        >
          {listStatus === 'loading' ? 'Loading…' : 'Refresh from live DB'}
        </button>
        {list && (
          <span className="text-xs text-gray-500 font-mono">
            Season {list.seasonYear} · buy-in {money(list.seasonBuyIn)} ·{' '}
            {list.invoices.length} to invoice · {list.coveredByWins.length} covered by wins ·{' '}
            {list.paidCount} paid / {list.activeMemberCount} active
          </span>
        )}
      </div>

      {listStatus === 'error' && (
        <p className="text-sm text-red-400 font-mono">{listError}</p>
      )}

      {list && list.invoices.length === 0 && listStatus === 'ready' && (
        <p className="text-sm text-gray-400">
          Nobody currently owes after crediting wins
          {list.coveredByWins.length > 0
            ? ` (${list.coveredByWins.length} unpaid but covered by wins — listed below).`
            : '.'}
        </p>
      )}

      {list && list.invoices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Would receive invoice
            </h3>
            <ul className="rounded border border-gray-800 divide-y divide-gray-800 bg-[#0a0a0a]">
              {list.invoices.map((inv) => (
                <li key={inv.memberId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(inv.memberId)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      selectedId === inv.memberId
                        ? 'bg-[#39ff14]/10 text-white'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex justify-between gap-2 items-baseline">
                      <span className="font-semibold text-sm">{inv.memberName}</span>
                      <span className="font-mono text-[#39ff14] text-sm">{money(inv.amountDue)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">
                      owed {money(inv.buyInOwed)} − wins {money(inv.seasonWins)}
                      {!inv.email && <span className="text-amber-500"> · no email</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {list.coveredByWins.length > 0 && (
              <div className="pt-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                  Unpaid but wins cover buy-in (no invoice)
                </h3>
                <ul className="text-xs text-gray-500 space-y-1 font-mono">
                  {list.coveredByWins.map((c) => (
                    <li key={c.memberId}>
                      {c.memberName}: wins {money(c.seasonWins)} ≥ owed {money(c.buyInOwed)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3 min-w-0">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Optional commissioner note (included in preview)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Cash in person next week works too."
                className="w-full px-3 py-2 rounded border border-gray-700 bg-[#0a0a0a] text-gray-200 text-sm outline-none focus:border-[#39ff14]/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedId || previewStatus === 'loading'}
                onClick={() => selectedId && void loadPreview(selectedId)}
                className="px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:text-white disabled:opacity-40"
              >
                {previewStatus === 'loading' ? 'Rendering…' : 'Refresh preview'}
              </button>
              {previewStatus === 'ready' && preview && (
                <button
                  type="button"
                  onClick={() => void copyHtml()}
                  className="px-3 py-1.5 rounded bg-[#39ff14]/15 border border-[#39ff14]/40 text-sm text-[#39ff14] hover:bg-[#39ff14]/25"
                >
                  {copied ? 'HTML copied' : 'Copy HTML'}
                </button>
              )}
            </div>

            {previewStatus === 'error' && (
              <p className="text-sm text-red-400 font-mono">{previewError}</p>
            )}

            {preview && (
              <>
                <p className="text-xs text-gray-500">
                  Subject:{' '}
                  <span className="text-gray-200">{preview.subject}</span>
                  {preview.invoice.email ? (
                    <>
                      {' '}
                      · To: <span className="text-gray-300">{preview.invoice.email}</span>
                    </>
                  ) : (
                    <span className="text-amber-500"> · no email on file</span>
                  )}
                </p>
                <iframe
                  srcDoc={preview.html}
                  className="w-full min-h-[520px] rounded border border-gray-800 bg-[#0f1115]"
                  title="Invoice email preview"
                />
              </>
            )}
          </div>
        </div>
      )}

      {list && list.invoices.length === 0 && list.coveredByWins.length > 0 && (
        <CoveredList rows={list.coveredByWins} />
      )}
    </div>
  )
}

function CoveredList({ rows }: { rows: InvoiceCandidate[] }) {
  return (
    <ul className="text-sm text-gray-500 space-y-1 font-mono">
      {rows.map((c) => (
        <li key={c.memberId}>
          {c.memberName}: wins {money(c.seasonWins)} ≥ owed {money(c.buyInOwed)} — no invoice
        </li>
      ))}
    </ul>
  )
}
