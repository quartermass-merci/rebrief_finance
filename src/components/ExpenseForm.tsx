'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, updateExpense } from '@/app/actions/expenses'
import type { Expense } from '@/lib/types'
import { EXPENSE_CATEGORIES } from '@/lib/types'

const inputClass =
  'w-full px-3 py-2 border border-rebrief-cream rounded-sm text-sm bg-rebrief-light/50 focus:outline-none focus:border-rebrief-gold focus:ring-1 focus:ring-rebrief-gold'
const labelClass = 'block text-[10px] font-medium text-rebrief-dark/50 mb-1 uppercase tracking-wider'

interface Props {
  expense?: Expense
  onClose: () => void
}

export function ExpenseForm({ expense, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

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
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-rebrief-dark/40">
      <div className="bg-white border border-rebrief-cream rounded-sm w-full max-w-lg shadow-lg">
        <div className="px-6 py-4 border-b border-rebrief-cream flex items-center justify-between">
          <h2 className="font-display text-lg tracking-wide uppercase">
            {expense ? 'Edit Expense' : 'New Expense'}
          </h2>
          <button onClick={onClose} className="text-rebrief-dark/30 hover:text-rebrief-dark text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Vendor</label>
              <input name="vendor" defaultValue={expense?.vendor || ''} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" defaultValue={expense?.category || 'other'} required className={inputClass}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <input name="description" defaultValue={expense?.description || ''} required className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Amount ($)</label>
              <input name="amount" type="number" step="0.01" defaultValue={expense?.amount || ''} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>HST ($)</label>
              <input name="tax_amount" type="number" step="0.01" defaultValue={expense?.tax_amount || 0} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input name="expense_date" type="date" defaultValue={expense?.expense_date || new Date().toISOString().split('T')[0]} required className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Receipt URL</label>
            <input name="receipt_url" type="url" defaultValue={expense?.receipt_url || ''} placeholder="https://..." className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" rows={2} defaultValue={expense?.notes || ''} className={inputClass} />
          </div>

          {error && <p className="text-sm text-rebrief-red">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs uppercase tracking-wider text-rebrief-dark/50 hover:text-rebrief-dark transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-rebrief-dark text-rebrief-light text-xs font-medium tracking-wider uppercase rounded-sm hover:bg-rebrief-gold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
