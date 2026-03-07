export default function LeagueExplainer() {
  return (
    <section className="border-t border-dashed border-gray-800 pt-10">
      {/* Card */}
      <div className="rounded-xl border border-gray-800 bg-[#111] px-6 py-8 sm:px-10 space-y-8 text-sm leading-relaxed">

        {/* ── What Is a 13 Run League? ── */}
        <div>
          <h2 className="text-2xl font-black mb-4">
            What Is a <span className="text-[#39ff14]">13 Run League</span>?
          </h2>
          <p className="text-gray-300 mb-3">
            Baseball players are a superstitious lot. And no number carries more superstition than{' '}
            <span className="text-[#39ff14] font-bold">13</span>. A 13 Run League is a baseball pool
            built around that number. Thirty people each &ldquo;buy&rdquo; one MLB team for the season.
            If your team scores exactly 13 runs in any game, you win the pot for that week. If multiple
            teams hit 13, you split it. If nobody hits 13, the pot rolls over. And grows.
          </p>
          <p className="text-gray-300">
            That&rsquo;s it. No messing around with fantasy lineups. No trades. No spreadsheets.
            No overthinking. Just baseball, luck, and the cosmic weirdness of a team landing on exactly{' '}
            <span className="text-[#39ff14] font-bold">13</span>.
          </p>
        </div>

        {/* ── How a Week Works ── */}
        <div>
          <h3 className="text-base font-bold text-white mb-3 uppercase tracking-widest text-xs text-gray-500">
            How a Week Works
          </h3>
          <ul className="space-y-2 text-gray-300">
            {[
              'Sunday–Saturday is one league week',
              'Each member has one MLB team',
              'If your team scores exactly 13 runs, you win',
              'If multiple teams hit 13, you split',
              'If nobody hits 13, the pot rolls over',
              'Some weeks get big. Really big.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[#39ff14] mt-0.5 shrink-0">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── What Makes It Fun ── */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            What Makes It Fun
          </h3>
          <ul className="space-y-2 text-gray-300">
            {[
              "You don't need to watch every pitch. You don't have to watch at all.",
              'A random Tuesday blowout can change your whole week',
              'Every league develops its own mythology: heartbreak teams, cursed players, dynasty builders',
              'The number 13 becomes the only reason you scan the boxscores',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[#39ff14] mt-0.5 shrink-0">▸</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Divider ── */}
        <hr className="border-gray-800" />

        {/* ── Origin Story + Why This Site ── */}
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              The South Brooklyn Origin Story
            </h3>
            <p className="text-gray-300">
              The modern era of our 13 Run League started in 2018 in South Brooklyn. Thirty friends,
              $10 a week, and a simple rule: celebrate the weirdest outcome in baseball. Eight seasons
              later, it&rsquo;s a full statistical universe — streaks, heartbreaks, dynasty arcs, and a
              running history of every 13-run game.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Why This Site Exists
            </h3>
            <p className="text-gray-300 mb-3">13runleague.com automates the whole thing:</p>
            <ul className="space-y-1.5 text-gray-400 text-xs">
              {[
                'Live probabilities for every MLB game based on 16 million plate appearances since 1901',
                'Alerts when a team is "on deck"',
                'Instant notifications for 13s and heartbreaks',
                'Full history, stats, and lore',
                'Tools for commissioners to run their own league',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#39ff14] shrink-0">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-gray-500 text-xs mt-4">
              It&rsquo;s the easiest way to run a 13 Run League — or just follow the chaos.
            </p>
          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-gray-700 text-xs pt-2 border-t border-gray-900">
          Built with love in South Brooklyn.{' '}
          <span className="text-gray-800">As always, no wagering, please.</span>
        </p>

      </div>
    </section>
  )
}
