import { supabase } from '@/lib/supabase'
import type { DashboardStats, Invoice, Expense } from '@/lib/types'
import { SectionHead } from '@/components/SectionHead'
import Link from 'next/link'

async function getStats(): Promise<DashboardStats> {
  const [invoicesRes, expensesRes] = await Promise.all([
    supabase.from('invoices').select('*'),
    supabase.from('expenses').select('*'),
  ])

  const invoices: Invoice[] = invoicesRes.data || []
  const expenses: Expense[] = expensesRes.data || []

  const paidInvoices = invoices.filter((i) => i.status === 'paid')
  const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'draft')
  const overdue = invoices.filter((i) => i.status === 'overdue')

  return {
    totalRevenue: paidInvoices.reduce((s, i) => s + Number(i.total), 0),
    totalExpenses: expenses.reduce((s, e) => s + Number(e.total), 0),
    netBalance:
      paidInvoices.reduce((s, i) => s + Number(i.total), 0) -
      expenses.reduce((s, e) => s + Number(e.total), 0),
    outstandingCount: outstanding.length,
    outstandingAmount: outstanding.reduce((s, i) => s + Number(i.total), 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((s, i) => s + Number(i.total), 0),
  }
}

async function getRecentActivity() {
  const [invoicesRes, expensesRes] = await Promise.all([
    supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(8),
  ])

  const items = [
    ...(invoicesRes.data || []).map((i: Invoice) => ({
      id: i.id,
      type: 'invoice' as const,
      reference: i.invoice_number,
      description: i.client_name + (i.description ? ' — ' + i.description : ''),
      amount: Number(i.total),
      date: i.issued_date || i.created_at.split('T')[0],
      status: i.status,
    })),
    ...(expensesRes.data || []).map((e: Expense) => ({
      id: e.id,
      type: 'expense' as const,
      reference: e.category.toUpperCase().replace('_', ' '),
      description: (e.vendor ? e.vendor + ' — ' : '') + e.description,
      amount: -Number(e.total),
      date: e.expense_date,
      status: 'recorded',
    })),
  ]

  items.sort((a, b) => b.date.localeCompare(a.date))
  return items.slice(0, 10)
}

function fmt(n: number) {
  const abs = Math.abs(n)
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(abs)
}

function fmtSigned(n: number) {
  return (n < 0 ? '−' : '') + fmt(n)
}

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()])

  const balanceColor = stats.netBalance >= 0 ? 'text-ink' : 'text-orange'

  return (
    <>
      <SectionHead
        eyebrow="The Treasury"
        title="Overview"
        marginalia={
          <p className="font-meta text-[10px] tracking-[0.22em] text-ink/40 leading-relaxed">
            A standing summary of paid invoices, recorded expenses, and the running balance.
          </p>
        }
      />

      {/* The Balance — asymmetric, dominant, the treasurer's main number */}
      <section className="pt-14 pb-12 grid grid-cols-12 gap-x-8 gap-y-8 rule-bottom">
        <div className="col-span-12 md:col-span-8">
          <p className="font-meta text-[10px] tracking-[0.25em] text-ink/50 mb-3">
            Net Balance · CAD
          </p>
          <p
            className={`font-display tabular-nums leading-[0.85] tracking-tight ${balanceColor}`}
            style={{ fontSize: 'clamp(72px, 14vw, 220px)' }}
          >
            {stats.netBalance < 0 && <span className="text-orange">−</span>}
            {fmt(stats.netBalance)}
          </p>
          <p className="mt-4 font-body text-[14px] text-ink/55 max-w-md">
            {stats.netBalance >= 0
              ? 'The till is in the black. Money in less money out, accurate as of this load.'
              : 'The till is in the red. Outstanding invoices may turn this around — see the ledger.'}
          </p>
        </div>

        <aside className="col-span-12 md:col-span-4 md:border-l md:border-rule md:pl-8 grid grid-cols-2 md:grid-cols-1 gap-y-6 gap-x-6">
          <Marginal label="Money In" amount={stats.totalRevenue} tone="in" />
          <Marginal label="Money Out" amount={stats.totalExpenses} tone="out" />
          <Marginal
            label="Outstanding"
            amount={stats.outstandingAmount}
            tone="neutral"
            count={`${stats.outstandingCount} invoice${stats.outstandingCount !== 1 ? 's' : ''} pending`}
          />
          {stats.overdueCount > 0 && (
            <Marginal
              label="Overdue"
              amount={stats.overdueAmount}
              tone="overdue"
              count={`${stats.overdueCount} past due`}
            />
          )}
        </aside>
      </section>

      {/* Wire strip — quick links */}
      <div className="py-4 rule-bottom-faint flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-meta text-[10px] tracking-[0.25em] text-ink/40">Quick Marks</span>
        <Link href="/invoices" className="font-meta text-[10px] tracking-[0.22em] text-ink hover:text-gold transition-colors">
          → New Invoice
        </Link>
        <Link href="/expenses" className="font-meta text-[10px] tracking-[0.22em] text-ink hover:text-gold transition-colors">
          → Log Expense
        </Link>
        <Link href="/ledger" className="font-meta text-[10px] tracking-[0.22em] text-ink hover:text-gold transition-colors">
          → Open Ledger
        </Link>
      </div>

      {/* Recent activity — broadsheet ledger feel, no card */}
      <section className="pt-12 pb-8">
        <header className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-[28px] md:text-[36px] tracking-tight">
            Recent Activity
          </h2>
          <p className="font-meta text-[10px] tracking-[0.22em] text-ink/40">
            Last {activity.length} entr{activity.length === 1 ? 'y' : 'ies'}
          </p>
        </header>

        {activity.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-body text-[18px] text-ink/50 italic">
              The ledger is empty. Time to bill someone, or log the first expense.
            </p>
            <p className="mt-4 font-meta text-[10px] tracking-[0.22em] text-ink/30">
              <Link href="/invoices" className="link-rebrief">Compose an invoice</Link>
              <span className="mx-3 text-gold">·</span>
              <Link href="/expenses" className="link-rebrief">Record an expense</Link>
            </p>
          </div>
        ) : (
          <ul>
            {activity.map((item) => (
              <li
                key={item.id + item.type}
                className="grid grid-cols-[80px_60px_1fr_140px] gap-4 items-baseline py-3 rule-bottom-faint last:border-b-0"
              >
                <time className="font-meta text-[10px] tracking-[0.18em] text-ink/45 tabular-nums">
                  {formatDateBroad(item.date)}
                </time>
                <span className="font-meta text-[9px] tracking-[0.2em] text-gold">
                  {item.type === 'invoice' ? 'BILLED' : 'EXPENSE'}
                </span>
                <span className="font-body text-[14px] text-ink leading-snug">
                  <span className="text-ink/40">{item.reference}</span>
                  <span className="mx-2 text-gold">·</span>
                  {item.description}
                </span>
                <span
                  className={`font-display tabular-nums text-[18px] text-right tracking-tight ${
                    item.amount >= 0 ? 'text-green' : 'text-orange'
                  }`}
                >
                  {item.amount >= 0 ? '+' : '−'}{fmt(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Marginal({
  label,
  amount,
  tone,
  count,
}: {
  label: string
  amount: number
  tone: 'in' | 'out' | 'neutral' | 'overdue'
  count?: string
}) {
  const colors = {
    in: 'text-green',
    out: 'text-orange',
    neutral: 'text-ink',
    overdue: 'text-orange',
  }

  return (
    <div>
      <p className="font-meta text-[9px] tracking-[0.22em] text-ink/45 mb-1.5">
        {label}
      </p>
      <p className={`font-display text-[26px] tabular-nums tracking-tight ${colors[tone]}`}>
        {fmtSigned(amount)}
      </p>
      {count && (
        <p className="mt-1 font-meta text-[9px] tracking-[0.18em] text-ink/40">
          {count}
        </p>
      )}
    </div>
  )
}

function formatDateBroad(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'))
  if (isNaN(d.getTime())) return iso
  return d
    .toLocaleDateString('en-CA', { day: '2-digit', month: 'short' })
    .toUpperCase()
    .replace(/\./g, '')
}
