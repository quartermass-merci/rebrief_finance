'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'

export async function createExpense(formData: FormData) {
  const amount = parseFloat(formData.get('amount') as string) || 0
  const taxAmount = parseFloat(formData.get('tax_amount') as string) || 0
  const total = Math.round((amount + taxAmount) * 100) / 100

  const { error } = await supabase.from('expenses').insert({
    description: formData.get('description') as string,
    vendor: (formData.get('vendor') as string) || null,
    category: formData.get('category') as string,
    amount,
    tax_amount: taxAmount,
    total,
    receipt_url: (formData.get('receipt_url') as string) || null,
    expense_date: formData.get('expense_date') as string,
    notes: (formData.get('notes') as string) || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/expenses')
  revalidatePath('/')
  revalidatePath('/ledger')
}

export async function updateExpense(id: string, formData: FormData) {
  const amount = parseFloat(formData.get('amount') as string) || 0
  const taxAmount = parseFloat(formData.get('tax_amount') as string) || 0
  const total = Math.round((amount + taxAmount) * 100) / 100

  const { error } = await supabase
    .from('expenses')
    .update({
      description: formData.get('description') as string,
      vendor: (formData.get('vendor') as string) || null,
      category: formData.get('category') as string,
      amount,
      tax_amount: taxAmount,
      total,
      receipt_url: (formData.get('receipt_url') as string) || null,
      expense_date: formData.get('expense_date') as string,
      notes: (formData.get('notes') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/expenses')
  revalidatePath('/')
  revalidatePath('/ledger')
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/expenses')
  revalidatePath('/')
  revalidatePath('/ledger')
}
