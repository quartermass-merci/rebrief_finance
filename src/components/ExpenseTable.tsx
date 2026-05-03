'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Expense, ExpenseCategory } from '@/lib/types'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import { deleteExpense } from '@/app/actions/expenses'
import { ExpenseForm } from './ExpenseForm'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
) as Record<ExpenseCategory, string>

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [catFilter, setCatFilter] = useState<string>('all')

  const categories = Array.from(new Set(expenses.map((e) => e.category))).sort()
  const filtered = catFilter === 'all' ? expenses : expenses.filter((e) => e.category === catFilter)

  function handleDelete(id: string, desc: string) {
    if (!confirm(`Delete expense "${desc}"?`)) return
    startTransition(async () => {
      await deleteExpense(id)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-rebrief-dark text-rebrief-light text-xs font-medium
                     tracking-wider uppercase rounded-sm hover:bg-rebrief-gold transition-colors"
        >
          + New Expense
        </button>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 border border-rebrief-cream rounded-sm text-xs bg-white
                     focus:outline-none focus:border-rebrief-gold"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-rebrief-cream rounded-sm overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_140px_120px_100px_80px] gap-0 px-5 py-2.5 border-b border-rebrief-cream bg-rebrief-cream/30">
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Date</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Description</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Category</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Vendor</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta text-right">Amount</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-rebrief-dark/30 text-center">No expenses recorded.</p>
        ) : (
          filtered.map((exp) => (
            <div
              key={exp.id}
              className="grid grid-cols-[100px_1fr_140px_120px_100px_80px] gap-0 px-5 py-3 border-b border-rebrief-cream/40 items-center hover:bg-rebrief-cream/10 transition-colors"
            >
              <span className="text-xs text-rebrief-dark/50 tabular-nums">{exp.expense_date}</span>
              <div className="min-w-0">
                <p className="text-sm truncate">{exp.description}</p>
                {exp.notes && <p className="text-[11px] text-rebrief-dark/40 truncate">{exp.notes}</p>}
              </div>
              <span className="text-xs text-rebrief-dark/50">{CATEGORY_LABELS[exp.category] || exp.category}</span>
              <span className="text-xs text-rebrief-dark/50 truncate">{exp.vendor || '—'}</span>
              <span className="text-sm font-medium tabular-nums text-right">{fmt(Number(exp.total))}</span>
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => setEditing(exp)}
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-rebrief-dark/40 hover:text-rebrief-dark hover:bg-rebrief-cream/30 rounded-sm transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(exp.id, exp.description)}
                  disabled={isPending}
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-rebrief-dark/20 hover:text-rebrief-red rounded-sm transition-colors"
                >
                  Del
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && <ExpenseForm onClose={() => { setShowForm(false); router.refresh() }} />}
      {editing && <ExpenseForm expense={editing} onClose={() => { setEditing(null); router.refresh() }} />}
    </>
  )
}
