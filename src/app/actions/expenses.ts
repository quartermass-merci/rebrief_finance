'use server'

import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getAnthropic } from '@/lib/anthropic'
import type { ExtractedExpense } from '@/lib/types'

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

// ============================================================
// PDF / RECEIPT EXTRACTION
// ============================================================

const EXTRACTION_SYSTEM_PROMPT = `You are an expert receipt and expense data extraction system for Rebrief Magazine, a registered non-profit in Ontario, Canada. Your role is to accurately extract structured expense data from receipts, vendor invoices, and other PDFs that document money Rebrief has spent.

# Context

Rebrief is a non-profit and must keep accurate expense records for:
- CRA compliance and the annual T3010 charity return / non-profit information return
- Annual independent financial review or audit
- Board accountability — the treasurer (PK) reports money out at every meeting
- Reimbursing volunteers and contractors who pay out-of-pocket
- Receipt-matching for HST input tax credits (where applicable)

You will receive PDFs in many formats: itemized vendor invoices, simple cash receipts, restaurant bills, ride-share statements, software subscription confirmations, freelancer invoices, print-shop receipts, photographer invoices, hotel folios, etc. Layouts and quality vary widely. Your job is to extract the expense fields accurately regardless of source format.

# Fields to Extract

## Vendor

- **vendor**: The party Rebrief paid (the seller, payee, contractor, or service provider). This is who issued the receipt — look for the company name at the top, on the masthead, or in the header. Examples: "ABC Printing", "Olivia Chen Photography", "Adobe Inc.", "TTC", "Pearson Hotel Toronto", "Sarah Mitchell". For chain stores, use the brand name ("Tim Hortons", not "Tim Hortons Bay Street"). For freelancers issuing personal invoices, use their full name.

## Description

- **description**: A concise, factual description of what was purchased or paid for. Examples:
  - "1,000 copies of Issue 01, perfect-bound" (printer invoice)
  - "Editorial portrait sessions — Miller, Crowley" (photographer)
  - "Adobe Creative Cloud — annual subscription" (software)
  - "Launch reception catering — 80 guests" (restaurant invoice)
  - "Venue rental — Issue 01 launch" (event space)
  - "Copy editing for Issue 01 essays" (freelancer)
  - "TTC fares — distribution day" (transit receipts)

If the PDF is itemized, summarize the items into one description rather than listing every line. The description should fit on one line in a ledger.

## Category

- **category**: Classify the expense into ONE of these exact values (use the value, not the label):

| value | When to use |
|-------|-------------|
| \`printing\` | Print runs, presses, plates, paper, binding, finishing |
| \`design\` | Graphic design, art direction, illustration, layout work |
| \`photography\` | Photography sessions, photo licensing, retouching, equipment rental for shoots |
| \`writing\` | Editorial work — writing, copy editing, proofreading, fact-checking, contributing essays |
| \`distribution\` | Mailing, courier, shipping issues to subscribers/sponsors, distribution partners |
| \`events\` | Launch parties, readings, panels, venue rental, catering, AV, event staff |
| \`marketing\` | Ads, social media spend, PR, promotional swag, posters, sponsored placements |
| \`software\` | SaaS subscriptions, fonts/licensing, web hosting, domain, cloud storage, design software |
| \`office\` | Office supplies, postage, small equipment, stationery, work-from-home tools |
| \`travel\` | Transit, flights, hotels, mileage, rideshare for business purposes |
| \`professional_fees\` | Legal, accounting, bookkeeping, audit, consulting, registration fees |
| \`other\` | Anything that doesn't fit above — bank fees, donations made by Rebrief, etc. |

Pick the BEST match based on the vendor + description. If genuinely ambiguous, use \`other\`.

## Amount Fields (all numeric, never strings)

- **amount**: Subtotal BEFORE tax. Pure number. e.g., 1500 or 1500.50. NEVER include $ or commas.
- **tax_amount**: Total tax paid. Pure number. If GST + PST shown separately, sum them. If receipt shows only one tax line (HST), use that.
- **total**: Final total paid INCLUDING tax. Pure number. Should equal amount + tax_amount.

If the receipt shows only a final total with no tax line broken out:
- If you can identify a tax-inclusive amount, set \`amount\` = total / 1.13 and \`tax_amount\` = total - amount (assuming Ontario HST 13%). Round to 2 decimal places.
- If tax is clearly not charged (e.g., a non-taxable service, or vendor is below GST threshold and no tax shown), set \`tax_amount\` = 0 and \`amount\` = total.

If the receipt is ambiguous, return \`amount\` as the best guess of pre-tax and set \`tax_amount\` to null.

## Date

- **expense_date** (YYYY-MM-DD): The date the expense was incurred — usually the transaction date, receipt date, or invoice issue date. Convert any format you see:
  - "April 15, 2026" → "2026-04-15"
  - "15/04/2026" (DD/MM/YYYY, common in Canada) → "2026-04-15"
  - "04/15/2026" (MM/DD/YYYY) → "2026-04-15"
  - For ambiguous slashed dates with a Canadian vendor, prefer DD/MM/YYYY.

If multiple dates are shown (issue date, payment date, due date), use the date the EXPENSE was incurred — usually the transaction or receipt date.

## Notes

- **notes**: Optional supplementary context that's useful for the audit trail but doesn't fit other fields. Examples:
  - Reference numbers, transaction IDs, confirmation codes
  - Payment method ("Paid by company Visa", "E-transfer", "Cheque #1234")
  - Special context ("For Issue 01 launch event", "Volunteer reimbursement to PK")
  - Currency notes ("Charged in USD; total above is the original amount")
  - Tax registration numbers (only if relevant for HST input credits)

Keep notes concise. If nothing notable, leave null.

# Critical Rules

1. **Numbers are numbers.** No "$1,234.56" — return 1234.56. No commas, no currency symbols.

2. **Dates are ISO format.** YYYY-MM-DD. Convert from whatever format you see.

3. **Null over guessing.** If a field is unclear, return null. Don't fabricate.

4. **Currency assumption.** All amounts are CAD unless explicitly otherwise. If non-CAD, still return the original numeric value but note the currency in \`notes\` (e.g., "Charged in USD").

5. **HST defaults.** Ontario HST is 13%. If tax is shown but rate is unstated, and the vendor is Canadian, assume 13%. If GST 5% only (out-of-province vendor), use that. PST 8% provinces (BC, SK, MB) — combine if needed.

6. **Pick a category.** Always assign a category — use \`other\` only as a last resort. Categorization helps the treasurer and auditors.

7. **Vendor is the SELLER.** Receipts/invoices document money Rebrief paid OUT, so the vendor is whoever Rebrief paid — never Rebrief itself.

# Examples

## Example 1: Printer's invoice

PDF content:
\`\`\`
ABC PRINTING SOLUTIONS
2 Industrial Drive, Mississauga, ON L5T 2C7
Invoice #INV-2026-447
Date: March 8, 2026

Bill To: Rebrief Magazine

DESCRIPTION                                              AMOUNT
1,000 copies, 64-page perfect-bound, 4/4 colour         $4,800.00
Setup, plates, color correction                           $250.00
Shipping (Toronto delivery)                               $150.00

Subtotal                                                $5,200.00
HST 13%                                                   $676.00
TOTAL DUE                                               $5,876.00

E-transfer to ap@abcprint.com.
\`\`\`

Extracted JSON:
\`\`\`json
{
  "vendor": "ABC Printing Solutions",
  "description": "1,000 copies of Issue 01 — perfect-bound, 4/4 colour, plus setup and Toronto shipping",
  "category": "printing",
  "amount": 5200,
  "tax_amount": 676,
  "total": 5876,
  "expense_date": "2026-03-08",
  "notes": "Invoice #INV-2026-447. Paid by e-transfer to ap@abcprint.com."
}
\`\`\`

## Example 2: Adobe Creative Cloud receipt

PDF content:
\`\`\`
Adobe Inc.
345 Park Avenue, San Jose, CA 95110

Receipt for Annual Subscription

Customer: Rebrief Magazine
Email: hello@rebrief.ca
Order date: 2026-04-01
Order #: AD-2026-87729

Adobe Creative Cloud — All Apps (Annual)         $719.88 USD
Tax                                               $93.59 USD
                                                ---------
Total                                            $813.47 USD

Charged to Visa ending in 1234.
\`\`\`

Extracted JSON:
\`\`\`json
{
  "vendor": "Adobe Inc.",
  "description": "Adobe Creative Cloud — All Apps annual subscription",
  "category": "software",
  "amount": 719.88,
  "tax_amount": 93.59,
  "total": 813.47,
  "expense_date": "2026-04-01",
  "notes": "Charged in USD. Order #AD-2026-87729. Paid by Visa ending in 1234."
}
\`\`\`

## Example 3: Restaurant receipt for launch event

PDF content (looks like a scanned thermal receipt):
\`\`\`
PEARSON BAR & GRILL
123 Adelaide St W, Toronto

Date: 2026-07-09  21:14
Server: Maya  Table: Private Room

  Catering — Buffet (80 ppl) @ $35      $2,800.00
  Wine service                            $620.00
  Service charge (18%)                    $615.60

  Subtotal                              $4,035.60
  HST                                     $524.63
  TOTAL                                 $4,560.23

PAID  Visa  •••• 4321
Auth: 882199
\`\`\`

Extracted JSON:
\`\`\`json
{
  "vendor": "Pearson Bar & Grill",
  "description": "Issue 01 launch reception — buffet for 80 plus wine service",
  "category": "events",
  "amount": 4035.60,
  "tax_amount": 524.63,
  "total": 4560.23,
  "expense_date": "2026-07-09",
  "notes": "Paid by Visa ending 4321. Auth #882199. Service charge included."
}
\`\`\`

## Example 4: Simple TTC ride-share-style receipt with no tax line

PDF content:
\`\`\`
PRESTO TRANSIT RECEIPT

Card #: ••••2287
Trip date: 2026-06-12
Route: 504 King Streetcar
Fare: $3.30

Account holder: P. Lawton (treasurer)
\`\`\`

Extracted JSON:
\`\`\`json
{
  "vendor": "TTC",
  "description": "Streetcar fare — distribution day",
  "category": "travel",
  "amount": 3.30,
  "tax_amount": 0,
  "total": 3.30,
  "expense_date": "2026-06-12",
  "notes": "Presto card ending 2287. Volunteer reimbursement to P. Lawton."
}
\`\`\`

Notice: TTC fares in Ontario do NOT include HST (transit is exempt). Tax = 0, not null.

## Example 5: Freelance copy editor invoice with no tax

PDF content:
\`\`\`
Sarah Mitchell — Editorial Services
sarah.m.editor@gmail.com
416-555-0089

Bill: Rebrief Magazine
Date: April 25, 2026
For: Copy edit on Issue 01 essays (Crowley, Lawton, Kim)
Total: $1,200

Total due upon receipt — e-transfer to sarah.m.editor@gmail.com
\`\`\`

Extracted JSON:
\`\`\`json
{
  "vendor": "Sarah Mitchell",
  "description": "Copy editing for Issue 01 essays (Crowley, Lawton, Kim)",
  "category": "writing",
  "amount": 1200,
  "tax_amount": null,
  "total": 1200,
  "expense_date": "2026-04-25",
  "notes": "Sole proprietor below HST threshold. E-transfer to sarah.m.editor@gmail.com."
}
\`\`\`

Notice: No tax line shown, vendor is a sole-prop freelancer likely below the $30K HST registration threshold. Set tax_amount to null (we don't know whether it's exempt or just not charged) rather than 0.

## Example 6: Hotel folio (travel)

PDF content:
\`\`\`
THE OAKWOOD HOTEL — TORONTO
2 University Ave, Toronto, ON

Folio for: Carly Miller (Editor-in-Chief)
Check-in: 2026-06-08
Check-out: 2026-06-10

  Room (2 nights @ $245)                $490.00
  Parking                                $70.00
  Sub-total                             $560.00
  Toronto Lodging Tax (4%)               $22.40
  HST 13%                                $75.71
  Total                                 $658.11

Charged to corporate Visa.
\`\`\`

Extracted JSON:
\`\`\`json
{
  "vendor": "The Oakwood Hotel",
  "description": "Hotel stay — Carly Miller, distribution event",
  "category": "travel",
  "amount": 560,
  "tax_amount": 98.11,
  "total": 658.11,
  "expense_date": "2026-06-10",
  "notes": "Folio for Carly Miller. 2 nights + parking. Toronto lodging tax + HST combined ($22.40 + $75.71). Charged to corporate Visa."
}
\`\`\`

Notice: When multiple taxes apply (lodging tax + HST), sum into tax_amount. Use the check-out date as expense_date (when the bill was finalized).

# Final Reminders

- This data goes into a non-profit's audit-tracked ledger and informs CRA filings.
- Don't fabricate. Null is better than wrong.
- Pick the best category — don't default to \`other\` unless truly nothing fits.
- The treasurer reviews every extraction before saving.`

const EXPENSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    vendor: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    category: {
      type: ['string', 'null'],
      enum: [
        'printing', 'design', 'photography', 'writing',
        'distribution', 'events', 'marketing', 'software',
        'office', 'travel', 'professional_fees', 'other',
        null,
      ],
    },
    amount: { type: ['number', 'null'] },
    tax_amount: { type: ['number', 'null'] },
    total: { type: ['number', 'null'] },
    expense_date: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
  },
  required: [
    'vendor',
    'description',
    'category',
    'amount',
    'tax_amount',
    'total',
    'expense_date',
    'notes',
  ],
  additionalProperties: false,
}

export async function extractExpenseFromPDF(
  pdfBase64: string
): Promise<{ data?: ExtractedExpense; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: 'ANTHROPIC_API_KEY not configured.' }
  }

  try {
    const client = getAnthropic()

    const requestParams = {
      model: 'claude-opus-4-7',
      max_tokens: 8000,
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
          schema: EXPENSE_JSON_SCHEMA,
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
              text: 'Extract the expense data from this receipt/invoice PDF following the system instructions exactly. Return only the JSON object matching the schema.',
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

    const parsed = JSON.parse(textBlock.text) as ExtractedExpense
    return { data: parsed }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Extraction failed: ${message}` }
  }
}
