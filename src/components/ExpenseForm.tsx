'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, updateExpense } from '@/app/actions/expenses'
import type { Expense, ExtractedExpense } from '@/lib/types'
import { EXPENSE_CATEGORIES } from '@/lib/types'

interface Props {
  expense?: Expense
  prefill?: ExtractedExpense | null
  onClose: () => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export function ExpenseForm({ expense, prefill, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [amount, setAmount] = useState<number>(
    expense?.amount ?? prefill?.amount ?? 0
  )
  const [taxAmount, setTaxAmount] = useState<number>(
    expense?.tax_amount ?? prefill?.tax_amount ?? 0
  )

  const total = useMemo(() => Math.round((amount + taxAmount) * 100) / 100, [amount, taxAmount])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (expense) {
          await updateExpense(expense.id, formData)
        } else {
          await createExpense(formData)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const isEditing = !!expense
  const titleText = isEditing ? 'Editing' : prefill ? 'Reviewing' : 'Composing'

  return (
    <form onSubmit={handleSubmit}>
      <section className="pt-10 pb-6 rule-bottom flex flex-wrap items-baseline justify-between gap-y-3">
        <div>
          <p className="font-meta text-[10px] tracking-[0.25em] text-gold mb-2">
            {titleText} · {prefill && !isEditing ? 'Auto-Filled From Receipt' : 'Manual Entry'}
          </p>
          <h2 className="font-display text-[44px] md:text-[64px] leading-[0.92] tracking-tight">
            {isEditing ? 'Expense Entry' : 'New Expense'}
          </h2>
        </div>
        <div className="flex items-baseline gap-6">
          <button
            type="button"
            onClick={onClose}
            className="font-meta text-[10px] tracking-[0.22em] text-ink/40 hover:text-ink transition-colors"
          >
            ‹ Back to Ledger
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn-rebrief-primary disabled:opacity-50"
          >
            {isPending ? 'Filing...' : isEditing ? 'Save Changes' : 'File to Ledger'}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-x-8 gap-y-10 pt-10 pb-10">
        <div className="col-span-12 md:col-span-8 space-y-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Vendor">
              <input
                name="vendor"
                defaultValue={expense?.vendor || prefill?.vendor || ''}
                className="input-ruled"
                placeholder="Whose receipt is this?"
              />
            </Field>
            <Field label="Category">
              <select
                name="category"
                defaultValue={expense?.category || prefill?.category || 'other'}
                required
                className="input-ruled"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description" full>
            <input
              name="description"
              defaultValue={expense?.description || prefill?.description || ''}
              required
              className="input-ruled font-body text-[16px]"
              placeholder="What was bought?"
            />
          </Field>

          <div className="grid grid-cols-3 gap-x-6 gap-y-5">
            <Field label="Amount Paid">
              <input
                name="amount"
                type="number"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="input-ruled tabular-nums"
              />
            </Field>
            <Field label="HST Paid">
              <input
                name="tax_amount"
                type="number"
                step="0.01"
                value={taxAmount || ''}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                className="input-ruled tabular-nums"
              />
            </Field>
            <Field label="Date">
              <input
                name="expense_date"
                type="date"
                defaultValue={expense?.expense_date || prefill?.expense_date || new Date().toISOString().split('T')[0]}
                required
                className="input-ruled tabular-nums"
              />
            </Field>
          </div>

          <Field label="Receipt URL" full>
            <input
              name="receipt_url"
              type="url"
              defaultValue={expense?.receipt_url || ''}
              className="input-ruled"
              placeholder="optional — link to scanned receipt or cloud doc"
            />
          </Field>

          <Field label="Notes" full>
            <textarea
              name="notes"
              rows={3}
              defaultValue={expense?.notes || prefill?.notes || ''}
              className="input-ruled resize-none"
              placeholder="optional — any context for the audit trail"
            />
          </Field>

          {error && (
            <p className="font-meta text-[11px] tracking-[0.15em] text-orange uppercase">
              {error}
            </p>
          )}
        </div>

        <aside className="col-span-12 md:col-span-4 md:pl-8 md:border-l md:border-rule">
          <div className="md:sticky md:top-24">
            <h3 className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-6">
              Filing Total
            </h3>

            <dl className="space-y-3">
              <Row label="Amount" value={fmt(amount)} />
              <Row label="HST" value={fmt(taxAmount)} />
              <div className="rule-top pt-4 mt-2">
                <p className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-1">
                  Total Out
                </p>
                <p className="font-display text-[44px] tabular-nums leading-none tracking-tight text-orange">
                  −{fmt(total)}
                </p>
                <p className="font-meta text-[9px] tracking-[0.22em] text-ink/40 mt-2">CAD</p>
              </div>
            </dl>

            {prefill ? (
              <p className="mt-8 pt-6 rule-top font-body italic text-ink/55 leading-relaxed">
                Auto-filled from the dropped receipt. Review every field before filing — Claude
                is accurate, not infallible.
              </p>
            ) : (
              <p className="mt-8 pt-6 rule-top font-body italic text-ink/55 leading-relaxed">
                All entries become part of the running ledger. Strike or edit as needed —
                every change is timestamped.
              </p>
            )}
          </div>
        </aside>
      </div>
    </form>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="block font-meta text-[10px] tracking-[0.22em] text-ink/45 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between rule-bottom-faint pb-3">
      <dt className="font-meta text-[10px] tracking-[0.22em] text-ink/55 uppercase">{label}</dt>
      <dd className="font-display text-[18px] tabular-nums tracking-tight">{value}</dd>
    </div>
  )
}
