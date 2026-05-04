'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, updateInvoice, deleteInvoice } from '@/app/actions/invoices'
import type { Invoice, LineItem, ExtractedInvoice } from '@/lib/types'

interface Props {
  invoice?: Invoice
  nextNumber?: string
  prefill?: ExtractedInvoice | null
  onClose: () => void
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export function InvoiceForm({ invoice, nextNumber, prefill, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  // Rebrief is a non-profit under the $50K Small Supplier threshold and
  // is NOT HST-registered, so invoices issued by Rebrief charge no tax by
  // default. Only set this above 0 if Rebrief has voluntarily registered
  // for HST (then 13 for Ontario), or if the prefill came from a vendor's
  // invoice that legitimately shows tax.
  const [taxRate, setTaxRate] = useState<number>(invoice?.tax_rate ?? prefill?.tax_rate ?? 0)

  const initialLineItems: LineItem[] = invoice?.line_items?.length
    ? invoice.line_items
    : prefill?.line_items?.length
      ? prefill.line_items
      : [{ description: '', quantity: 1, rate: 0, amount: 0 }]

  const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems)

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((s, item) => s + (item.amount || 0), 0)
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100
    return { subtotal, tax, total }
  }, [lineItems, taxRate])

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
    formData.set('tax_rate', String(taxRate))

    startTransition(async () => {
      try {
        if (invoice) {
          await updateInvoice(invoice.id, formData)
        } else {
          await createInvoice(formData)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  async function handleDelete() {
    if (!invoice) return
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return

    startTransition(async () => {
      try {
        await deleteInvoice(invoice.id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete')
      }
    })
  }

  const isEditing = !!invoice
  const titleText = isEditing ? 'Editing' : prefill ? 'Reviewing' : 'Composing'

  return (
    <form onSubmit={handleSubmit}>
      {/* Header strip — broadsheet section banner */}
      <section className="pt-10 pb-6 rule-bottom flex flex-wrap items-baseline justify-between gap-y-3">
        <div>
          <p className="font-meta text-[10px] tracking-[0.25em] text-gold mb-2">
            {titleText} · {prefill && !isEditing ? 'Auto-Filled From PDF' : 'Manual Entry'}
          </p>
          <h2 className="font-display text-[44px] md:text-[64px] leading-[0.92] tracking-tight">
            {isEditing ? `Invoice ${invoice.invoice_number}` : 'New Invoice'}
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
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="font-meta text-[10px] tracking-[0.22em] text-orange/70 hover:text-orange transition-colors uppercase disabled:opacity-50"
            >
              Delete Invoice
            </button>
          )}
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
        {/* LEFT — invoice fields, broadsheet column */}
        <div className="col-span-12 md:col-span-8 space-y-10">
          {/* Identity row */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6">
            <Field label="Invoice №">
              <input
                name="invoice_number"
                defaultValue={invoice?.invoice_number || prefill?.invoice_number || nextNumber}
                required
                className="input-ruled font-display tracking-[0.08em] uppercase"
              />
            </Field>
            <Field label="Status">
              {isEditing ? (
                <select
                  name="status"
                  defaultValue={invoice.status}
                  className="input-ruled"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <input value="Draft" disabled className="input-ruled opacity-50" />
              )}
            </Field>
          </div>

          {/* Parties block */}
          <div>
            <h3 className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-4">
              Billed To
            </h3>
            <div className="space-y-5">
              <Field label="Client Name" full>
                <input
                  name="client_name"
                  defaultValue={invoice?.client_name || prefill?.client_name || ''}
                  required
                  className="input-ruled font-body text-[16px]"
                />
              </Field>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Email">
                  <input
                    name="client_email"
                    type="email"
                    defaultValue={invoice?.client_email || prefill?.client_email || ''}
                    className="input-ruled"
                    placeholder="optional"
                  />
                </Field>
                <Field label="Address">
                  <input
                    name="client_address"
                    defaultValue={invoice?.client_address || prefill?.client_address || ''}
                    className="input-ruled"
                    placeholder="optional"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Description */}
          <Field label="Subject" full>
            <input
              name="description"
              defaultValue={invoice?.description || prefill?.description || ''}
              className="input-ruled"
              placeholder="e.g., Sponsorship — Issue 01"
            />
          </Field>

          {/* Dates row */}
          <div>
            <h3 className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-4">
              Dates
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <Field label="Issued">
                <input
                  name="issued_date"
                  type="date"
                  defaultValue={invoice?.issued_date || prefill?.issued_date || new Date().toISOString().split('T')[0]}
                  className="input-ruled tabular-nums"
                />
              </Field>
              <Field label="Due">
                <input
                  name="due_date"
                  type="date"
                  defaultValue={invoice?.due_date || prefill?.due_date || ''}
                  className="input-ruled tabular-nums"
                />
              </Field>
              {invoice?.status === 'paid' && (
                <Field label="Paid">
                  <input
                    name="paid_date"
                    type="date"
                    defaultValue={invoice?.paid_date || ''}
                    className="input-ruled tabular-nums"
                  />
                </Field>
              )}
            </div>
          </div>

          {/* Line items — broadsheet table inside the form */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-meta text-[10px] tracking-[0.25em] text-ink/45">
                Line Items
              </h3>
              <button
                type="button"
                onClick={addLineItem}
                className="font-meta text-[10px] tracking-[0.22em] text-gold hover:text-ink transition-colors"
              >
                ＋ Add Line
              </button>
            </div>

            <div className="rule-top rule-bottom">
              <div className="hidden md:grid grid-cols-[1fr_70px_100px_100px_24px] gap-3 py-2 rule-bottom-faint">
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Description</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Qty</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Rate</span>
                <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Amount</span>
                <span />
              </div>

              {lineItems.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_70px_100px_100px_24px] gap-3 py-2 items-baseline rule-bottom-faint last:border-b-0"
                >
                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    placeholder="Service rendered"
                    className="bg-transparent border-0 outline-none font-body text-[14px] py-1 focus:bg-paper-shade/40"
                  />
                  <input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                    className="bg-transparent border-0 outline-none font-body text-[14px] tabular-nums py-1 focus:bg-paper-shade/40"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.rate || ''}
                    onChange={(e) => updateLineItem(i, 'rate', e.target.value)}
                    className="bg-transparent border-0 outline-none font-body text-[14px] tabular-nums py-1 focus:bg-paper-shade/40"
                  />
                  <span className="font-display text-[15px] tabular-nums text-right tracking-tight pt-1">
                    {item.amount ? fmt(item.amount) : '—'}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      className="text-ink/25 hover:text-orange text-lg leading-none"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes & Payment Terms" full>
            <textarea
              name="notes"
              rows={3}
              defaultValue={invoice?.notes || ''}
              className="input-ruled resize-none"
              placeholder="e.g., Net 30. Cheques payable to Rebrief Magazine."
            />
          </Field>

          {error && (
            <p className="font-meta text-[11px] tracking-[0.15em] text-orange uppercase">
              {error}
            </p>
          )}
        </div>

        {/* RIGHT — running totals, marginalia */}
        <aside className="col-span-12 md:col-span-4 md:pl-8 md:border-l md:border-rule">
          <div className="md:sticky md:top-24">
            <h3 className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-6">
              Running Total
            </h3>

            <dl className="space-y-4">
              <Row label="Subtotal" value={fmt(totals.subtotal)} />
              <Row
                label={
                  <span className="flex items-baseline gap-2">
                    <span>Tax</span>
                    <input
                      type="number"
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-12 bg-transparent border-0 border-b border-rule outline-none focus:border-gold text-[12px] tabular-nums px-1 text-right"
                    />
                    <span className="text-ink/40">%</span>
                  </span>
                }
                value={fmt(totals.tax)}
              />
              {taxRate === 0 && (
                <p className="font-body italic text-ink/50 leading-snug -mt-2" style={{ fontSize: '0.85em' }}>
                  Rebrief is not HST-registered (Small Supplier). No tax collected.
                </p>
              )}
              <div className="rule-top pt-4 mt-2">
                <p className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-1">
                  Total Due
                </p>
                <p className="font-display text-[44px] tabular-nums leading-none tracking-tight">
                  {fmt(totals.total)}
                </p>
                <p className="font-meta text-[9px] tracking-[0.22em] text-ink/40 mt-2">CAD</p>
              </div>
            </dl>

            {prefill && (
              <p className="mt-8 pt-6 rule-top font-body text-[12px] italic text-ink/55 leading-relaxed">
                Auto-filled from the dropped PDF. Review every field before filing — Claude is
                accurate, not infallible.
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

function Row({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-baseline justify-between rule-bottom-faint pb-3">
      <dt className="font-meta text-[10px] tracking-[0.22em] text-ink/55 uppercase">{label}</dt>
      <dd className="font-display text-[18px] tabular-nums tracking-tight">{value}</dd>
    </div>
  )
}
