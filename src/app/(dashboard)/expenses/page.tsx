import { supabase } from '@/lib/supabase'
import type { Expense } from '@/lib/types'
import { ExpenseTable } from '@/components/ExpenseTable'

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
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-2xl tracking-wide uppercase">Expenses</h1>
        <div className="text-right">
          <p className="text-sm tabular-nums">
            <span className="text-rebrief-dark/40">Total: </span>
            <span className="font-medium">{fmt(totalExpenses)}</span>
          </p>
          <p className="text-[10px] text-rebrief-dark/30 mt-0.5">
            {expenses.length} entries across {categories.size} categories
          </p>
        </div>
      </div>

      <ExpenseTable expenses={expenses} />
    </div>
  )
}
