export const metadata = {
  title: 'Privacy Policy — 13 Run League',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        <header>
          <a href="/" className="text-gray-400 text-sm hover:text-gray-400 transition-colors">
            ← 13 Run League
          </a>
          <h1 className="text-3xl font-black mt-4">
            Privacy <span className="text-[#39ff14]">Policy</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: March 2026</p>
        </header>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base mb-2">Overview</h2>
            <p>
              13runleague.com is operated by Red Crow Labs. This policy describes what information
              we collect, how we use it, and your rights regarding that information.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">Information We Collect</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>League member names (provided by the commissioner)</li>
              <li>Email addresses and phone numbers (optional, for notifications)</li>
              <li>Payment status records (internal league tracking only)</li>
              <li>Usage data via standard web server logs (IP address, browser type, pages visited)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>To operate and display league standings and statistics</li>
              <li>To send game alerts and payment reminders (only if you opt in)</li>
              <li>To maintain historical records of league results</li>
              <li>We do not sell, share, or rent your personal information to third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">Data Storage</h2>
            <p className="text-gray-400">
              Member data is stored securely via Supabase (hosted on AWS infrastructure).
              We retain league records indefinitely for historical purposes. You may request
              deletion of your personal information by contacting the commissioner.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">Cookies</h2>
            <p className="text-gray-400">
              We use a single session cookie to maintain your league login. No third-party
              tracking or advertising cookies are used on this site.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">Third-Party Services</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              <li>MLB Stats API — live game data (no personal data shared)</li>
              <li>Retrosheet — historical game data (no personal data shared)</li>
              <li>Vercel — hosting and deployment</li>
              <li>Resend — transactional email (only if notifications are enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">Contact</h2>
            <p className="text-gray-400">
              Questions about this policy? Contact the league commissioner directly.
            </p>
          </section>

        </div>

        <footer className="border-t border-gray-900 pt-6 text-gray-400 text-xs flex gap-4">
          <a href="/" className="hover:text-gray-500">Home</a>
          <span>·</span>
          <a href="/terms" className="hover:text-gray-500">Terms of Use</a>
        </footer>

      </div>
    </main>
  )
}
