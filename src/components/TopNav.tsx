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
      <div className="px-5 md:px-10 py-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8">
        <Link
          href="/"
          className="font-display text-[17px] md:text-[21px] tracking-[0.16em] text-ink whitespace-nowrap"
        >
          Rebrief <span className="text-gold mx-0.5 md:mx-1">·</span> Treasury
        </Link>

        <nav className="flex justify-center min-w-0">
          <ul className="flex items-baseline gap-4 md:gap-7 lg:gap-8 flex-wrap justify-center">
            {SECTIONS.map((s) => {
              const active = s.href === '/' ? pathname === '/' : pathname.startsWith(s.href)
              return (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className={`font-display text-[14px] md:text-[17px] tracking-[0.16em] uppercase transition-colors flex items-baseline gap-1.5 md:gap-2 whitespace-nowrap ${
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
            className="font-meta text-[11px] md:text-[14px] tracking-[0.22em] text-ink/40 hover:text-gold transition-colors whitespace-nowrap"
          >
            Sign Out ›
          </button>
        </form>
      </div>
    </header>
  )
}
