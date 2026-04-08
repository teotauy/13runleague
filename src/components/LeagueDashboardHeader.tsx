'use client'

import { useState } from 'react'

interface Props {
  leagueName: string
  slug: string
  role: 'admin' | 'member'
}

export default function LeagueDashboardHeader({ leagueName, slug, role }: Props) {
  const [viewAs, setViewAs] = useState<'admin' | 'member'>(role)
  const showAdminUI = viewAs === 'admin'

  return (
    <header>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-black">
              <span className="text-[#39ff14]">13</span> Run League
            </h1>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded border ${
                showAdminUI
                  ? 'bg-[#39ff14]/10 text-[#39ff14] border-[#39ff14]/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {showAdminUI ? 'admin' : 'member'}
            </span>
          </div>
          <p className="text-gray-400 text-lg mt-1">{leagueName}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {role === 'admin' && (
              <button
                onClick={() => setViewAs(v => v === 'admin' ? 'member' : 'admin')}
                className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 rounded px-2 py-1 transition-colors"
              >
                {showAdminUI ? 'View as Member' : 'View as Admin'}
              </button>
            )}
            <a href="/" className="text-gray-500 text-sm hover:text-gray-300">
              ← Public
            </a>
            <a
              href={`/api/league/${slug}/logout`}
              className="text-sm font-semibold text-red-400/90 hover:text-red-300 border border-red-900/80 hover:border-red-700 rounded-md px-3 py-1 transition-colors"
            >
              Log out
            </a>
          </div>
          {showAdminUI && (
            <div className="flex gap-3">
              <a href={`/league/${slug}/draft`} className="text-gray-600 text-sm hover:text-gray-400">
                Draft Room →
              </a>
              <a href={`/league/${slug}/admin`} className="text-[#39ff14]/70 text-sm hover:text-[#39ff14]">
                Admin Dashboard →
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
