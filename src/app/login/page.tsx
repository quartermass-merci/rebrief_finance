'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../actions/auth'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top wire strip */}
      <header className="rule-bottom px-6 md:px-10 py-3">
        <p className="font-display text-[12px] tracking-[0.22em] uppercase text-ink/60">
          Rebrief <span className="text-gold mx-1">·</span> Treasury
        </p>
      </header>

      {/* The cover */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-16">
            <p className="font-meta text-[10px] tracking-[0.3em] text-gold mb-6">
              MMXXVI · A Closed Ledger
            </p>
            <h1
              className="font-display tracking-tight leading-[0.92] mb-6"
              style={{ fontSize: 'clamp(60px, 13vw, 156px)' }}
            >
              Treasury
            </h1>
            <div className="flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-rule" />
              <p className="font-meta text-[10px] tracking-[0.25em] text-ink/55">
                For Treasurers Only
              </p>
              <span className="h-px w-12 bg-rule" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <label className="block mb-1">
              <span className="block font-meta text-[10px] tracking-[0.22em] text-ink/50 mb-2">
                Password
              </span>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                className="input-ruled font-body text-[18px] tracking-[0.05em] py-3"
                placeholder="•••••••••••••••"
              />
            </label>

            {error && (
              <p className="mt-3 font-meta text-[10px] tracking-[0.22em] text-orange uppercase">
                {error}
              </p>
            )}

            <div className="mt-10 flex items-center justify-between">
              <p className="font-body text-[12px] italic text-ink/45">
                {loading ? 'Verifying...' : 'Read by the keeper of the books.'}
              </p>
              <button
                type="submit"
                disabled={loading}
                className="btn-rebrief-primary disabled:opacity-50"
              >
                {loading ? 'Opening...' : 'Open the Ledger'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Colophon */}
      <footer className="rule-top px-6 md:px-10 py-5">
        <p className="font-meta text-[9px] tracking-[0.25em] text-ink/40 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Rebrief Magazine</span>
          <span className="text-gold">·</span>
          <span>Imprinted Tkaronto</span>
          <span className="text-gold">·</span>
          <span>Registered Non-Profit · Ontario</span>
          <span className="text-gold">·</span>
          <span>43°38′N 79°25′W</span>
        </p>
      </footer>
    </div>
  )
}
