'use client'

import { useState, useMemo } from 'react'

interface LedgerEntry {
  id: string
  type: 'income' | 'expense'
  reference: string
  description: string
  amount: number
  entry_date: string
  running_balance: number
}

function fmt(n: number) {
  const abs = Math.abs(n)
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(abs)
}

function formatDateBroad(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-CA', { day: '2-digit', month: 'short' })
    .toUpperCase().replace(/\./g, '')
}

function getYear(iso: string): number {
  if (!iso) return 0
  return parseInt(iso.split('-')[0], 10)
}

const ROMAN_YEARS: Record<number, string> = {
  2024: 'MMXXIV',
  2025: 'MMXXV',
  2026: 'MMXXVI',
  2027: 'MMXXVII',
  2028: 'MMXXVIII',
  2029: 'MMXXIX',
  2030: 'MMXXX',
}

export function LedgerView({ entries }: { entries: LedgerEntry[] }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (dateFrom && e.entry_date < dateFrom) return false
      if (dateTo && e.entry_date > dateTo) return false
      return true
    })
  }, [entries, dateFrom, dateTo])

  // Reverse chronological for display, but group by year
  const grouped = useMemo(() => {
    const reversed = [...filtered].reverse()
    const groups: { year: number; entries: LedgerEntry[] }[] = []
    let currentYear = -1
    for (const entry of reversed) {
      const y = getYear(entry.entry_date)
      if (y !== currentYear) {
        groups.push({ year: y, entries: [entry] })
        currentYear = y
      } else {
        groups[groups.length - 1].entries.push(entry)
      }
    }
    return groups
  }, [filtered])

  function exportCSV() {
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Amount CAD', 'Running Balance CAD']
    const rows = filtered.map((e) => [
      e.entry_date,
      e.type,
      e.reference,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      e.running_balance.toFixed(2),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rebrief-ledger-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Filter strip */}
      <section className="py-5 rule-bottom flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <span className="font-meta text-[10px] tracking-[0.25em] text-ink/45">Filter</span>

        <label className="flex items-baseline gap-2">
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent border-0 border-b border-rule outline-none focus:border-gold font-body text-[13px] tabular-nums py-0.5"
          />
        </label>

        <label className="flex items-baseline gap-2">
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent border-0 border-b border-rule outline-none focus:border-gold font-body text-[13px] tabular-nums py-0.5"
          />
        </label>

        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="font-meta text-[10px] tracking-[0.22em] text-ink/40 hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}

        <span className="ml-auto" />

        <button
          onClick={exportCSV}
          className="font-meta text-[10px] tracking-[0.22em] text-ink hover:text-gold transition-colors flex items-baseline gap-2"
        >
          Export CSV
          <span className="text-gold">↓</span>
        </button>
      </section>

      {/* Broadsheet ledger entries — grouped by year */}
      <section className="pb-10">
        {filtered.length === 0 ? (
          <p className="py-20 text-center font-body text-[16px] italic text-ink/40">
            No entries to strike. Paid invoices and recorded expenses will populate the ledger here.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.year} className="mb-12 last:mb-0">
              {/* Year header — Latin numerals */}
              <header className="py-4 rule-top rule-bottom flex items-baseline justify-between mb-2">
                <h2 className="font-display text-[28px] md:text-[36px] tracking-tight">
                  {ROMAN_YEARS[group.year] || group.year}
                </h2>
                <p className="font-meta text-[10px] tracking-[0.25em] text-ink/45">
                  {group.entries.length} entr{group.entries.length === 1 ? 'y' : 'ies'}
                </p>
              </header>

              {/* Column header */}
              <div className="hidden md:grid grid-cols-[80px_70px_1fr_140px_160px] gap-4 py-2 rule-bottom-faint">
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Date</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Type</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Description</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Amount</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Running Balance</span>
              </div>

              {/* Entries */}
              {group.entries.map((entry) => (
                <article
                  key={entry.id + entry.type}
                  className="grid grid-cols-2 md:grid-cols-[80px_70px_1fr_140px_160px] gap-4 py-3.5 rule-bottom-faint items-baseline"
                >
                  <time className="font-meta text-[10px] tracking-[0.18em] text-ink/55 tabular-nums">
                    {formatDateBroad(entry.entry_date)}
                  </time>
                  <span
                    className={`font-meta text-[9px] tracking-[0.22em] uppercase ${
                      entry.type === 'income' ? 'text-green' : 'text-orange'
                    }`}
                  >
                    {entry.type === 'income' ? 'In' : 'Out'}
                  </span>
                  <div className="col-span-2 md:col-span-1 row-start-2 md:row-start-auto">
                    <p className="font-body text-[14px] text-ink leading-snug">
                      <span className="text-ink/40 mr-2">{entry.reference}</span>
                      {entry.description}
                    </p>
                  </div>
                  <span
                    className={`font-display text-[18px] tabular-nums tracking-tight text-right md:col-start-4 ${
                      entry.type === 'income' ? 'text-green' : 'text-orange'
                    }`}
                  >
                    {entry.type === 'income' ? '+' : '−'}{fmt(entry.amount)}
                  </span>
                  <span
                    className={`font-display text-[18px] tabular-nums tracking-tight text-right md:col-start-5 ${
                      entry.running_balance >= 0 ? 'text-ink' : 'text-orange'
                    }`}
                  >
                    {entry.running_balance < 0 ? '−' : ''}{fmt(entry.running_balance)}
                  </span>
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </>
  )
}
