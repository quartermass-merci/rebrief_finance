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
    <div className="min-h-screen flex items-center justify-center bg-rebrief-light px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <img
            src="/rebrief-masthead.svg"
            alt="Rebrief"
            className="h-8 opacity-80"
          />
        </div>

        <div className="bg-white border border-rebrief-cream rounded-sm p-8 shadow-sm">
          <p className="font-meta text-[10px] tracking-[0.2em] uppercase text-rebrief-gold mb-6 text-center">
            Financial Dashboard
          </p>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-rebrief-dark/60 mb-2 uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              required
              className="w-full px-3 py-2.5 border border-rebrief-cream rounded-sm text-sm
                         focus:outline-none focus:border-rebrief-gold focus:ring-1 focus:ring-rebrief-gold
                         bg-rebrief-light/50 placeholder:text-rebrief-dark/30"
              placeholder="Enter dashboard password"
            />

            {error && (
              <p className="mt-2 text-xs text-rebrief-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full py-2.5 bg-rebrief-dark text-rebrief-light text-sm font-medium
                         tracking-wider uppercase rounded-sm
                         hover:bg-rebrief-gold transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] text-rebrief-dark/30 font-meta tracking-wider uppercase">
          Rebrief Magazine &middot; Registered Non-Profit &middot; Ontario
        </p>
      </div>
    </div>
  )
}
