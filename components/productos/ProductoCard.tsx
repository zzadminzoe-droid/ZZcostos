'use client'

import { useMemo } from 'react'
import { useBomItems } from '@/lib/hooks/useProductos'
import { calcularCostoProducto, calcularMargen, formatPeso, formatPct } from '@/lib/calculos'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react'
import type { Producto, Insumo } from '@/types'

interface Props {
  producto: Producto
  insumoMap: Record<string, Insumo>
  onClick: () => void
}

export function ProductoCard({ producto, insumoMap, onClick }: Props) {
  const { data: bomItems } = useBomItems(producto.id)

  const bomConPrecios = useMemo(() => {
    if (!bomItems) return []
    return bomItems.map(item => ({
      ...item,
      insumo: insumoMap[item.insumo_id],
    }))
  }, [bomItems, insumoMap])

  const costo = useMemo(
    () => calcularCostoProducto(
      bomConPrecios as any,
      producto.mano_de_obra,
      producto.gastos_fijos,
      producto.incluir_adicionales
    ),
    [bomConPrecios, producto]
  )

  const margen = useMemo(
    () => producto.precio_venta > 0
      ? calcularMargen(producto.precio_venta, costo.costo_sin_iva)
      : null,
    [producto.precio_venta, costo.costo_sin_iva]
  )

  const pendiente = !bomItems || bomItems.length === 0 || costo.tiene_insumos_sin_precio
  const sinBOM = !bomItems || bomItems.length === 0

  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:shadow-md hover:border-brand-200 transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-mono text-xs text-gray-400">{producto.codigo}</p>
          <p className="text-sm font-semibold text-gray-900 leading-tight mt-0.5 group-hover:text-brand-600 transition-colors">
            {producto.nombre}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{producto.familia?.nombre}</p>
        </div>
        <ChevronRight size={15} className="text-gray-300 group-hover:text-brand-400 mt-1 shrink-0 transition-colors" />
      </div>

      <div className="mt-3 space-y-1.5">
        {sinBOM ? (
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-xs text-red-500">Sin BOM cargado</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Costo C/IVA</span>
              <span className={cn(
                'text-sm font-semibold tabular-nums',
                pendiente ? 'text-orange-500' : 'text-gray-900'
              )}>
                {costo.costo_con_iva > 0 ? formatPeso(costo.costo_con_iva) : '—'}
              </span>
            </div>

            {producto.precio_venta > 0 && margen && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">PV / Margen</span>
                <span className={cn(
                  'text-xs font-medium',
                  margen.estado === 'bueno' ? 'text-green-600' :
                  margen.estado === 'regular' ? 'text-yellow-600' : 'text-red-500'
                )}>
                  {formatPeso(producto.precio_venta)} / {formatPct(margen.margen_contribucion_pct)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1.5">
        {pendiente ? (
          <>
            <AlertCircle size={11} className="text-orange-400" />
            <span className="text-xs text-orange-500">
              {sinBOM ? 'Sin BOM' : `${costo.insumos_faltantes.length} sin precio`}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 size={11} className="text-green-500" />
            <span className="text-xs text-green-600">Costeado</span>
          </>
        )}
        {!sinBOM && (
          <span className="ml-auto text-xs text-gray-400">{bomItems?.length} ítems</span>
        )}
      </div>
    </button>
  )
}
