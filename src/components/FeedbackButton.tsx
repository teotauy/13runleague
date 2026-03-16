'use client'

import { useState, useRef } from 'react'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [memberName, setMemberName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function openModal() {
    setOpen(true)
    setSuccess(false)
    setMessage('')
    setMemberName('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  function closeModal() {
    if (loading) return
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          member_name: memberName || null,
          page_url: window.location.href,
        }),
      })

      if (!res.ok) throw new Error('Failed to submit')

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setMessage('')
        setMemberName('')
      }, 2000)
    } catch {
      // keep modal open so user can retry
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={openModal}
        aria-label="Report a bug or share feedback"
        className="fixed bottom-20 right-4 z-[60] flex items-center justify-center w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white shadow-lg hover:border-[#39ff14] transition-colors"
      >
        💬
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
            {/* Close button */}
            <button
              onClick={closeModal}
              disabled={loading}
              aria-label="Close"
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
            >
              ✕
            </button>

            {success ? (
              <div className="py-8 text-center">
                <p className="text-xl font-bold text-[#39ff14]">Thanks! We&apos;ll look into it. 🙏</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold mb-5 pr-6">Report a bug or share feedback</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What&apos;s going on?"
                      required
                      minLength={10}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-[#39ff14] transition-colors"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="Your name (optional)"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#39ff14] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || message.trim().length < 10}
                    className="w-full bg-[#39ff14] text-black font-bold py-2.5 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending…' : 'Send Feedback'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
