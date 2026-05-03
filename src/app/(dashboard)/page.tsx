import { supabase } from '@/lib/supabase'
import type { DashboardStats, Invoice, Expense } from '@/lib/types'
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
    supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(5),
  ])

  const items = [
    ...(invoicesRes.data || []).map((i: Invoice) => ({
      id: i.id,
      type: 'invoice' as const,
      description: `${i.invoice_number} — ${i.client_name}`,
      amount: Number(i.total),
      date: i.issued_date || i.created_at.split('T')[0],
      status: i.status,
    })),
    ...(expensesRes.data || []).map((e: Expense) => ({
      id: e.id,
      type: 'expense' as const,
      description: `${e.vendor ? e.vendor + ': ' : ''}${e.description}`,
      amount: -Number(e.total),
      date: e.expense_date,
      status: 'confirmed',
    })),
  ]

  items.sort((a, b) => b.date.localeCompare(a.date))
  return items.slice(0, 8)
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()])

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-2xl tracking-wide uppercase">Overview</h1>
        <p className="font-meta text-[10px] tracking-[0.15em] uppercase text-rebrief-dark/40">
          Rebrief Magazine &middot; Non-Profit
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <StatCard label="Revenue" value={fmt(stats.totalRevenue)} sub="Paid invoices" accent="gold" />
        <StatCard label="Expenses" value={fmt(stats.totalExpenses)} sub="Total spent" accent="dark" />
        <StatCard label="Net Balance" value={fmt(stats.netBalance)} sub="In — Out" accent={stats.netBalance >= 0 ? 'gold' : 'red'} />
        <StatCard label="Outstanding" value={fmt(stats.outstandingAmount)} sub={`${stats.outstandingCount} invoice${stats.outstandingCount !== 1 ? 's' : ''} pending`} accent={stats.overdueCount > 0 ? 'red' : 'dark'} />
      </div>

      {stats.overdueCount > 0 && (
        <div className="mb-8 px-4 py-3 bg-rebrief-red/5 border border-rebrief-red/20 rounded-sm">
          <p className="text-sm text-rebrief-red font-medium">
            {stats.overdueCount} overdue invoice{stats.overdueCount !== 1 ? 's' : ''} totalling {fmt(stats.overdueAmount)}
          </p>
        </div>
      )}

      <div className="bg-white border border-rebrief-cream rounded-sm">
        <div className="px-5 py-3 border-b border-rebrief-cream flex items-center justify-between">
          <h2 className="font-meta text-[10px] tracking-[0.2em] uppercase text-rebrief-dark/50">Recent Activity</h2>
        </div>
        <div className="divide-y divide-rebrief-cream/60">
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-rebrief-dark/40 text-center">
              No transactions yet. Start by{' '}
              <Link href="/invoices" className="text-rebrief-gold underline">adding an invoice</Link> or{' '}
              <Link href="/expenses" className="text-rebrief-gold underline">logging an expense</Link>.
            </p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  item.type === 'invoice' ? 'bg-rebrief-gold' : 'bg-rebrief-dark/30'
                }`} />
                <span className="text-sm flex-1 truncate">{item.description}</span>
                <span className="text-xs text-rebrief-dark/40 flex-shrink-0">{item.date}</span>
                <span className={`text-sm font-medium tabular-nums flex-shrink-0 w-28 text-right ${
                  item.amount >= 0 ? 'text-rebrief-gold' : 'text-rebrief-dark/70'
                }`}>
                  {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  const colors: Record<string, string> = {
    gold: 'border-t-rebrief-gold',
    dark: 'border-t-rebrief-dark/20',
    red: 'border-t-rebrief-red',
  }

  return (
    <div className={`bg-white border border-rebrief-cream border-t-2 ${colors[accent] || colors.dark} rounded-sm p-4`}>
      <p className="font-meta text-[9px] tracking-[0.2em] uppercase text-rebrief-dark/40 mb-1">{label}</p>
      <p className="text-xl font-light tabular-nums">{value}</p>
      <p className="text-[11px] text-rebrief-dark/40 mt-1">{sub}</p>
    </div>
  )
}
