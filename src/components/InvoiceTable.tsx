'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, InvoiceStatus } from '@/lib/types'
import { updateInvoiceStatus, deleteInvoice } from '@/app/actions/invoices'
import { InvoiceForm } from './InvoiceForm'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'bg-rebrief-dark/5 text-rebrief-dark/50',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-rebrief-red/10 text-rebrief-red',
  cancelled: 'bg-rebrief-dark/5 text-rebrief-dark/30 line-through',
}

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Invoice | null>(null)

  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateInvoiceStatus(id, status)
      router.refresh()
    })
  }

  function handleDelete(id: string, num: string) {
    if (!confirm(`Delete invoice ${num}? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteInvoice(id)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex gap-1 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-sm transition-colors ${
              filter === f.value
                ? 'bg-rebrief-dark text-rebrief-light'
                : 'text-rebrief-dark/40 hover:text-rebrief-dark hover:bg-rebrief-cream/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-rebrief-cream rounded-sm overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_140px_100px_100px_120px] gap-0 px-5 py-2.5 border-b border-rebrief-cream bg-rebrief-cream/30">
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Number</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Client</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Due</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta">Status</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta text-right">Amount</span>
          <span className="text-[9px] uppercase tracking-wider text-rebrief-dark/40 font-meta text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-rebrief-dark/30 text-center">No invoices found.</p>
        ) : (
          filtered.map((inv) => (
            <div
              key={inv.id}
              className="grid grid-cols-[100px_1fr_140px_100px_100px_120px] gap-0 px-5 py-3 border-b border-rebrief-cream/40 items-center hover:bg-rebrief-cream/10 transition-colors"
            >
              <span className="text-sm font-medium tabular-nums">{inv.invoice_number}</span>
              <div className="min-w-0">
                <p className="text-sm truncate">{inv.client_name}</p>
                {inv.description && <p className="text-[11px] text-rebrief-dark/40 truncate">{inv.description}</p>}
              </div>
              <span className="text-xs text-rebrief-dark/50 tabular-nums">{inv.due_date || '—'}</span>
              <span>
                <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-sm ${STATUS_STYLES[inv.status]}`}>
                  {inv.status}
                </span>
              </span>
              <span className="text-sm font-medium tabular-nums text-right">{fmt(Number(inv.total))}</span>
              <div className="flex gap-1 justify-end">
                {inv.status === 'sent' && (
                  <button
                    onClick={() => handleStatusChange(inv.id, 'paid')}
                    disabled={isPending}
                    className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-600 hover:bg-emerald-50 rounded-sm transition-colors"
                  >
                    Mark Paid
                  </button>
                )}
                {inv.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(inv.id, 'sent')}
                    disabled={isPending}
                    className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-blue-600 hover:bg-blue-50 rounded-sm transition-colors"
                  >
                    Send
                  </button>
                )}
                <button
                  onClick={() => setEditing(inv)}
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-rebrief-dark/40 hover:text-rebrief-dark hover:bg-rebrief-cream/30 rounded-sm transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(inv.id, inv.invoice_number)}
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-rebrief-dark/20 hover:text-rebrief-red rounded-sm transition-colors"
                >
                  Del
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <InvoiceForm
          invoice={editing}
          onClose={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
