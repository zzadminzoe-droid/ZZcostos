import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Navbar } from '@/components/layout/Navbar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const nombre = user.email?.split('@')[0] ?? 'Usuario'

  return (
    <div className="min-h-screen bg-surface">
      <Navbar userName={nombre} />
      <main className="pt-14 max-w-screen-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
