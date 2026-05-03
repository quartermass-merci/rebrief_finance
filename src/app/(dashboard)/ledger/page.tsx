import { supabase } from '@/lib/supabase'
import type { Invoice, Expense } from '@/lib/types'
import { LedgerView } from '@/components/LedgerView'

export const dynamic = 'force-dynamic'

interface LedgerEntry {
  id: string
  type: 'income' | 'expense'
  reference: string
  description: string
  amount: number
  entry_date: string
  running_balance: number
}

async function getLedger(): Promise<LedgerEntry[]> {
  const [invoicesRes, expensesRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('status', 'paid').order('paid_date', { ascending: true }),
    supabase.from('expenses').select('*').order('expense_date', { ascending: true }),
  ])

  const invoices: Invoice[] = invoicesRes.data || []
  const expenses: Expense[] = expensesRes.data || []

  const entries: Omit<LedgerEntry, 'running_balance'>[] = [
    ...invoices.map((i) => ({
      id: i.id,
      type: 'income' as const,
      reference: i.invoice_number,
      description: `${i.client_name}${i.description ? ': ' + i.description : ''}`,
      amount: Number(i.total),
      entry_date: i.paid_date || i.issued_date || i.created_at.split('T')[0],
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: 'expense' as const,
      reference: e.category,
      description: `${e.vendor ? e.vendor + ': ' : ''}${e.description}`,
      amount: -Number(e.total),
      entry_date: e.expense_date,
    })),
  ]

  entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  let balance = 0
  return entries.map((entry) => {
    balance += entry.amount
    return { ...entry, running_balance: Math.round(balance * 100) / 100 }
  })
}

export default async function LedgerPage() {
  const entries = await getLedger()

  const totalIn = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalOut = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Math.abs(e.amount), 0)
  const net = totalIn - totalOut

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-2xl tracking-wide uppercase">Ledger</h1>
        <p className="font-meta text-[10px] tracking-[0.15em] uppercase text-rebrief-dark/40">
          Money In / Money Out
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-rebrief-cream border-t-2 border-t-emerald-500 rounded-sm p-4">
          <p className="font-meta text-[9px] tracking-[0.2em] uppercase text-rebrief-dark/40 mb-1">Total In</p>
          <p className="text-xl font-light tabular-nums text-emerald-700">
            {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(totalIn)}
          </p>
        </div>
        <div className="bg-white border border-rebrief-cream border-t-2 border-t-rebrief-red rounded-sm p-4">
          <p className="font-meta text-[9px] tracking-[0.2em] uppercase text-rebrief-dark/40 mb-1">Total Out</p>
          <p className="text-xl font-light tabular-nums text-rebrief-red">
            {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(totalOut)}
          </p>
        </div>
        <div className={`bg-white border border-rebrief-cream border-t-2 rounded-sm p-4 ${net >= 0 ? 'border-t-rebrief-gold' : 'border-t-rebrief-red'}`}>
          <p className="font-meta text-[9px] tracking-[0.2em] uppercase text-rebrief-dark/40 mb-1">Net Balance</p>
          <p className={`text-xl font-light tabular-nums ${net >= 0 ? 'text-rebrief-gold' : 'text-rebrief-red'}`}>
            {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(net)}
          </p>
        </div>
      </div>

      <LedgerView entries={entries} />
    </div>
  )
}
