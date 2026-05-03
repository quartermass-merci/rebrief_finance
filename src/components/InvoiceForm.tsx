'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, updateInvoice } from '@/app/actions/invoices'
import type { Invoice, LineItem } from '@/lib/types'

const inputClass =
  'w-full px-3 py-2 border border-rebrief-cream rounded-sm text-sm bg-rebrief-light/50 focus:outline-none focus:border-rebrief-gold focus:ring-1 focus:ring-rebrief-gold'
const labelClass = 'block text-[10px] font-medium text-rebrief-dark/50 mb-1 uppercase tracking-wider'

interface Props {
  invoice?: Invoice
  nextNumber?: string
  onClose: () => void
}

export function InvoiceForm({ invoice, nextNumber, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice?.line_items?.length
      ? invoice.line_items
      : [{ description: '', quantity: 1, rate: 0, amount: 0 }]
  )

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }

      if (field === 'description') {
        item.description = value
      } else {
        const num = parseFloat(value) || 0
        if (field === 'quantity') item.quantity = num
        if (field === 'rate') item.rate = num
        if (field === 'amount') item.amount = num
      }

      if (field === 'quantity' || field === 'rate') {
        item.amount = Math.round(item.quantity * item.rate * 100) / 100
      }

      updated[index] = item
      return updated
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('line_items', JSON.stringify(lineItems))

    startTransition(async () => {
      try {
        if (invoice) {
          await updateInvoice(invoice.id, formData)
        } else {
          await createInvoice(formData)
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
      <div className="bg-white border border-rebrief-cream rounded-sm w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-lg">
        <div className="px-6 py-4 border-b border-rebrief-cream flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-display text-lg tracking-wide uppercase">
            {invoice ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button onClick={onClose} className="text-rebrief-dark/30 hover:text-rebrief-dark text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input name="invoice_number" defaultValue={invoice?.invoice_number || nextNumber} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              {invoice ? (
                <select name="status" defaultValue={invoice.status} className={inputClass}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <input value="Draft" disabled className={inputClass + ' opacity-50'} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client Name</label>
              <input name="client_name" defaultValue={invoice?.client_name || ''} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Client Email</label>
              <input name="client_email" type="email" defaultValue={invoice?.client_email || ''} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Client Address</label>
            <input name="client_address" defaultValue={invoice?.client_address || ''} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <input name="description" defaultValue={invoice?.description || ''} className={inputClass} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Issue Date</label>
              <input name="issued_date" type="date" defaultValue={invoice?.issued_date || new Date().toISOString().split('T')[0]} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input name="due_date" type="date" defaultValue={invoice?.due_date || ''} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>HST Rate (%)</label>
              <input name="tax_rate" type="number" step="0.01" defaultValue={invoice?.tax_rate ?? 13} className={inputClass} />
            </div>
          </div>

          {invoice?.status === 'paid' && (
            <div>
              <label className={labelClass}>Date Paid</label>
              <input name="paid_date" type="date" defaultValue={invoice?.paid_date || ''} className={inputClass} />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass + ' mb-0'}>Line Items</label>
              <button type="button" onClick={addLineItem} className="text-xs text-rebrief-gold hover:text-rebrief-dark transition-colors">
                + Add Row
              </button>
            </div>
            <div className="border border-rebrief-cream rounded-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-0 bg-rebrief-cream/50 px-3 py-1.5">
                <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40">Description</span>
                <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40">Qty</span>
                <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40">Rate</span>
                <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40">Amount</span>
                <span />
              </div>
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-0 border-t border-rebrief-cream/60">
                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    placeholder="Service description"
                    className="px-3 py-2 text-sm border-none focus:outline-none bg-transparent"
                  />
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                    className="px-3 py-2 text-sm border-none focus:outline-none bg-transparent tabular-nums"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.rate || ''}
                    onChange={(e) => updateLineItem(i, 'rate', e.target.value)}
                    className="px-3 py-2 text-sm border-none focus:outline-none bg-transparent tabular-nums"
                  />
                  <span className="px-3 py-2 text-sm tabular-nums text-rebrief-dark/60">
                    ${item.amount.toFixed(2)}
                  </span>
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(i)} className="text-rebrief-dark/20 hover:text-rebrief-red text-sm">
                      &times;
                    </button>
                  )}
                </div>
              ))}
              <div className="border-t border-rebrief-cream px-3 py-2 text-right text-sm tabular-nums">
                <span className="text-rebrief-dark/40 mr-3">Subtotal:</span>
                <span className="font-medium">
                  ${lineItems.reduce((s, item) => s + item.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes / Payment Terms</label>
            <textarea name="notes" rows={2} defaultValue={invoice?.notes || ''} className={inputClass} />
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
              {isPending ? 'Saving...' : invoice ? 'Update' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
