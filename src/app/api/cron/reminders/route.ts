import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.REMINDER_FROM_EMAIL || 'hello@rebrief.ca'

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: overdueInvoices, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .in('status', ['sent', 'overdue'])
    .lte('due_date', cutoff)
    .is('reminder_sent_at', null)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return NextResponse.json({ message: 'No reminders needed', sent: 0 })
  }

  let sent = 0
  const errors: string[] = []

  for (const invoice of overdueInvoices) {
    if (!invoice.client_email) continue

    const amount = new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(invoice.total)

    try {
      await resend.emails.send({
        from: `Rebrief Magazine <${fromEmail}>`,
        to: invoice.client_email,
        subject: `Reminder: Invoice ${invoice.invoice_number} — ${amount} outstanding`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #212121;">
            <p style="font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #7a6f3a; margin-bottom: 24px;">
              Rebrief Magazine
            </p>
            <p>Dear ${invoice.client_name},</p>
            <p>
              This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong>
              for <strong>${amount}</strong> was due on <strong>${invoice.due_date}</strong>
              and remains outstanding.
            </p>
            ${invoice.description ? `<p style="color: #666;">Re: ${invoice.description}</p>` : ''}
            <p>
              If payment has already been sent, please disregard this message.
              Otherwise, we would appreciate your attention to this matter.
            </p>
            <p style="margin-top: 32px;">
              Warm regards,<br />
              Rebrief Magazine — Treasury
            </p>
            <hr style="border: none; border-top: 1px solid #f0ebdf; margin: 32px 0 16px;" />
            <p style="font-size: 11px; color: #999;">
              Rebrief Magazine is a registered non-profit in Ontario, Canada.
            </p>
          </div>
        `,
      })

      await supabase
        .from('invoices')
        .update({
          status: 'overdue',
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      sent++
    } catch (err) {
      errors.push(`${invoice.invoice_number}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({
    message: `Sent ${sent} reminder(s)`,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  })
}
