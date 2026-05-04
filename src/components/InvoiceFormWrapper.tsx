'use client'

import { useState } from 'react'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceUpload } from './InvoiceUpload'
import type { ExtractedInvoice } from '@/lib/types'

export function InvoiceFormWrapper({ nextNumber }: { nextNumber: string }) {
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState<ExtractedInvoice | null>(null)

  function handleExtracted(data: ExtractedInvoice) {
    setPrefill(data)
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setPrefill(null)
  }

  return (
    <>
      <InvoiceUpload onExtracted={handleExtracted} />

      <button
        onClick={() => {
          setPrefill(null)
          setOpen(true)
        }}
        className="mb-6 px-4 py-2 bg-rebrief-dark text-rebrief-light text-xs font-medium
                   tracking-wider uppercase rounded-sm hover:bg-rebrief-gold transition-colors"
      >
        + New Invoice
      </button>

      {open && (
        <InvoiceForm
          nextNumber={nextNumber}
          prefill={prefill}
          onClose={handleClose}
        />
      )}
    </>
  )
}
