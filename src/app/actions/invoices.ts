'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import type { LineItem } from '@/lib/types'

export async function createInvoice(formData: FormData) {
  const lineItemsRaw = formData.get('line_items') as string
  const lineItems: LineItem[] = lineItemsRaw ? JSON.parse(lineItemsRaw) : []
  const taxRate = parseFloat(formData.get('tax_rate') as string) || 13

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  const { error } = await supabase.from('invoices').insert({
    invoice_number: formData.get('invoice_number') as string,
    client_name: formData.get('client_name') as string,
    client_email: (formData.get('client_email') as string) || null,
    client_address: (formData.get('client_address') as string) || null,
    description: (formData.get('description') as string) || null,
    line_items: lineItems,
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    status: 'draft',
    issued_date: (formData.get('issued_date') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    notes: (formData.get('notes') as string) || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/invoices')
  revalidatePath('/')
}

export async function updateInvoice(id: string, formData: FormData) {
  const lineItemsRaw = formData.get('line_items') as string
  const lineItems: LineItem[] = lineItemsRaw ? JSON.parse(lineItemsRaw) : []
  const taxRate = parseFloat(formData.get('tax_rate') as string) || 13

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  const { error } = await supabase
    .from('invoices')
    .update({
      invoice_number: formData.get('invoice_number') as string,
      client_name: formData.get('client_name') as string,
      client_email: (formData.get('client_email') as string) || null,
      client_address: (formData.get('client_address') as string) || null,
      description: (formData.get('description') as string) || null,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status: formData.get('status') as string,
      issued_date: (formData.get('issued_date') as string) || null,
      due_date: (formData.get('due_date') as string) || null,
      paid_date: (formData.get('paid_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/invoices')
  revalidatePath('/')
  revalidatePath('/ledger')
}

export async function updateInvoiceStatus(id: string, status: string) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'paid') {
    update.paid_date = new Date().toISOString().split('T')[0]
  }

  const { error } = await supabase.from('invoices').update(update).eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/invoices')
  revalidatePath('/')
  revalidatePath('/ledger')
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/invoices')
  revalidatePath('/')
  revalidatePath('/ledger')
}
