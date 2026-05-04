import { supabase } from '@/lib/supabase'
import type { Invoice } from '@/lib/types'
import { SectionHead } from '@/components/SectionHead'
import { InvoiceWorkbench } from '@/components/InvoiceWorkbench'

export const dynamic = 'force-dynamic'

async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

async function getNextNumber(): Promise<string> {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)

  if (data && data.length > 0) {
    const last = data[0].invoice_number
    const match = last.match(/(\d+)$/)
    if (match) {
      const next = String(parseInt(match[1], 10) + 1).padStart(3, '0')
      return `INV-${next}`
    }
  }
  return 'INV-001'
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export default async function InvoicesPage() {
  const [invoices, nextNumber] = await Promise.all([getInvoices(), getNextNumber()])

  const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue')
  const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.total), 0)
  const drafts = invoices.filter((i) => i.status === 'draft')
  const paid = invoices.filter((i) => i.status === 'paid')

  return (
    <>
      <SectionHead
        eyebrow="MMXXVI · The Treasury"
        title="Invoices"
        marginalia={
          <div className="font-meta text-[10px] tracking-[0.22em] text-ink/50 leading-relaxed space-y-1">
            <p>
              <span className="text-gold">{drafts.length}</span> draft{drafts.length !== 1 ? 's' : ''}
              <span className="mx-2 text-ink/30">·</span>
              <span className="text-gold">{outstanding.length}</span> outstanding
              <span className="mx-2 text-ink/30">·</span>
              <span className="text-gold">{paid.length}</span> paid
            </p>
            <p className="text-ink tracking-[0.2em]">
              Outstanding <span className="text-gold">·</span>{' '}
              <span className="font-display text-[16px] tabular-nums">{fmt(totalOutstanding)}</span>
            </p>
          </div>
        }
      />

      <InvoiceWorkbench invoices={invoices} nextNumber={nextNumber} />
    </>
  )
}
