'use client'

import { useEffect, useState } from 'react'

interface FeedbackRow {
  id: string
  message: string
  page_url: string | null
  member_name: string | null
  created_at: string
}

interface Props {
  leagueSlug: string
}

export default function FeedbackTab({ leagueSlug }: Props) {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/league/${leagueSlug}/feedback`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load feedback')
        return res.json()
      })
      .then((data) => setRows(data.feedback ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [leagueSlug])

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading feedback…</p>
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>
  }

  if (rows.length === 0) {
    return (
      <div className="border border-gray-800 rounded-lg p-6 text-center text-gray-500 text-sm">
        No feedback yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="border border-gray-800 rounded-lg p-4 space-y-1">
          <p className="text-sm text-white leading-relaxed">{row.message}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-2">
            {row.member_name && (
              <span className="text-[#39ff14]">{row.member_name}</span>
            )}
            {row.page_url && (
              <span className="truncate max-w-xs" title={row.page_url}>
                {row.page_url}
              </span>
            )}
            <span>{new Date(row.created_at).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
