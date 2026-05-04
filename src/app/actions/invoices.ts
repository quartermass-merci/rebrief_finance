'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getAnthropic } from '@/lib/anthropic'
import type { LineItem, ExtractedInvoice } from '@/lib/types'

export async function createInvoice(formData: FormData) {
  const lineItemsRaw = formData.get('line_items') as string
  const lineItems: LineItem[] = lineItemsRaw ? JSON.parse(lineItemsRaw) : []
  // Parse tax rate, default to 0 (Rebrief is not HST-registered).
  // Use isNaN guard rather than `||` because 0 is falsy in JS.
  const parsedTaxRate = parseFloat(formData.get('tax_rate') as string)
  const taxRate = isNaN(parsedTaxRate) ? 0 : parsedTaxRate

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
  // Parse tax rate, default to 0 (Rebrief is not HST-registered).
  // Use isNaN guard rather than `||` because 0 is falsy in JS.
  const parsedTaxRate = parseFloat(formData.get('tax_rate') as string)
  const taxRate = isNaN(parsedTaxRate) ? 0 : parsedTaxRate

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

const EXTRACTION_SYSTEM_PROMPT = `You are an expert invoice data extraction system for Rebrief Magazine, a registered non-profit in Ontario, Canada. Your role is to accurately extract structured financial data from invoice PDFs that Rebrief receives or sends.

# Context

Rebrief operates as a non-profit and must maintain accurate financial records for:
- CRA (Canada Revenue Agency) compliance and annual returns
- Annual financial audits by independent reviewers
- Board-level transparency and accountability
- Sponsor accountability and proof of services rendered
- Internal treasury reconciliation

You will receive invoice PDFs in widely varying formats — some from Rebrief's own clean editorial template, others from sponsors, vendors, freelancers, printers, photographers, or partners with arbitrary layouts. Your job is to extract the data accurately regardless of layout, font, or structure.

# Fields to Extract

## Invoice Identity

- **invoice_number**: The unique identifier for this invoice. Examples: "INV-001", "2026-04", "Q4-2026-007", "001234", "RBF-22". Look for labels like "Invoice #", "Invoice Number", "Reference", "Bill #", "Document Number", or sometimes just a prominent number near the masthead. Strip leading "#" characters from the value.

## Parties

- **client_name**: The party being BILLED — the recipient of the invoice. Look under labels like "Bill To", "Billed To", "To", "Client", "Customer", "Sold To", "Recipient". This is NOT the party issuing the invoice. For Rebrief-issued invoices, this will be the sponsor, agency, or buyer. For vendor invoices sent TO Rebrief, this will be "Rebrief Magazine" or similar. Always extract the legal entity name when present, not a contact person's name.

- **client_email**: Email address of the billed party, if shown. Often appears near the client name/address. Strip whitespace.

- **client_address**: Full mailing address of the billed party. Concatenate all address lines (street, suite, city, province/state, postal/ZIP code, country) into a single string separated by commas. Trim whitespace on each component.

## Description

- **description**: A high-level description of what the invoice is for, if there's a single overarching subject (e.g., "Sponsorship — Issue 01", "Print production services for Issue 01", "Editorial photography Q1 2026"). Leave null if the invoice only has individual line items with no overall subject summary.

## Line Items

- **line_items**: Array of objects, one per billable line. Each line item must have all four fields:
  - \`description\` (string): What was provided/charged for. Keep as-written from the invoice.
  - \`quantity\` (number): Number of units. Default 1 if unstated.
  - \`rate\` (number): Per-unit price. If only line total is shown, set rate = amount / quantity.
  - \`amount\` (number): Line total (quantity × rate).

If an invoice shows only "description" and "amount" without explicit qty/rate columns, use quantity=1 and rate=amount. Always include AT LEAST one line item — if the invoice has only a single bottom-line total, create one line item from the description and total.

## Totals (all numeric, never strings)

- **subtotal**: Sum of line items BEFORE tax. Pure number — NEVER formatted with $ or commas. e.g., 1500 or 1500.50.
- **tax_rate**: Tax rate as a percentage number (e.g., 13 for HST in Ontario, 5 for GST only, 0 if no tax). If multiple tax lines combine to a different effective rate, use the combined effective rate.
- **tax_amount**: Total tax amount. Pure number, no formatting.
- **total**: Final amount due, including tax. Pure number, no formatting. Should equal subtotal + tax_amount.

## Dates (all YYYY-MM-DD format)

- **issued_date**: The invoice issue/creation date. Look for "Date", "Issue Date", "Invoice Date", "Date Issued", "Bill Date".
- **due_date**: When payment is due. Look for "Due Date", "Payment Due", "Pay By". "Net 30" implies +30 days from issue_date. "Net 15" implies +15 days. "Due upon receipt" — leave null OR set to issued_date.

## Notes

- **notes**: Any payment instructions, terms, banking details, or special notes shown on the invoice. Examples: "Payment due within 30 days", bank/wire transfer details, e-transfer email, cheque payable instructions, sponsor reference codes. Concatenate multiple lines with newlines. If the invoice has both terms and other notes, include both.

# Critical Extraction Rules

1. **Numbers must be numbers, not strings.** Never return "$1,500.00" or "1,500" — return 1500 or 1500.00 as a numeric JSON value. No currency symbols, no thousands separators, no formatting.

2. **Dates must be ISO format (YYYY-MM-DD).** Convert any date format you see:
   - "April 15, 2026" → "2026-04-15"
   - "15/04/2026" → "2026-04-15" (DD/MM/YYYY common in Canada)
   - "04/15/2026" → "2026-04-15" (MM/DD/YYYY common)
   - "2026-04-15" → "2026-04-15" (already ISO)
   - When ambiguous (e.g., "03/04/2026"), prefer DD/MM/YYYY for Canadian context unless the invoice is clearly American.

3. **Null for missing data.** If a field is not present or cannot be determined with confidence, return null. Do NOT guess, fabricate, or hallucinate values. The treasurer will review every extraction before saving — accuracy matters more than completeness.

4. **Preserve numeric precision.** Don't round monetary values. If the invoice shows $1,234.56, return 1234.56. If it shows $1,234, return 1234.

5. **HST defaults for Ontario.** If tax is shown but the rate is unstated AND the invoice is clearly Canadian/Ontario, default tax_rate to 13. If the invoice clearly shows GST only (5%) or PST only (8%), use those values exactly.

6. **Currency assumption.** All amounts assumed to be CAD unless the invoice explicitly states USD, EUR, GBP, etc. Don't include currency in the numeric value. If non-CAD currency is shown, still return the original numeric value but note the currency in the \`notes\` field (e.g., "Invoice issued in USD").

7. **Line item descriptions stay as-written.** Don't paraphrase, summarize, or "clean up" the description. Preserve the exact wording — auditors may need to match it back to a contract or scope of work.

8. **Multiple tax lines combine.** If the invoice shows separate GST and PST, or HST broken into federal/provincial portions, sum them into a single tax_amount. The tax_rate should be the COMBINED effective rate. Example: GST 5% + PST 8% = combined 13%, just like HST.

9. **Discounts and credits.** If the invoice shows a discount line or credit applied before subtotal, factor it into the line items if it's per-item, or include as a separate negative line item if it's invoice-level.

10. **Don't extract Rebrief's bank details.** If the invoice is FROM Rebrief and shows their own banking info in the footer, that's not part of "notes" — only client-facing instructions or terms go in notes.

# Examples

## Example 1: Clean Rebrief-issued sponsorship invoice

PDF content:
\`\`\`
REBRIEF MAGAZINE
Invoice 002

Bill To:
BHLA Inc.
123 King Street West
Toronto, ON M5H 1A1
billing@bhla.ca

Date: 2026-04-15
Due: 2026-05-15

Description                          Qty    Rate        Amount
Full-page house ad — Issue 01         1    $5,000.00   $5,000.00

                                                       ----------
Subtotal                                               $5,000.00
HST (13%)                                                $650.00
Total CAD                                              $5,650.00

Payment terms: Net 30. Wire transfer to TD Canada Trust (transit 12345, account 678901234).
Reference invoice number on payment.
\`\`\`

Extracted JSON:
\`\`\`json
{
  "invoice_number": "002",
  "client_name": "BHLA Inc.",
  "client_email": "billing@bhla.ca",
  "client_address": "123 King Street West, Toronto, ON M5H 1A1",
  "description": null,
  "line_items": [
    {"description": "Full-page house ad — Issue 01", "quantity": 1, "rate": 5000, "amount": 5000}
  ],
  "subtotal": 5000,
  "tax_rate": 13,
  "tax_amount": 650,
  "total": 5650,
  "issued_date": "2026-04-15",
  "due_date": "2026-05-15",
  "notes": "Payment terms: Net 30. Wire transfer to TD Canada Trust (transit 12345, account 678901234).\\nReference invoice number on payment."
}
\`\`\`

## Example 2: Vendor invoice TO Rebrief (printer with split taxes)

PDF content:
\`\`\`
ABC PRINTING SOLUTIONS
2 Industrial Drive, Mississauga, ON L5T 2C7
Invoice #INV-2026-447

Bill To:
Rebrief Magazine
hello@rebrief.ca

Issue Date: March 8, 2026
Terms: Net 15

ITEM                                                AMOUNT
1,000 copies, 64-page perfect-bound, 4/4 colour    $4,800.00
Setup, plates, and color correction                  $250.00
Shipping (Toronto delivery)                          $150.00
                                                  ----------
Subtotal                                           $5,200.00
GST 5%                                               $260.00
PST 8%                                               $416.00
                                                  ----------
TOTAL DUE                                          $5,876.00

Payment via cheque or e-transfer to ap@abcprint.com.
\`\`\`

Extracted JSON:
\`\`\`json
{
  "invoice_number": "INV-2026-447",
  "client_name": "Rebrief Magazine",
  "client_email": "hello@rebrief.ca",
  "client_address": null,
  "description": null,
  "line_items": [
    {"description": "1,000 copies, 64-page perfect-bound, 4/4 colour", "quantity": 1000, "rate": 4.8, "amount": 4800},
    {"description": "Setup, plates, and color correction", "quantity": 1, "rate": 250, "amount": 250},
    {"description": "Shipping (Toronto delivery)", "quantity": 1, "rate": 150, "amount": 150}
  ],
  "subtotal": 5200,
  "tax_rate": 13,
  "tax_amount": 676,
  "total": 5876,
  "issued_date": "2026-03-08",
  "due_date": "2026-03-23",
  "notes": "Payment via cheque or e-transfer to ap@abcprint.com."
}
\`\`\`

Notice:
- Net 15 = due 15 days after issue (March 8 + 15 = March 23)
- GST 5% + PST 8% combined = 13% effective rate, taxes summed to $676
- 1,000 copies at $4,800 → rate per unit is $4.80 (4800/1000)
- Address printer's own address (sender) is NOT extracted as client_address — Rebrief is the client here, no Rebrief address given

## Example 3: Minimal handwritten-style freelance invoice

PDF content (looks like a Word doc converted to PDF):
\`\`\`
Freelance Editorial Services
Sarah Mitchell, sarah.m.editor@gmail.com

Bill: Rebrief Magazine
For: Copy-editing on Issue 01 essays (Crowley, Lawton, Kim)

Total: $1,200

Submitted April 2026
Total due upon receipt — e-transfer to sarah.m.editor@gmail.com
\`\`\`

Extracted JSON:
\`\`\`json
{
  "invoice_number": null,
  "client_name": "Rebrief Magazine",
  "client_email": null,
  "client_address": null,
  "description": "Copy-editing on Issue 01 essays (Crowley, Lawton, Kim)",
  "line_items": [
    {"description": "Copy-editing on Issue 01 essays (Crowley, Lawton, Kim)", "quantity": 1, "rate": 1200, "amount": 1200}
  ],
  "subtotal": 1200,
  "tax_rate": null,
  "tax_amount": null,
  "total": 1200,
  "issued_date": null,
  "due_date": null,
  "notes": "Total due upon receipt — e-transfer to sarah.m.editor@gmail.com"
}
\`\`\`

Notice:
- No invoice number visible → null (don't fabricate)
- "Submitted April 2026" is not a precise date → issued_date is null
- "Total due upon receipt" → due_date is null (could also reasonably equal issued_date if known)
- Sarah's email (sender) is NOT client_email — client is Rebrief
- No tax line → tax_rate, tax_amount are null (NOT 0)

## Example 4: Photographer invoice with HST and multiple sessions

PDF content:
\`\`\`
                                     OLIVIA CHEN PHOTOGRAPHY
                                     olivia@oliviachen.studio
                                     416-555-0142
                                     HST# 123456789RT0001

INVOICE                                                            #2026-014

Date issued: 2026-04-22
Payment due: 2026-05-22 (Net 30)

Bill to:
Rebrief Magazine
hello@rebrief.ca

DESCRIPTION                                  HOURS    RATE         AMOUNT
Editorial portrait session — C. Miller        4      $200.00       $800.00
Editorial portrait session — J. Crowley       3      $200.00       $600.00
Half-day product photography — masthead       4      $250.00     $1,000.00
Retouching & file delivery (flat fee)         —        —           $400.00

                                                       Subtotal:  $2,800.00
                                                       HST (13%):   $364.00
                                                       TOTAL DUE: $3,164.00

E-transfer to olivia@oliviachen.studio
\`\`\`

Extracted JSON:
\`\`\`json
{
  "invoice_number": "2026-014",
  "client_name": "Rebrief Magazine",
  "client_email": "hello@rebrief.ca",
  "client_address": null,
  "description": null,
  "line_items": [
    {"description": "Editorial portrait session — C. Miller", "quantity": 4, "rate": 200, "amount": 800},
    {"description": "Editorial portrait session — J. Crowley", "quantity": 3, "rate": 200, "amount": 600},
    {"description": "Half-day product photography — masthead", "quantity": 4, "rate": 250, "amount": 1000},
    {"description": "Retouching & file delivery (flat fee)", "quantity": 1, "rate": 400, "amount": 400}
  ],
  "subtotal": 2800,
  "tax_rate": 13,
  "tax_amount": 364,
  "total": 3164,
  "issued_date": "2026-04-22",
  "due_date": "2026-05-22",
  "notes": "E-transfer to olivia@oliviachen.studio"
}
\`\`\`

Notice:
- Olivia's contact info (sender) goes nowhere — she's the issuer, not the client
- HST# in header is the photographer's tax registration number — ignored, not extracted
- Flat-fee line with no hours: quantity=1, rate=amount (400)
- Net 30 explicitly stated and matches the date math

## Example 5: Edge case — partial data, ambiguous tax

PDF content:
\`\`\`
EVENT SPACE BOOKING — ROYAL ONTARIO MUSEUM
Booking Confirmation / Invoice Reference: BK-77192

Renter: Rebrief Magazine
Event: Issue 01 launch reception
Event Date: July 9, 2026

Venue rental                          $3,500
Tax                                     $455
Total                                 $3,955

Payment Date: at signing of agreement (already received)

Reference BK-77192 on remittance.
\`\`\`

Extracted JSON:
\`\`\`json
{
  "invoice_number": "BK-77192",
  "client_name": "Rebrief Magazine",
  "client_email": null,
  "client_address": null,
  "description": "Issue 01 launch reception — venue rental",
  "line_items": [
    {"description": "Venue rental", "quantity": 1, "rate": 3500, "amount": 3500}
  ],
  "subtotal": 3500,
  "tax_rate": 13,
  "tax_amount": 455,
  "total": 3955,
  "issued_date": null,
  "due_date": null,
  "notes": "Event: Issue 01 launch reception. Event Date: July 9, 2026. Payment received at signing.\\nReference BK-77192 on remittance."
}
\`\`\`

Notice:
- Tax rate not stated, but $455/$3500 = 13%, matches Ontario HST → tax_rate=13
- "Payment Date: at signing" doesn't translate to ISO due_date → null
- Rich notes capture the event details that don't fit other fields
- description used to summarize since there's only one billable line

# Final Reminders

- Be precise. This data goes into a non-profit's audit-tracked ledger and informs CRA filings.
- Don't fabricate. Null is always better than wrong.
- Preserve numeric precision exactly — no rounding, no "smart" formatting.
- Output strictly conforms to the JSON schema you've been given. Every required field must be present (use null for unknowns).
- Pay attention to which party is the CLIENT (billed) vs the ISSUER (sender). Get this backwards and the entire ledger entry is wrong.
- The treasurer reviews every extraction before saving. Optimize for accuracy and faithful reproduction over completeness or polish.`

const INVOICE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    invoice_number: { type: ['string', 'null'] },
    client_name: { type: ['string', 'null'] },
    client_email: { type: ['string', 'null'] },
    client_address: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    line_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          rate: { type: 'number' },
          amount: { type: 'number' },
        },
        required: ['description', 'quantity', 'rate', 'amount'],
        additionalProperties: false,
      },
    },
    subtotal: { type: ['number', 'null'] },
    tax_rate: { type: ['number', 'null'] },
    tax_amount: { type: ['number', 'null'] },
    total: { type: ['number', 'null'] },
    issued_date: { type: ['string', 'null'] },
    due_date: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
  },
  required: [
    'invoice_number',
    'client_name',
    'client_email',
    'client_address',
    'description',
    'line_items',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'total',
    'issued_date',
    'due_date',
    'notes',
  ],
  additionalProperties: false,
}

export async function extractInvoiceFromPDF(
  pdfBase64: string
): Promise<{ data?: ExtractedInvoice; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: 'ANTHROPIC_API_KEY not configured.' }
  }

  try {
    const client = getAnthropic()

    const requestParams = {
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: EXTRACTION_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: INVOICE_JSON_SCHEMA,
        },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: 'Extract the invoice data from this PDF following the system instructions exactly. Return only the JSON object matching the schema.',
            },
          ],
        },
      ],
    }

    const response = (await client.messages.create(
      requestParams as unknown as Parameters<typeof client.messages.create>[0]
    )) as { content: Array<{ type: string; text?: string }> }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || !textBlock.text) {
      return { error: 'No text response from extraction.' }
    }

    const parsed = JSON.parse(textBlock.text) as ExtractedInvoice
    return { data: parsed }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Extraction failed: ${message}` }
  }
}
