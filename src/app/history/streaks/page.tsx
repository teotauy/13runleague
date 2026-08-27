import type { Metadata } from 'next'
import Link from 'next/link'
import ConsecutiveDaysExplorer from '@/components/ConsecutiveDaysExplorer'
import SiteFooter from '@/components/SiteFooter'
import { baseballToday } from '@/lib/mlb'

export const revalidate = 3600

const ogUrl =
  '/api/og?title=' +
  encodeURIComponent('Consecutive 13-run days') +
  '&subtitle=' +
  encodeURIComponent('The longest streak is 5 days. It has never been 6.')

export const metadata: Metadata = {
  title: 'Consecutive 13-Run Days — 13 Run League',
  description:
    'How often has MLB had 3 consecutive days with a 13-run game? Has it ever been 4? The record is 5 — and it has never been 6.',
  openGraph: {
    title: 'Consecutive 13-Run Days — 13 Run League',
    description: 'The longest streak of days with a 13-run game is 5. It has never been 6.',
    url: 'https://13runleague.com/history/streaks',
    images: [{ url: ogUrl, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Consecutive 13-Run Days — 13 Run League',
    description: 'The longest streak of days with a 13-run game is 5. It has never been 6.',
    images: [ogUrl],
  },
}

export default function ConsecutiveStreaksPage() {
  const today = baseballToday()

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <header>
          <Link href="/history" className="text-gray-400 text-sm hover:text-white mb-4 inline-block">
            ← 13-Run History
          </Link>
          <h1 className="text-4xl font-black">
            Consecutive <span className="text-[#39ff14]">13</span>-run days
          </h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            How often does a team score exactly 13, then another one the next day, then another the day after that?
          </p>
        </header>

        <ConsecutiveDaysExplorer today={today} />

        <SiteFooter extraLinks={[{ label: '← 13-Run History', href: '/history' }]} showHistoricalNote />
      </div>
    </main>
  )
}
