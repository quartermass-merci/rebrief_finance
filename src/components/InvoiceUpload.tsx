'use client'

import { useState, useRef } from 'react'
import { extractInvoiceFromPDF } from '@/app/actions/invoices'
import type { ExtractedInvoice } from '@/lib/types'

interface Props {
  onExtracted: (data: ExtractedInvoice) => void
}

export function InvoiceUpload({ onExtracted }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10MB.')
      return
    }

    setIsExtracting(true)

    try {
      const buffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )

      const result = await extractInvoiceFromPDF(base64)

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        onExtracted(result.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsExtracting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isExtracting && fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-sm px-6 py-5 transition-colors ${
          isExtracting
            ? 'border-rebrief-gold bg-rebrief-cream/30 cursor-wait'
            : isDragging
            ? 'border-rebrief-gold bg-rebrief-cream/50'
            : 'border-rebrief-cream bg-white hover:border-rebrief-gold/50 hover:bg-rebrief-cream/10'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {isExtracting ? (
              <Spinner />
            ) : (
              <svg
                className="w-8 h-8 text-rebrief-gold/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25"
                />
              </svg>
            )}
          </div>

          <div className="flex-1">
            {isExtracting ? (
              <>
                <p className="text-sm font-medium text-rebrief-dark">Reading invoice...</p>
                <p className="text-[11px] text-rebrief-dark/40 mt-0.5">
                  Claude is extracting fields from the PDF — this takes 5–15 seconds
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-rebrief-dark">
                  Drop an invoice PDF to auto-fill
                </p>
                <p className="text-[11px] text-rebrief-dark/40 mt-0.5">
                  Or click to browse — extraction is reviewed before saving
                </p>
              </>
            )}
          </div>

          {!isExtracting && (
            <span className="font-meta text-[10px] tracking-[0.2em] uppercase text-rebrief-gold">
              AI · PDF
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rebrief-red px-1">{error}</p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-8 h-8 animate-spin text-rebrief-gold" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
