import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rebrief — Finances',
  description: 'Financial dashboard for Rebrief Magazine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
