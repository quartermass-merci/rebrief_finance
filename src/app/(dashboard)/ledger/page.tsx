import { supabase } from '@/lib/supabase'
import type { Invoice, Expense } from '@/lib/types'
import { SectionHead } from '@/components/SectionHead'
import { LedgerView } from '@/components/LedgerView'

export const dynamic = 'force-dynamic'

export interface LedgerEntry {
  id: string
  type: 'income' | 'expense'
  reference: string
  description: string
  amount: number
  entry_date: string
  running_balance: number
}

interface LedgerData {
  entries: LedgerEntry[]
  totalIn: number
  totalOut: number
  available: number
  outstandingTotal: number
  overdueTotal: number
  paidCount: number
  expenseCount: number
  outstandingCount: number
  overdueCount: number
}

async function getLedger(): Promise<LedgerData> {
  const [invoicesRes, expensesRes] = await Promise.all([
    supabase.from('invoices').select('*').order('issued_date', { ascending: true }),
    supabase.from('expenses').select('*').order('expense_date', { ascending: true }),
  ])

  const allInvoices: Invoice[] = invoicesRes.data || []
  const expenses: Expense[] = expensesRes.data || []

  const paidInvoices = allInvoices.filter((i) => i.status === 'paid')
  const outstandingInvoices = allInvoices.filter(
    (i) => i.status === 'sent' || i.status === 'overdue'
  )
  const overdueInvoices = allInvoices.filter((i) => i.status === 'overdue')

  // Build chronological entries from PAID invoices and expenses only.
  // Outstanding invoices are NOT in the running balance — they haven't
  // moved any actual money yet.
  const rawEntries: Omit<LedgerEntry, 'running_balance'>[] = [
    ...paidInvoices.map((i) => ({
      id: i.id,
      type: 'income' as const,
      reference: i.invoice_number,
      description: `${i.client_name}${i.description ? ' — ' + i.description : ''}`,
      amount: Number(i.total),
      entry_date: i.paid_date || i.issued_date || i.created_at.split('T')[0],
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: 'expense' as const,
      reference: e.category.toUpperCase().replace('_', ' '),
      description: `${e.vendor ? e.vendor + ' — ' : ''}${e.description}`,
      amount: -Number(e.total),
      entry_date: e.expense_date,
    })),
  ]

  rawEntries.sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  let balance = 0
  const entries = rawEntries.map((entry) => {
    balance += entry.amount
    return { ...entry, running_balance: Math.round(balance * 100) / 100 }
  })

  const totalIn = paidInvoices.reduce((s, i) => s + Number(i.total), 0)
  const totalOut = expenses.reduce((s, e) => s + Number(e.total), 0)

  return {
    entries,
    totalIn: Math.round(totalIn * 100) / 100,
    totalOut: Math.round(totalOut * 100) / 100,
    available: Math.round((totalIn - totalOut) * 100) / 100,
    outstandingTotal: Math.round(
      outstandingInvoices.reduce((s, i) => s + Number(i.total), 0) * 100
    ) / 100,
    overdueTotal: Math.round(
      overdueInvoices.reduce((s, i) => s + Number(i.total), 0) * 100
    ) / 100,
    paidCount: paidInvoices.length,
    expenseCount: expenses.length,
    outstandingCount: outstandingInvoices.length,
    overdueCount: overdueInvoices.length,
  }
}

function fmt(n: number) {
  const abs = Math.abs(n)
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(abs)
}

export default async function LedgerPage() {
  const data = await getLedger()
  const projected = Math.round((data.available + data.outstandingTotal) * 100) / 100

  return (
    <>
      <SectionHead
        eyebrow="Running Account"
        title="Ledger"
        marginalia={
          <p className="font-body italic text-ink/55 leading-relaxed" style={{ fontSize: '0.85em' }}>
            Every paid invoice and every recorded expense, in chronological order, with a
            running balance struck after each entry.
          </p>
        }
      />

      {/* Two clear blocks: cash on hand vs receivables */}
      <section className="rule-bottom py-8 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-y-10 lg:gap-x-12">
        {/* BLOCK A — what's actually in the bank */}
        <div>
          <header className="mb-5">
            <h2 className="font-display text-[20px] md:text-[24px] tracking-[0.04em] uppercase">
              In the Bank
            </h2>
            <p className="font-body italic text-ink/50 mt-1" style={{ fontSize: '0.8em' }}>
              Money that has actually moved.
            </p>
          </header>

          <div className="grid grid-cols-3 gap-4 md:gap-6">
            <Stat
              label="Money In"
              value={`+${fmt(data.totalIn)}`}
              tone="green"
              count={`${data.paidCount} paid`}
            />
            <Stat
              label="Money Out"
              value={`−${fmt(data.totalOut)}`}
              tone="orange"
              count={`${data.expenseCount} expense${data.expenseCount === 1 ? '' : 's'}`}
            />
            <Stat
              label="Available"
              value={`${data.available < 0 ? '−' : ''}${fmt(data.available)}`}
              tone={data.available < 0 ? 'orange' : 'ink'}
              count="cash on hand"
              prominent
            />
          </div>
        </div>

        {/* Vertical rule separator (lg only) */}
        <div className="hidden lg:block w-px bg-rule" />

        {/* BLOCK B — what's owed to us */}
        <div>
          <header className="mb-5">
            <h2 className="font-display text-[20px] md:text-[24px] tracking-[0.04em] uppercase">
              Receivable
            </h2>
            <p className="font-body italic text-ink/50 mt-1" style={{ fontSize: '0.8em' }}>
              Invoices sent but not yet paid.
            </p>
          </header>

          <div className="grid grid-cols-3 gap-4 md:gap-6">
            <Stat
              label="Outstanding"
              value={`+${fmt(data.outstandingTotal)}`}
              tone="gold"
              count={`${data.outstandingCount} pending`}
            />
            <Stat
              label="Overdue"
              value={`+${fmt(data.overdueTotal)}`}
              tone={data.overdueCount > 0 ? 'orange' : 'muted'}
              count={`${data.overdueCount} past due`}
            />
            <Stat
              label="Projected"
              value={`${projected < 0 ? '−' : ''}${fmt(projected)}`}
              tone={projected < 0 ? 'orange' : 'ink'}
              count="if all pay"
              prominent
            />
          </div>
        </div>
      </section>

      <LedgerView entries={data.entries} />
    </>
  )
}

function Stat({
  label,
  value,
  tone,
  count,
  prominent,
}: {
  label: string
  value: string
  tone: 'green' | 'orange' | 'gold' | 'ink' | 'muted'
  count: string
  prominent?: boolean
}) {
  const colorClass = {
    green: 'text-green',
    orange: 'text-orange',
    gold: 'text-gold',
    ink: 'text-ink',
    muted: 'text-ink/40',
  }[tone]

  return (
    <div className={prominent ? 'border-l border-rule pl-3 md:pl-4' : ''}>
      <p className={`font-meta text-[10px] tracking-[0.25em] mb-2 ${
        prominent ? 'text-ink' : 'text-ink/45'
      }`}>
        {label}
      </p>
      <p
        className={`font-display tabular-nums tracking-tight leading-none ${colorClass}`}
        style={{ fontSize: prominent ? 'clamp(28px, 4vw, 42px)' : 'clamp(22px, 3vw, 32px)' }}
      >
        {value}
      </p>
      <p className="font-meta text-[9px] tracking-[0.22em] text-ink/40 mt-2">
        {count}
      </p>
    </div>
  )
}
