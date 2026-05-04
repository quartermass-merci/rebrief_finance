import { supabase } from '@/lib/supabase'
import type { Expense } from '@/lib/types'
import { SectionHead } from '@/components/SectionHead'
import { ExpenseWorkbench } from '@/components/ExpenseWorkbench'

export const dynamic = 'force-dynamic'

async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n)
}

export default async function ExpensesPage() {
  const expenses = await getExpenses()

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.total), 0)
  const categories = new Set(expenses.map((e) => e.category))

  return (
    <>
      <SectionHead
        eyebrow="MMXXVI · The Treasury"
        title="Expenses"
        marginalia={
          <div className="font-meta text-[10px] tracking-[0.22em] text-ink/50 leading-relaxed space-y-1">
            <p>
              <span className="text-gold">{expenses.length}</span> entr{expenses.length !== 1 ? 'ies' : 'y'}
              <span className="mx-2 text-ink/30">·</span>
              <span className="text-gold">{categories.size}</span> categor{categories.size !== 1 ? 'ies' : 'y'}
            </p>
            <p className="text-ink tracking-[0.2em]">
              Total Out <span className="text-gold">·</span>{' '}
              <span className="font-display text-[16px] tabular-nums text-orange">{fmt(totalExpenses)}</span>
            </p>
          </div>
        }
      />

      <ExpenseWorkbench expenses={expenses} />
    </>
  )
}
