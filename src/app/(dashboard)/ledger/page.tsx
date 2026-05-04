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

  entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date))

  let balance = 0
  return entries.map((entry) => {
    balance += entry.amount
    return { ...entry, running_balance: Math.round(balance * 100) / 100 }
  })
}

function fmt(n: number) {
  const abs = Math.abs(n)
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(abs)
}

const ROMAN_YEARS: Record<number, string> = {
  2024: 'MMXXIV',
  2025: 'MMXXV',
  2026: 'MMXXVI',
  2027: 'MMXXVII',
  2028: 'MMXXVIII',
  2029: 'MMXXIX',
  2030: 'MMXXX',
}

export default async function LedgerPage() {
  const entries = await getLedger()

  const totalIn = entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalOut = entries.filter((e) => e.type === 'expense').reduce((s, e) => s + Math.abs(e.amount), 0)
  const net = totalIn - totalOut

  const currentYear = new Date().getFullYear()
  const yearRoman = ROMAN_YEARS[currentYear] || `${currentYear}`

  return (
    <>
      <SectionHead
        eyebrow={`${yearRoman} · Running Account`}
        title="Ledger"
        marginalia={
          <p className="font-body text-[13px] italic text-ink/55 leading-relaxed">
            Every paid invoice and every recorded expense, in chronological order, with a
            running balance struck after each entry.
          </p>
        }
      />

      {/* Wire strip totals — no cards, just type */}
      <section className="rule-bottom py-7">
        <div className="grid grid-cols-3 gap-6 md:gap-12">
          <div>
            <p className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-2">Money In</p>
            <p className="font-display text-[36px] md:text-[48px] tabular-nums tracking-tight text-green leading-none">
              +{fmt(totalIn)}
            </p>
            <p className="font-meta text-[9px] tracking-[0.22em] text-ink/40 mt-2">
              {entries.filter((e) => e.type === 'income').length} entr{entries.filter((e) => e.type === 'income').length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <div>
            <p className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-2">Money Out</p>
            <p className="font-display text-[36px] md:text-[48px] tabular-nums tracking-tight text-orange leading-none">
              −{fmt(totalOut)}
            </p>
            <p className="font-meta text-[9px] tracking-[0.22em] text-ink/40 mt-2">
              {entries.filter((e) => e.type === 'expense').length} entr{entries.filter((e) => e.type === 'expense').length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <div className="md:border-l md:border-rule md:pl-12">
            <p className="font-meta text-[10px] tracking-[0.25em] text-ink/45 mb-2">Net</p>
            <p className={`font-display text-[36px] md:text-[48px] tabular-nums tracking-tight leading-none ${
              net >= 0 ? 'text-ink' : 'text-orange'
            }`}>
              {net < 0 ? '−' : ''}{fmt(net)}
            </p>
            <p className="font-meta text-[9px] tracking-[0.22em] text-ink/40 mt-2">
              In less Out
            </p>
          </div>
        </div>
      </section>

      <LedgerView entries={entries} />
    </>
  )
}
