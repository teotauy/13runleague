import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '13 Run League — MLB Probability Dashboard',
  description:
    'Live probability engine for the 13 Run League. Track which MLB teams are most likely to score exactly 13 runs today.',
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} antialiased bg-[#0a0a0a] text-white`}>
        {children}
      </body>
    </html>
  )
}
