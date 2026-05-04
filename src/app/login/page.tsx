'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../actions/auth'

// A small library of editorial epigraphs in the brand voice — one shows
// per page load. Rewards repeat visits with new ones to find.
const EPIGRAPHS = [
  'Every entry is a small act of faith.',
  'Receipts before remembrances.',
  'Show your math. Then show it again.',
  'The ledger keeps no secrets — only records.',
  'An honest column of figures is the prettiest paragraph.',
  'Money, like type, must be set with care.',
  'If it isn’t on paper, it didn’t happen.',
  'In treasury, there is no draft mode.',
  'Sum twice. File once.',
  'Books are never closed; they’re only being read.',
]

const ROMAN_YEARS: Record<number, string> = {
  2024: 'MMXXIV',
  2025: 'MMXXV',
  2026: 'MMXXVI',
  2027: 'MMXXVII',
  2028: 'MMXXVIII',
  2029: 'MMXXIX',
  2030: 'MMXXX',
}

function todayWire() {
  const d = new Date()
  const day = d.toLocaleDateString('en-CA', { weekday: 'long' }).toUpperCase()
  const month = d.toLocaleDateString('en-CA', { month: 'long' }).toUpperCase()
  const date = d.getDate()
  const year = d.getFullYear()
  const roman = ROMAN_YEARS[year] || String(year)
  return { day, month, date, roman }
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Random epigraph selected once per page load — different each visit.
  const epigraph = useMemo(() => EPIGRAPHS[Math.floor(Math.random() * EPIGRAPHS.length)], [])
  const today = useMemo(todayWire, [])

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
      {/* Top wire strip — masthead lockup */}
      <header className="rule-bottom px-6 md:px-10 py-3 entry entry-1">
        <p className="font-display text-[14px] md:text-[17px] tracking-[0.18em] uppercase text-ink/70">
          Rebrief <span className="text-gold mx-1">·</span> Treasury
        </p>
      </header>

      {/* CP wire ticker — today's date and location, like a real broadsheet */}
      <div className="rule-bottom-faint px-6 md:px-10 py-2 entry entry-2">
        <p className="font-meta text-[10px] md:text-[11px] tracking-[0.25em] text-ink/50 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{today.day}</span>
          <span className="text-gold">·</span>
          <span>{today.date} {today.month} {today.roman}</span>
          <span className="text-gold">·</span>
          <span>Tkaronto</span>
          <span className="text-gold">·</span>
          <span>43°38′N 79°25′W</span>
          <span className="text-gold">·</span>
          <span className="text-gold">CP-WIRE</span>
        </p>
      </div>

      {/* The cover */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-16">
            <p className="font-meta text-[10px] md:text-[11px] tracking-[0.3em] text-gold mb-6 entry entry-3">
              {today.roman} <span className="text-ink/40 mx-1">·</span> A Closed Ledger
            </p>
            <h1
              className="font-display tracking-tight leading-[0.92] mb-7 entry entry-4"
              style={{ fontSize: 'clamp(60px, 13vw, 156px)' }}
            >
              Treasury
            </h1>
            <div className="flex items-center justify-center gap-4 entry entry-5">
              <span className="h-px w-12 bg-rule" />
              <p className="font-meta text-[11px] md:text-[12px] tracking-[0.28em] text-ink/55">
                Rebrief Magazine Society
              </p>
              <span className="h-px w-12 bg-rule" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto entry entry-6">
            <label className="block mb-1">
              <span className="block font-meta text-[10px] md:text-[11px] tracking-[0.22em] text-ink/50 mb-2">
                Password
              </span>
              <input
                id="password"
                name="password"
                type="password"
                autoFocus
                required
                className="input-ruled font-body text-[18px] md:text-[20px] tracking-[0.05em] py-3"
                placeholder="•••••••••••••••"
              />
            </label>

            {error && (
              <p className="mt-3 font-meta text-[10px] tracking-[0.22em] text-orange uppercase">
                {error}
              </p>
            )}

            <div className="mt-10 flex items-baseline justify-between gap-6 flex-wrap">
              <p className="font-body italic text-ink/55 max-w-xs leading-snug" style={{ fontSize: '0.95em' }}>
                {loading ? 'Verifying…' : `“${epigraph}”`}
              </p>
              <button
                type="submit"
                disabled={loading}
                className="btn-rebrief-primary disabled:opacity-50"
              >
                {loading ? 'Opening…' : 'Open the Ledger'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Colophon */}
      <footer className="rule-top px-6 md:px-10 py-5 entry entry-7">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="font-meta text-[10px] tracking-[0.25em] text-ink/40 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Rebrief Magazine</span>
            <span className="text-gold">·</span>
            <span>Imprinted Tkaronto</span>
            <span className="text-gold">·</span>
            <span>Registered Non-Profit · Ontario</span>
          </p>
          <p className="font-meta text-[10px] tracking-[0.25em] text-ink/30">
            Vol. I <span className="text-gold mx-1">·</span> Iss. 01
          </p>
        </div>
      </footer>
    </div>
  )
}
