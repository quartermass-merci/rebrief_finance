'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Expense, ExpenseCategory, ExtractedExpense } from '@/lib/types'
import { EXPENSE_CATEGORIES } from '@/lib/types'
import { deleteExpense } from '@/app/actions/expenses'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseUpload } from './ExpenseUpload'

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
  const [prefill, setPrefill] = useState<ExtractedExpense | null>(null)
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

  function handleExtracted(data: ExtractedExpense) {
    setPrefill(data)
    setComposing(true)
  }

  function closeForm() {
    setComposing(false)
    setEditing(null)
    setPrefill(null)
    router.refresh()
  }

  if (composing || editing) {
    return <ExpenseForm expense={editing ?? undefined} prefill={prefill} onClose={closeForm} />
  }

  return (
    <>
      {/* Composition strip — drop receipt + record button */}
      <section className="pt-10 pb-8 grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 md:col-span-8">
          <ExpenseUpload onExtracted={handleExtracted} />
        </div>
        <div className="col-span-12 md:col-span-4 flex items-center md:justify-end gap-6">
          <button
            onClick={() => setComposing(true)}
            className="font-display text-[12px] tracking-[0.18em] uppercase text-ink hover:text-gold transition-colors flex items-baseline gap-2"
          >
            <span className="text-gold text-[16px] leading-none">＋</span>
            Record by Hand
          </button>
        </div>
      </section>

      {/* Filter strip */}
      <div className="rule-top rule-bottom py-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="font-meta text-[10px] tracking-[0.25em] text-ink/45">Category</span>
        <button
          onClick={() => setCatFilter('all')}
          className={`font-meta text-[10px] tracking-[0.22em] uppercase transition-colors ${
            catFilter === 'all' ? 'text-ink border-b border-gold pb-0.5' : 'text-ink/40 hover:text-ink'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={`font-meta text-[10px] tracking-[0.22em] uppercase transition-colors ${
              catFilter === c ? 'text-ink border-b border-gold pb-0.5' : 'text-ink/40 hover:text-ink'
            }`}
          >
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* Broadsheet table */}
      <section className="pt-2 pb-12">
        <div className="hidden md:grid grid-cols-[100px_1fr_140px_140px_120px_120px] gap-4 py-3 rule-bottom">
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Date</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Description</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Vendor</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Category</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Amount</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center font-body italic text-ink/40">
            {catFilter === 'all'
              ? 'No expenses recorded. Drop a receipt above or record one by hand.'
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
                <p className="font-body text-ink leading-snug">{exp.description}</p>
                {exp.notes && (
                  <p className="font-body italic text-ink/45 mt-0.5" style={{ fontSize: '0.85em' }}>
                    {exp.notes}
                  </p>
                )}
              </div>
              <span className="font-body text-ink/65" style={{ fontSize: '0.9em' }}>{exp.vendor || '—'}</span>
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
