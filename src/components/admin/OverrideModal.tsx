'use client'

import { useState } from 'react'

interface OverrideModalProps {
  memberId: string
  memberName: string
  weekNumber: number
  currentStatus: 'unpaid' | '50%' | 'paid'
  currentNote: string | null
  leagueSlug: string
  onClose: () => void
  onSuccess: () => void
}

const OVERRIDE_REASONS = [
  { value: '', label: 'Choose reason...' },
  { value: 'cash', label: 'Cash at bar' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'check', label: 'Check' },
  { value: 'waived', label: 'Waived' },
  { value: 'partial', label: 'Partial payment' },
  { value: 'other', label: 'Other' },
]

export default function OverrideModal({
  memberId,
  memberName,
  weekNumber,
  currentStatus,
  currentNote,
  leagueSlug,
  onClose,
  onSuccess,
}: OverrideModalProps) {
  const [status, setStatus] = useState<'unpaid' | '50%' | 'paid'>(currentStatus)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState(currentNote || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/league/${leagueSlug}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          week_number: weekNumber,
          payment_status: status,
          override_note: note.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save override')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
      <div className="bg-[#111] border border-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-white mb-4">
          Override Payment: {memberName} (Week {weekNumber})
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Status */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Payment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded bg-[#0a0a0a] border border-gray-800 text-white focus:border-[#39ff14] focus:outline-none transition-colors"
            >
              <option value="unpaid">Unpaid</option>
              <option value="50%">50% Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Reason (Optional)</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#0a0a0a] border border-gray-800 text-white focus:border-[#39ff14] focus:outline-none transition-colors"
            >
              {OVERRIDE_REASONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Notes</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Venmo @colby on Friday, paid check, waived due to injury..."
              className="w-full px-3 py-2 rounded bg-[#0a0a0a] border border-gray-800 text-white placeholder-gray-600 focus:border-[#39ff14] focus:outline-none transition-colors resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">{note.length} / 500 characters</p>
          </div>

          {/* Error Message */}
          {error && <div className="p-3 rounded bg-red-950 border border-red-800 text-red-400 text-sm">{error}</div>}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded bg-[#39ff14] text-black font-bold hover:bg-[#2de010] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
