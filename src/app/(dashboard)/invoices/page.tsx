import { supabase } from '@/lib/supabase'
import type { Invoice } from '@/lib/types'
import { InvoiceTable } from '@/components/InvoiceTable'
import { InvoiceFormWrapper } from '@/components/InvoiceFormWrapper'

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

export default async function InvoicesPage() {
  const [invoices, nextNumber] = await Promise.all([getInvoices(), getNextNumber()])

  const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue')
  const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.total), 0)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-2xl tracking-wide uppercase">Invoices</h1>
        <div className="text-right">
          <p className="text-sm tabular-nums">
            <span className="text-rebrief-dark/40">Outstanding: </span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(totalOutstanding)}
            </span>
          </p>
          <p className="text-[10px] text-rebrief-dark/30 mt-0.5">
            {outstanding.length} invoice{outstanding.length !== 1 ? 's' : ''} pending
          </p>
        </div>
      </div>

      <InvoiceFormWrapper nextNumber={nextNumber} />
      <InvoiceTable invoices={invoices} />
    </div>
  )
}
