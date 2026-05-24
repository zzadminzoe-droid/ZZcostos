'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProductosConCostos, useFamilias } from '@/lib/hooks/useProductos'
import { formatPeso, formatPct } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import { Download, FileSpreadsheet, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react'
import { BtnDescargarPDF } from '@/components/ui/BtnDescargarPDF'

export default function CostosPage() {
  const router = useRouter()
  const { data: productos, isLoading } = useProductosConCostos()
  const { data: familias } = useFamilias()
  const [familiaFilter, setFamiliaFilter] = useState('todas')
  const [sortCol, setSortCol] = useState<string>('codigo')
  const [sortAsc, setSortAsc] = useState(true)

  const rows = useMemo(() => {
    if (!productos) return []
    return productos
      .filter(p => familiaFilter === 'todas' || p.familia_id === familiaFilter)
      .sort((a, b) => {
        let va: unknown = (a as any)[sortCol]
        let vb: unknown = (b as any)[sortCol]
        if (sortCol === 'familia') { va = a.familia?.nombre ?? ''; vb = b.familia?.nombre ?? '' }
        if (sortCol === 'costo_sin_iva' || sortCol === 'margen') {
          return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number)
        }
        return sortAsc
          ? String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true })
          : String(vb ?? '').localeCompare(String(va ?? ''), undefined, { numeric: true })
      })
  }, [productos, familiaFilter, sortCol, sortAsc])

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const Th = ({ col, label, right }: { col: string; label: string; right?: boolean }) => (
    <th
      className={cn(
        'px-4 py-3 font-medium text-gray-500 text-xs cursor-pointer hover:text-gray-700 select-none whitespace-nowrap',
        right ? 'text-right' : 'text-left'
      )}
      onClick={() => toggleSort(col)}
    >
      {label} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  if (isLoading) return <PageSpinner />

  const fecha = new Date().toLocaleDateString('es-AR')
  const pdfData = rows.map(p => ({
    codigo: p.codigo,
    nombre: p.nombre,
    familia: p.familia?.nombre ?? '—',
    costo_sin_iva: (p as any).costo_sin_iva,
    costo_con_iva: (p as any).costo_con_iva,
    precio_venta: p.precio_venta,
    total_bom_items: (p as any).total_bom_items,
    items_sin_precio: (p as any).items_sin_precio,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Lista de Costos</h1>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs">
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <BtnDescargarPDF
            label="PDF"
            filename={`ZZ-costos-${fecha}.pdf`}
            buildDocument={async () => {
              const { PDFCostos } = await import('@/lib/pdf/pdf-costos')
              return <PDFCostos productos={pdfData} fecha={fecha} />
            }}
          />
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
                <Th col="codigo"       label="Código" />
                <Th col="nombre"       label="Producto" />
                <Th col="familia"      label="Familia" />
                <Th col="costo_sin_iva" label="Costo S/IVA" right />
                <Th col="costo_con_iva" label="Costo C/IVA" right />
                <Th col="precio_venta"  label="Precio Venta" right />
                <Th col="margen"        label="Contrib. Marginal" right />
                <Th col="margen_pct"    label="Margen %" right />
                <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs whitespace-nowrap">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((producto) => {
                const p = producto as any
                const costoSinIva: number = p.costo_sin_iva
                const costoConIva: number = p.costo_con_iva
                const precioVenta: number = p.precio_venta
                const totalItems: number = p.total_bom_items
                const sinPrecio: number = p.items_sin_precio

                const contrib = precioVenta > 0 ? precioVenta - costoSinIva : null
                const margenPct = contrib !== null && precioVenta > 0
                  ? (contrib / precioVenta) * 100
                  : null

                const margenColor = margenPct === null ? ''
                  : margenPct >= 20 ? 'text-green-600'
                  : margenPct >= 10 ? 'text-yellow-600'
                  : 'text-red-500'

                return (
                  <tr
                    key={producto.id}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    onClick={() => router.push('/productos/' + encodeURIComponent(producto.codigo))}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{producto.codigo}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{producto.nombre}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{producto.familia?.nombre ?? '—'}</td>

                    {/* Costo S/IVA */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {costoSinIva > 0
                        ? formatPeso(costoSinIva)
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Costo C/IVA */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-500 text-xs">
                      {costoConIva > 0
                        ? formatPeso(costoConIva)
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Precio Venta */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {precioVenta > 0
                        ? formatPeso(precioVenta)
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Contrib. Marginal */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                      {contrib !== null
                        ? formatPeso(contrib)
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Margen % */}
                    <td className={cn('px-4 py-2.5 text-right tabular-nums font-medium', margenColor)}>
                      {margenPct !== null
                        ? formatPct(margenPct)
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-2.5 text-right">
                      {totalItems === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <MinusCircle size={13} /> Sin BOM
                        </span>
                      ) : sinPrecio > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-medium whitespace-nowrap">
                          <AlertTriangle size={13} /> Costo incompleto
                        </span>
                      ) : (
                        <CheckCircle2 size={16} className="text-green-500 ml-auto" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
          {rows.length} productos · Click en una fila para ver la ficha completa
        </div>
      </div>
    </div>
  )
}
