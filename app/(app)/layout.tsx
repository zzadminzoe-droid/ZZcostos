import { Navbar } from '@/components/layout/Navbar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="pt-14 max-w-screen-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
