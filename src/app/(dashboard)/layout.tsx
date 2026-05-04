import { TopNav } from '@/components/TopNav'
import { Colophon } from '@/components/Colophon'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          {children}
        </div>
      </main>
      <Colophon />
    </div>
  )
}
