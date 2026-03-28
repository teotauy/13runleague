import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'
import AddToHomeScreenBanner from '@/components/AddToHomeScreenBanner'
import GlobalSeasonBanner from '@/components/GlobalSeasonBanner'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://13runleague.com'),
  title: '13 Run League | A Forced Baseball Empathy Experiment',
  description:
    'Track which MLB teams are most likely to score exactly 13 runs today.',
  robots: { index: true, follow: true },
  openGraph: {
    title: '13 Run League | A Forced Baseball Empathy Experiment',
    description:
      'Track which MLB teams are most likely to score exactly 13 runs today.',
    url: 'https://13runleague.com',
    siteName: '13 Run League',
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: '13 Run League — A Forced Baseball Empathy Experiment',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: '13 Run League | A Forced Baseball Empathy Experiment',
    description:
      'Track which MLB teams are most likely to score exactly 13 runs today.',
    images: ['/api/og'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#39ff14" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="13 Run League" />
        <meta name='impact-site-verification' content='b1aaba6e-2bb6-4334-a9d3-162e3fcbecbf' />
      </head>
      <body className={`${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}>
        <GlobalSeasonBanner />
        {children}
        <AddToHomeScreenBanner />
        <footer className="w-full border-t border-white/5 py-4 px-4 text-center text-xs text-gray-600">
          © 2025–2026 Red Crow Labs. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
