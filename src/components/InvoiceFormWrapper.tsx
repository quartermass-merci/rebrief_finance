'use client'

import { useState } from 'react'
import { InvoiceForm } from './InvoiceForm'

export function InvoiceFormWrapper({ nextNumber }: { nextNumber: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-6 px-4 py-2 bg-rebrief-dark text-rebrief-light text-xs font-medium
                   tracking-wider uppercase rounded-sm hover:bg-rebrief-gold transition-colors"
      >
        + New Invoice
      </button>

      {open && (
        <InvoiceForm
          nextNumber={nextNumber}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
