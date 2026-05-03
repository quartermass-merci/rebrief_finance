'use client'

import { useState } from 'react'

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
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export function LedgerView({ entries }: { entries: LedgerEntry[] }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = entries.filter((e) => {
    if (dateFrom && e.entry_date < dateFrom) return false
    if (dateTo && e.entry_date > dateTo) return false
    return true
  })

  const reversed = [...filtered].reverse()

  function exportCSV() {
    const headers = ['Date', 'Type', 'Reference', 'Description', 'Amount', 'Running Balance']
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
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-rebrief-dark/40">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 border border-rebrief-cream rounded-sm text-xs bg-white focus:outline-none focus:border-rebrief-gold"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-rebrief-dark/40">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 border border-rebrief-cream rounded-sm text-xs bg-white focus:outline-none focus:border-rebrief-gold"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-[10px] uppercase tracking-wider text-rebrief-dark/30 hover:text-rebrief-dark"
          >
            Clear
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={exportCSV}
          className="px-3 py-1.5 border border-rebrief-cream text-xs uppercase tracking-wider
                     text-rebrief-dark/50 hover:text-rebrief-dark hover:border-rebrief-dark/20 rounded-sm transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-rebrief-cream rounded-sm overflow-hidden">
        <div className="grid grid-cols-[100px_70px_1fr_120px_120px] gap-0 px-5 py-2.5 border-b border-rebrief-cream bg-rebrief-cream/30">
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Date</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Type</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Description</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta text-right">Amount</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta text-right">Balance</span>
        </div>

        {reversed.length === 0 ? (
          <p className="px-5 py-8 text-sm text-rebrief-dark/30 text-center">
            No ledger entries. Paid invoices and expenses will appear here.
          </p>
        ) : (
          reversed.map((entry) => (
            <div
              key={entry.id + entry.type}
              className={`grid grid-cols-[100px_70px_1fr_120px_120px] gap-0 px-5 py-3 border-b border-rebrief-cream/40 items-center ${
                entry.type === 'income' ? 'bg-emerald-50/30' : 'bg-rebrief-red/[0.02]'
              }`}
            >
              <span className="text-xs text-rebrief-dark/50 tabular-nums">{entry.entry_date}</span>
              <span className={`text-[10px] uppercase tracking-wider ${
                entry.type === 'income' ? 'text-emerald-600' : 'text-rebrief-dark/40'
              }`}>
                {entry.type === 'income' ? 'In' : 'Out'}
              </span>
              <div className="min-w-0">
                <p className="text-sm truncate">{entry.description}</p>
                <p className="text-[10px] text-rebrief-dark/30 uppercase tracking-wider">{entry.reference}</p>
              </div>
              <span className={`text-sm font-medium tabular-nums text-right ${
                entry.type === 'income' ? 'text-emerald-700' : 'text-rebrief-dark/70'
              }`}>
                {entry.type === 'income' ? '+' : ''}{fmt(entry.amount)}
              </span>
              <span className={`text-sm tabular-nums text-right font-medium ${
                entry.running_balance >= 0 ? 'text-rebrief-gold' : 'text-rebrief-red'
              }`}>
                {fmt(entry.running_balance)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
