'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, InvoiceStatus, ExtractedInvoice } from '@/lib/types'
import { updateInvoiceStatus, deleteInvoice } from '@/app/actions/invoices'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceUpload } from './InvoiceUpload'

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: 'text-ink/40',
  sent: 'text-gold',
  paid: 'text-green',
  overdue: 'text-orange',
  cancelled: 'text-ink/30 line-through',
}

const FILTERS: { value: 'all' | InvoiceStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

function formatDateBroad(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase().replace(/\./g, '')
}

interface Props {
  invoices: Invoice[]
  nextNumber: string
}

export function InvoiceWorkbench({ invoices, nextNumber }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all')
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [prefill, setPrefill] = useState<ExtractedInvoice | null>(null)

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

  function handleExtracted(data: ExtractedInvoice) {
    setPrefill(data)
    setComposing(true)
  }

  function closeForm() {
    setComposing(false)
    setEditing(null)
    setPrefill(null)
    router.refresh()
  }

  // ===========================================================
  // FORM MODE — replaces table inline (no modal overlay)
  // ===========================================================
  if (composing || editing) {
    return (
      <InvoiceForm
        invoice={editing ?? undefined}
        nextNumber={nextNumber}
        prefill={prefill}
        onClose={closeForm}
      />
    )
  }

  // ===========================================================
  // TABLE MODE — broadsheet ledger view
  // ===========================================================
  return (
    <>
      {/* Composition strip — drop zone + new button, side by side */}
      <section className="pt-10 pb-8 grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 md:col-span-8">
          <InvoiceUpload onExtracted={handleExtracted} />
        </div>
        <div className="col-span-12 md:col-span-4 flex items-center md:justify-end">
          <button
            onClick={() => setComposing(true)}
            className="font-display text-[12px] tracking-[0.18em] uppercase text-ink hover:text-gold transition-colors flex items-baseline gap-2"
          >
            <span className="text-gold text-[16px] leading-none">＋</span>
            Compose Invoice by Hand
          </button>
        </div>
      </section>

      {/* Filter wire strip */}
      <div className="rule-top rule-bottom py-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="font-meta text-[10px] tracking-[0.25em] text-ink/40">Filter</span>
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`font-meta text-[10px] tracking-[0.22em] uppercase transition-colors ${
                active ? 'text-ink border-b border-gold pb-0.5' : 'text-ink/40 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Broadsheet table */}
      <section className="pt-2 pb-12">
        <div className="hidden md:grid grid-cols-[100px_1fr_140px_120px_140px_120px] gap-4 py-3 rule-bottom">
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">№</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Client / Description</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Due</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45">Status</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Amount</span>
          <span className="font-meta text-[9px] tracking-[0.22em] text-ink/45 text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center font-body text-[16px] italic text-ink/40">
            {filter === 'all'
              ? 'No invoices on file. Drop a PDF above or compose one by hand.'
              : `No ${filter} invoices on file.`}
          </p>
        ) : (
          filtered.map((inv) => (
            <article
              key={inv.id}
              className="grid grid-cols-2 md:grid-cols-[100px_1fr_140px_120px_140px_120px] gap-4 py-4 rule-bottom-faint items-baseline"
            >
              <span className="font-display text-[15px] tracking-[0.08em] tabular-nums">
                {inv.invoice_number}
              </span>
              <div className="col-span-2 md:col-span-1 row-start-2 md:row-start-auto">
                <p className="font-body text-[15px] text-ink leading-snug">{inv.client_name}</p>
                {inv.description && (
                  <p className="font-body text-[12px] text-ink/45 italic mt-0.5">
                    {inv.description}
                  </p>
                )}
              </div>
              <span className="font-meta text-[10px] tracking-[0.18em] text-ink/55 tabular-nums">
                {formatDateBroad(inv.due_date)}
              </span>
              <span className={`font-meta text-[10px] tracking-[0.22em] ${STATUS_COLOR[inv.status]}`}>
                {STATUS_LABEL[inv.status]}
              </span>
              <span className="font-display text-[18px] tracking-tight tabular-nums text-right md:col-start-5">
                {fmt(Number(inv.total))}
              </span>
              <div className="md:col-start-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 justify-end">
                {inv.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(inv.id, 'sent')}
                    disabled={isPending}
                    className="font-meta text-[9px] tracking-[0.2em] text-gold hover:text-ink transition-colors uppercase"
                  >
                    Send
                  </button>
                )}
                {(inv.status === 'sent' || inv.status === 'overdue') && (
                  <button
                    onClick={() => handleStatusChange(inv.id, 'paid')}
                    disabled={isPending}
                    className="font-meta text-[9px] tracking-[0.2em] text-green hover:text-ink transition-colors uppercase"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => setEditing(inv)}
                  className="font-meta text-[10px] tracking-[0.2em] text-ink/55 hover:text-ink transition-colors uppercase"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(inv.id, inv.invoice_number)}
                  disabled={isPending}
                  className="font-meta text-[10px] tracking-[0.2em] text-orange/70 hover:text-orange transition-colors uppercase"
                  title={`Delete invoice ${inv.invoice_number}`}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  )
}
