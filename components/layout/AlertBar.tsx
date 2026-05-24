'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { AlertaSistema } from '@/types'

interface AlertBarProps {
  alertas: AlertaSistema[]
}

export function AlertBar({ alertas }: AlertBarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const criticas = alertas.filter((a) => a.tipo === 'error')

  if (criticas.length === 0) return null

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-red-600 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center gap-3">
        <AlertTriangle size={15} className="shrink-0" />
        <div className="flex-1 text-sm">
          {collapsed ? (
            <span className="font-medium">
              {criticas.length} alerta{criticas.length > 1 ? 's' : ''} crítica
              {criticas.length > 1 ? 's' : ''} activa{criticas.length > 1 ? 's' : ''}
            </span>
          ) : (
            <div className="space-y-0.5">
              {criticas.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <span className="font-medium">{a.titulo}:</span>
                  <span className="opacity-90">{a.descripcion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-red-700 rounded transition-colors"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <ChevronDown size={14} className={collapsed ? 'rotate-180' : ''} />
        </button>
      </div>
    </div>
  )
}
