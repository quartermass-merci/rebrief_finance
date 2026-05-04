import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rebrief — Treasury',
  description: 'The financial ledger of Rebrief Magazine. Imprinted Tkaronto.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
