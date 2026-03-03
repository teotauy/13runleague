import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://13runleague.com'),
  title: '13 Run League — MLB Probability Dashboard',
  description:
    'Live probability engine for the 13 Run League. Track which MLB teams are most likely to score exactly 13 runs today.',
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  openGraph: {
    title: '13 Run League — MLB Probability Dashboard',
    description:
      'Live probability engine for the 13 Run League. Track which MLB teams are most likely to score exactly 13 runs today.',
    url: 'https://13runleague.com',
    siteName: '13 Run League',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: '13 Run League - MLB Probability Dashboard',
        type: 'image/svg+xml',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: '13 Run League — MLB Probability Dashboard',
    description:
      'Track which MLB teams are most likely to score exactly 13 runs today.',
    images: ['/og-image.svg'],
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
      </head>
      <body className={`${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}>
        {children}
      </body>
    </html>
  )
}
