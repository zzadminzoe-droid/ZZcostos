'use client'

import { useState, useMemo } from 'react'
import { useProductos, useFamilias } from '@/lib/hooks/useProductos'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatPeso } from '@/lib/calculos'
import { cn } from '@/lib/utils'
import { Download, Eye, EyeOff } from 'lucide-react'

export default function PreciosPage() {
  const { data: productos, isLoading } = useProductos()
  const { data: familias } = useFamilias()
  const [familiaFilter, setFamiliaFilter] = useState('todas')
  const [modoCliente, setModoCliente] = useState(false)

  const conPrecio = useMemo(
    () => productos?.filter(p => p.precio_venta > 0) ?? [],
    [productos]
  )

  const filtered = useMemo(
    () => conPrecio.filter(p => familiaFilter === 'todas' || p.familia_id === familiaFilter),
    [conPrecio, familiaFilter]
  )

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lista de Precios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{conPrecio.length} productos con precio de venta</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModoCliente(!modoCliente)}
            className={cn('btn-secondary text-xs gap-1.5', modoCliente && 'bg-brand-50 border-brand-200 text-brand-700')}
          >
            {modoCliente ? <EyeOff size={13} /> : <Eye size={13} />}
            {modoCliente ? 'Modo cliente' : 'Modo interno'}
          </button>
          <button className="btn-secondary text-xs">
            <Download size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFamiliaFilter('todas')}
          className={cn('px-3 py-1.5 text-sm rounded-lg border transition-colors',
            familiaFilter === 'todas' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200')}>
          Todas
        </button>
        {familias?.map((f: any) => (
          <button key={f.id} onClick={() => setFamiliaFilter(f.id)}
            className={cn('px-3 py-1.5 text-sm rounded-lg border transition-colors',
              familiaFilter === f.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200')}>
            {f.nombre}
          </button>
        ))}
      </div>

      {modoCliente && (
        <div className="mb-4 p-3 bg-brand-50 border border-brand-100 rounded-lg text-xs text-brand-700 flex items-center gap-2">
          <Eye size={13} />
          Modo cliente activo — solo se muestra código, nombre y precio de venta
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Producto</th>
              {!modoCliente && (
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Familia</th>
              )}
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Precio de Venta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-xs text-gray-400">
                No hay productos con precio de venta definido en esta categoría
              </td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nombre}</td>
                  {!modoCliente && (
                    <td className="px-4 py-3 text-xs text-gray-500">{p.familia?.nombre ?? '—'}</td>
                  )}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums text-base">
                    {formatPeso(p.precio_venta)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
            {filtered.length} productos
          </div>
        )}
      </div>
    </div>
  )
}
