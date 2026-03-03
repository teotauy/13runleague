'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-3xl font-black">
          <span className="text-[#39ff14]">13</span> Run League
        </h1>
        <p className="text-red-400 font-mono text-sm">Server error</p>
        <pre className="text-left bg-[#111] border border-gray-800 rounded p-4 text-xs text-gray-400 overflow-auto max-h-48 whitespace-pre-wrap">
          {error.message}
          {error.digest ? `\n\nDigest: ${error.digest}` : ''}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2de010] transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
