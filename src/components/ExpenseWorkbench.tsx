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

function formatDateBroad(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase().replace(/\./g, '')
}

export function ExpenseWorkbench({ expenses }: { expenses: Expense[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [catFilter, setCatFilter] = useState<string>('all')

  const categories = Array.from(new Set(expenses.map((e) => e.category))).sort()
  const filtered = catFilter === 'all' ? expenses : expenses.filter((e) => e.category === catFilter)

  function handleDelete(id: string, desc: string) {
    if (!confirm(`Strike "${desc}" from the ledger? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteExpense(id)
      router.refresh()
    })
  }

  function closeForm() {
    setComposing(false)
    setEditing(null)
    router.refresh()
  }

  if (composing || editing) {
    return <ExpenseForm expense={editing ?? undefined} onClose={closeForm} />
  }

  return (
    <>
      {/* Composition strip */}
      <section className="pt-10 pb-6 flex flex-wrap items-baseline justify-between gap-4">
        <button
          onClick={() => setComposing(true)}
          className="font-display text-[14px] tracking-[0.18em] uppercase text-ink hover:text-gold transition-colors flex items-baseline gap-2"
        >
          <span className="text-gold text-[18px] leading-none">＋</span>
          Record an Expense
        </button>

        <div className="flex items-baseline gap-3">
          <label className="font-meta text-[10px] tracking-[0.22em] text-ink/45">Category</label>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-transparent border-0 border-b border-rule outline-none focus:border-gold font-body text-[13px] tracking-[0.05em] py-1 pr-4"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Broadsheet table */}
      <section className="pb-12">
        <div className="hidden md:grid grid-cols-[100px_1fr_140px_140px_120px_120px] gap-4 py-3 rule-top rule-bottom">
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Date</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Description</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Vendor</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Category</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Amount</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center font-body text-[16px] italic text-ink/40">
            {catFilter === 'all'
              ? 'No expenses recorded. The press, the photographers, the print run — file each one as it comes.'
              : `No expenses recorded in ${CATEGORY_LABELS[catFilter as ExpenseCategory] || catFilter}.`}
          </p>
        ) : (
          filtered.map((exp) => (
            <article
              key={exp.id}
              className="grid grid-cols-2 md:grid-cols-[100px_1fr_140px_140px_120px_120px] gap-4 py-4 rule-bottom-faint items-baseline"
            >
              <time className="font-meta text-[10px] tracking-[0.18em] text-ink/55 tabular-nums">
                {formatDateBroad(exp.expense_date)}
              </time>
              <div className="col-span-2 md:col-span-1 row-start-2 md:row-start-auto">
                <p className="font-body text-[15px] text-ink leading-snug">{exp.description}</p>
                {exp.notes && (
                  <p className="font-body text-[12px] text-ink/45 italic mt-0.5">
                    {exp.notes}
                  </p>
                )}
              </div>
              <span className="font-body text-[13px] text-ink/65">{exp.vendor || '—'}</span>
              <span className="font-meta text-[10px] tracking-[0.22em] text-ink/55">
                {CATEGORY_LABELS[exp.category] || exp.category}
              </span>
              <span className="font-display text-[18px] text-orange tabular-nums tracking-tight text-right md:col-start-5">
                −{fmt(Number(exp.total))}
              </span>
              <div className="md:col-start-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 justify-end">
                {exp.receipt_url && (
                  <a
                    href={exp.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-meta text-[9px] tracking-[0.2em] text-gold hover:text-ink transition-colors uppercase"
                  >
                    Receipt ↗
                  </a>
                )}
                <button
                  onClick={() => setEditing(exp)}
                  className="font-meta text-[9px] tracking-[0.2em] text-ink/50 hover:text-ink transition-colors uppercase"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(exp.id, exp.description)}
                  disabled={isPending}
                  className="font-meta text-[9px] tracking-[0.2em] text-ink/30 hover:text-orange transition-colors uppercase"
                >
                  Strike
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  )
}
