'use client'

import { useMemo } from 'react'
import { useInsumos } from '@/lib/hooks/useInsumos'
import { useProductos } from '@/lib/hooks/useProductos'
import { useConfiguracion } from '@/lib/hooks/useConfiguracion'
import { PageSpinner } from '@/components/ui/Spinner'
import { AlertTriangle, XCircle, Info, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AlertasPage() {
  const { data: insumos, isLoading: loadingIns } = useInsumos()
  const { data: productos, isLoading: loadingProd } = useProductos()
  const { data: config } = useConfiguracion()

  const diasAlerta = parseInt(config?.alerta_dias_sin_actualizar ?? '30')

  const alertas = useMemo(() => {
    if (!insumos || !productos) return []
    const list: Array<{
      tipo: 'error' | 'warning' | 'info'
      titulo: string
      items: string[]
    }> = []

    // 1. Insumos sin precio
    const sinPrecio = insumos.filter(i => i.precio_sin_iva === 0)
    if (sinPrecio.length > 0) {
      list.push({
        tipo: 'error',
        titulo: `${sinPrecio.length} insumos sin precio`,
        items: sinPrecio.slice(0, 10).map(i => `${i.codigo} — ${i.nombre}`),
      })
    }

    // 2. Productos sin precio de venta
    const sinPrecioVenta = productos.filter(p => p.precio_venta === 0)
    if (sinPrecioVenta.length > 0) {
      list.push({
        tipo: 'warning',
        titulo: `${sinPrecioVenta.length} productos sin precio de venta`,
        items: sinPrecioVenta.slice(0, 10).map(p => `${p.codigo} — ${p.nombre}`),
      })
    }

    // 3. Insumos sin actualizar hace más de X días
    const ahora = new Date()
    const limite = new Date(ahora.getTime() - diasAlerta * 24 * 60 * 60 * 1000)
    const desactualizados = insumos.filter(i =>
      i.precio_sin_iva > 0 && new Date(i.updated_at) < limite
    )
    if (desactualizados.length > 0) {
      list.push({
        tipo: 'warning',
        titulo: `${desactualizados.length} insumos sin actualizar hace más de ${diasAlerta} días`,
        items: desactualizados.slice(0, 8).map(i => {
          const dias = Math.floor((ahora.getTime() - new Date(i.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          return `${i.codigo} — ${i.nombre} (${dias} días)`
        }),
      })
    }

    // 4. Info general
    const conPrecio = insumos.filter(i => i.precio_sin_iva > 0).length
    list.push({
      tipo: 'info',
      titulo: `Estado general: ${conPrecio}/${insumos.length} insumos con precio`,
      items: [
        `${productos.filter(p => p.precio_venta > 0).length} productos con precio de venta`,
        `Última revisión: ${new Date().toLocaleDateString('es-AR')}`,
      ],
    })

    return list
  }, [insumos, productos, diasAlerta])

  if (loadingIns || loadingProd) return <PageSpinner />

  const errores = alertas.filter(a => a.tipo === 'error')
  const warnings = alertas.filter(a => a.tipo === 'warning')
  const infos = alertas.filter(a => a.tipo === 'info')

  const iconos = {
    error:   { icon: XCircle,       bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-600',    label: 'text-red-700' },
    warning: { icon: AlertTriangle,  bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-600', label: 'text-yellow-800' },
    info:    { icon: Info,           bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-500',   label: 'text-blue-800' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Alertas del sistema</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <XCircle size={14} className="text-red-500" />{errores.length} errores
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-yellow-500" />{warnings.length} advertencias
          </span>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Todo en orden</p>
          <p className="text-sm text-gray-400 mt-1">No hay alertas activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...errores, ...warnings, ...infos].map((alerta, i) => {
            const cfg = iconos[alerta.tipo]
            const Icon = cfg.icon
            return (
              <div key={i} className={cn('card p-4 border', cfg.border, cfg.bg)}>
                <div className="flex items-start gap-3">
                  <Icon size={17} className={cn('mt-0.5 shrink-0', cfg.text)} />
                  <div className="flex-1">
                    <p className={cn('text-sm font-semibold', cfg.label)}>{alerta.titulo}</p>
                    {alerta.items.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {alerta.items.map((item, j) => (
                          <li key={j} className={cn('text-xs', cfg.label, 'opacity-80')}>
                            · {item}
                          </li>
                        ))}
                        {alerta.items.length === 10 && (
                          <li className={cn('text-xs italic', cfg.label, 'opacity-60')}>
                            y más...
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Configuración de alertas */}
      <div className="mt-6 card p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock size={14} />
          <span>Días sin actualizar para alertar: <strong>{diasAlerta}</strong></span>
          <span className="text-gray-400 text-xs ml-2">(configurable en tabla configuracion)</span>
        </div>
      </div>
    </div>
  )
}
