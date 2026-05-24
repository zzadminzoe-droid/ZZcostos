'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { clsx } from 'clsx'
import { getSupabaseBrowser } from '@/lib/supabase'
import { useState } from 'react'

const TABS = [
  { href: '/insumos',   label: 'Insumos' },
  { href: '/productos', label: 'Productos' },
  { href: '/costos',    label: 'Lista de Costos' },
  { href: '/precios',   label: 'Lista de Precios' },
  { href: '/alertas',   label: 'Alertas' },
]

interface NavbarProps {
  userName?: string
  alertCount?: number
}

export function Navbar({ userName = 'Usuario', alertCount = 0 }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1A202C] border-b border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-14">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">ZZ</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">
            ZZ Percusión
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 flex-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  'relative px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                {tab.label}
                {tab.href === '/alertas' && alertCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Usuario */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <User size={14} className="text-gray-400" />
            <span className="hidden sm:block">{userName}</span>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  )
}
