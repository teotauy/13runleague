import Link from 'next/link'

interface SiteFooterProps {
  /** Extra nav links shown before the standard ones (e.g. ← All Teams on team pages) */
  extraLinks?: Array<{ label: string; href: string }>
  /** Show "Historical records may be incomplete for pre-1920 seasons" note */
  showHistoricalNote?: boolean
}

export default function SiteFooter({ extraLinks, showHistoricalNote }: SiteFooterProps) {
  return (
    <footer className="border-t border-gray-900 pt-6 text-gray-600 text-xs space-y-3">

      {/* Retrosheet attribution — 9.4 */}
      <p>
        The information used here was obtained free of charge from and is copyrighted by{' '}
        <a
          href="https://www.retrosheet.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-400 transition-colors"
        >
          Retrosheet
        </a>
        . Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
      </p>

      {showHistoricalNote && (
        <p className="text-gray-700">
          Historical records may be incomplete for pre-1920 seasons.
        </p>
      )}

      {/* 9.6 — Legal / MLB disclaimer */}
      <p className="text-gray-700">
        Not affiliated with MLB or any MLB team · Live data via MLB Stats API ·
        Probabilities are estimates, not gambling advice.
      </p>

      {/* 9.6 — Tagline */}
      <p className="text-gray-700 italic">
        As always, no wagering, please.
      </p>

      {/* Links row */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center pt-1">
        {extraLinks?.map((link) => (
          <span key={link.href} className="flex items-center gap-4">
            <Link href={link.href} className="hover:text-gray-400 transition-colors">
              {link.label}
            </Link>
            <span className="text-gray-800">·</span>
          </span>
        ))}

        <a
          href="https://buymeacoffee.com/colbyblack"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-500 hover:text-yellow-400 transition-colors"
        >
          ☕ Buy me a coffee
        </a>
        <span className="text-gray-800">·</span>
        <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
        <span className="text-gray-800">·</span>
        <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
        <span className="text-gray-800">·</span>
        {/* 9.6 — Red Crow Labs */}
        <a
          href="https://redcrowlabs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400 transition-colors"
        >
          Built by Red Crow Labs
        </a>
        <span className="text-gray-800">·</span>
        <span className="text-gray-700">South Brooklyn · Est. 2018</span>
      </div>
    </footer>
  )
}
