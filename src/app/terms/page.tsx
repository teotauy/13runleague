export const metadata = {
  title: 'Terms of Use — 13 Run League',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">

        <header>
          <a href="/" className="text-gray-600 text-sm hover:text-gray-400 transition-colors">
            ← 13 Run League
          </a>
          <h1 className="text-3xl font-black mt-4">
            Terms <span className="text-[#39ff14]">of Use</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: March 2026</p>
        </header>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Acceptance</h2>
            <p className="text-gray-400">
              By accessing 13runleague.com, you agree to these terms. If you do not agree,
              please do not use the site.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. No Wagering</h2>
            <p className="text-gray-400">
              13 Run League is a social pool operated among friends for entertainment purposes only.
              This site does not facilitate, encourage, or enable gambling or wagering of any kind.
              Participation in any league pool is entirely voluntary and governed by the
              commissioner&rsquo;s rules. No wagering, please.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. Probability Estimates</h2>
            <p className="text-gray-400">
              The probability figures shown on this site are statistical estimates based on
              historical data and mathematical models (Poisson distribution). They are provided
              for informational and entertainment purposes only. They are not predictions,
              guarantees, or advice of any kind. Past performance does not predict future outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Data Accuracy</h2>
            <p className="text-gray-400">
              Historical data is sourced from Retrosheet and the MLB Stats API. While we strive
              for accuracy, we make no warranties about the completeness or correctness of any
              data displayed on this site.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Intellectual Property</h2>
            <p className="text-gray-400">
              The 13 Run League name, site design, and original content are the property of
              Red Crow Labs. Historical baseball data is provided by Retrosheet (retrosheet.org)
              and the MLB Stats API, used under their respective terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Limitation of Liability</h2>
            <p className="text-gray-400">
              13runleague.com and Red Crow Labs are not liable for any damages arising from
              your use of this site, including but not limited to errors in probability
              estimates, data inaccuracies, or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Changes to These Terms</h2>
            <p className="text-gray-400">
              We may update these terms at any time. Continued use of the site after changes
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Contact</h2>
            <p className="text-gray-400">
              Questions? Contact the league commissioner directly.
            </p>
          </section>

        </div>

        <footer className="border-t border-gray-900 pt-6 text-gray-700 text-xs flex gap-4">
          <a href="/" className="hover:text-gray-500">Home</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-gray-500">Privacy Policy</a>
        </footer>

      </div>
    </main>
  )
}
