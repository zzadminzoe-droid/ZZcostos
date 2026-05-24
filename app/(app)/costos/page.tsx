'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { useProductos, useFamilias } from '@/lib/hooks/useProductos'
import { useInsumos } from '@/lib/hooks/useInsumos'
import { calcularCostoProducto, calcularMargen, formatPeso, formatPct } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { Download, FileSpreadsheet } from 'lucide-react'
import type { Insumo } from '@/types'

export default function CostosPage() {
  const { data: productos, isLoading } = useProductos()
  const { data: familias } = useFamilias()
  const { data: insumos } = useInsumos()
  const [familiaFilter, setFamiliaFilter] = useState('todas')
  const [sortCol, setSortCol] = useState<string>('codigo')
  const [sortAsc, setSortAsc] = useState(true)

  const insumoMap = useMemo(() => {
    if (!insumos) return {}
    return Object.fromEntries(insumos.map(i => [i.id, i])) as Record<string, Insumo>
  }, [insumos])

  const rows = useMemo(() => {
    if (!productos) return []
    return productos
      .filter(p => familiaFilter === 'todas' || p.familia_id === familiaFilter)
      .map(p => {
        // Para calcular costos necesitamos el BOM — por ahora mostramos lo que calculamos del lado cliente
        // Los BOMs se cargan individualmente en la ficha; aquí mostramos resumen
        return { producto: p, familia: p.familia?.nombre ?? '—' }
      })
      .sort((a, b) => {
        const va = (a.producto as any)[sortCol] ?? ''
        const vb = (b.producto as any)[sortCol] ?? ''
        return sortAsc
          ? String(va).localeCompare(String(vb), undefined, { numeric: true })
          : String(vb).localeCompare(String(va), undefined, { numeric: true })
      })
  }, [productos, familiaFilter, sortCol, sortAsc])

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const Th = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={cn(
        'px-4 py-3 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none',
        right ? 'text-right' : 'text-left'
      )}
      onClick={() => toggleSort(col)}
    >
      {label} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  if (isLoading) return <PageSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Lista de Costos</h1>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs">
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <button className="btn-secondary text-xs">
            <Download size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* Filtro familia */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFamiliaFilter('todas')}
          className={cn('px-3 py-1.5 text-sm rounded-lg border transition-colors',
            familiaFilter === 'todas' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}>
          Todas
        </button>
        {familias?.map((f: any) => (
          <button key={f.id} onClick={() => setFamiliaFilter(f.id)}
            className={cn('px-3 py-1.5 text-sm rounded-lg border transition-colors',
              familiaFilter === f.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300')}>
            {f.nombre}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <Th col="codigo" label="Código" />
                <Th col="nombre" label="Producto" />
                <Th col="familia" label="Familia" />
                <Th col="precio_venta" label="Precio Venta" right />
                <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ producto, familia }) => (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{producto.codigo}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{producto.nombre}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{familia}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {producto.precio_venta > 0 ? formatPeso(producto.precio_venta) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {producto.precio_venta > 0
                      ? <span className="badge-success">Con precio</span>
                      : <span className="badge-warning">Sin precio</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
          {rows.length} productos · Los costos detallados se calculan en tiempo real en la ficha de cada producto
        </div>
      </div>
    </div>
  )
}
