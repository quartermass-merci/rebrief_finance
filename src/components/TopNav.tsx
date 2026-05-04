'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const SECTIONS = [
  { href: '/', label: 'Overview', numeral: 'I' },
  { href: '/invoices', label: 'Invoices', numeral: 'II' },
  { href: '/expenses', label: 'Expenses', numeral: 'III' },
  { href: '/ledger', label: 'Ledger', numeral: 'IV' },
]

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 bg-paper rule-bottom">
      {/* Wire strip — always-on masthead lockup at full width */}
      <div className="px-6 md:px-10 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-8">
        <Link href="/" className="font-display text-[15px] tracking-[0.18em] text-ink">
          Rebrief <span className="text-gold mx-1">·</span> Treasury
        </Link>

        <nav className="flex justify-center">
          <ul className="flex items-baseline gap-7">
            {SECTIONS.map((s) => {
              const active = s.href === '/' ? pathname === '/' : pathname.startsWith(s.href)
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className={`font-display text-[12px] tracking-[0.18em] uppercase transition-colors flex items-baseline gap-1.5 ${
                      active ? 'text-ink' : 'text-ink/40 hover:text-ink'
                    }`}
                  >
                    <span className={active ? 'text-gold' : 'text-ink/30'}>{s.numeral}.</span>
                    <span>{s.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <form action={logout} className="justify-self-end">
          <button
            type="submit"
            className="font-meta text-[10px] tracking-[0.22em] text-ink/40 hover:text-gold transition-colors"
          >
            Sign Out ›
          </button>
        </form>
      </div>
    </header>
  )
}
