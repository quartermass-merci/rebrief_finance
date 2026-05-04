'use client'

import { useState, useRef } from 'react'
import { extractExpenseFromPDF } from '@/app/actions/expenses'
import type { ExtractedExpense } from '@/lib/types'

interface Props {
  onExtracted: (data: ExtractedExpense) => void
}

export function ExpenseUpload({ onExtracted }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')

    if (file.type !== 'application/pdf') {
      setError('PDF only. Photographed receipts can be saved as PDF first.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Heavy file — keep it under 10MB.')
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

      const result = await extractExpenseFromPDF(base64)

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
    <div>
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
        className={`relative cursor-pointer transition-colors px-6 py-7 ${
          isExtracting
            ? 'bg-paper-shade/40 cursor-wait'
            : isDragging
              ? 'bg-paper-shade'
              : 'bg-transparent hover:bg-paper-shade/30'
        }`}
        style={{
          backgroundImage: isExtracting || isDragging
            ? 'none'
            : `repeating-linear-gradient(135deg, transparent 0 6px, rgba(122, 111, 58, 0.18) 6px 7px)`,
          backgroundSize: '14px 14px',
        }}
      >
        {/* Register marks at corners */}
        <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-ink/40" />
        <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-ink/40" />
        <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-ink/40" />
        <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-ink/40" />

        <div className="relative flex items-baseline justify-between gap-6">
          <div className="flex-1">
            {isExtracting ? (
              <>
                <p className="font-display text-[20px] tracking-[0.04em] text-ink leading-tight">
                  Reading the receipt<span className="inline-block animate-pulse">...</span>
                </p>
                <p className="mt-2 font-body italic text-ink/50">
                  Claude is parsing vendor, amount, category, and date. Five to fifteen seconds.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-[20px] md:text-[26px] tracking-[0.02em] text-ink leading-[1] uppercase">
                  Drop a Receipt or Vendor Invoice
                </p>
                <p className="mt-2 font-body italic text-ink/55">
                  Auto-extracts vendor, amount, category, and date — review before filing.
                </p>
              </>
            )}
          </div>

          <span className="font-meta text-[9px] tracking-[0.3em] text-gold whitespace-nowrap">
            Reading by AI
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-3 font-meta text-[10px] tracking-[0.18em] text-orange uppercase">
          {error}
        </p>
      )}
    </div>
  )
}
