export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type ExpenseCategory =
  | 'printing'
  | 'design'
  | 'photography'
  | 'writing'
  | 'distribution'
  | 'events'
  | 'marketing'
  | 'software'
  | 'office'
  | 'travel'
  | 'professional_fees'
  | 'other'

export interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string | null
  client_address: string | null
  description: string | null
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  status: InvoiceStatus
  issued_date: string | null
  due_date: string | null
  paid_date: string | null
  reminder_sent_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  description: string
  vendor: string | null
  category: ExpenseCategory
  amount: number
  tax_amount: number
  total: number
  receipt_url: string | null
  expense_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LedgerEntry {
  id: string
  type: 'income' | 'expense'
  reference: string
  description: string
  amount: number
  entry_date: string
  running_balance: number
}

export interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  netBalance: number
  outstandingCount: number
  outstandingAmount: number
  overdueCount: number
  overdueAmount: number
}

export interface ExtractedInvoice {
  invoice_number: string | null
  client_name: string | null
  client_email: string | null
  client_address: string | null
  description: string | null
  line_items: LineItem[]
  subtotal: number | null
  tax_rate: number | null
  tax_amount: number | null
  total: number | null
  issued_date: string | null
  due_date: string | null
  notes: string | null
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'printing', label: 'Printing' },
  { value: 'design', label: 'Design' },
  { value: 'photography', label: 'Photography' },
  { value: 'writing', label: 'Writing & Editorial' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'events', label: 'Events' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software', label: 'Software & Tools' },
  { value: 'office', label: 'Office & Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'other', label: 'Other' },
]
