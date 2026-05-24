'use client'

import { useState, useMemo } from 'react'
import { Save, Loader2, Info } from 'lucide-react'
import { useInsumos, useUpdatePrecioInsumo } from '@/lib/hooks/useInsumos'
import { formatPeso } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Insumo } from '@/types'
import toast from 'react-hot-toast'

// Barras madre de flejes/caños (códigos que empiezan con 6.)
const BARRAS_CODIGOS = ['6.1', '6.2', '6.3', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6']

export function PreciosFlejes() {
  const { data: insumos, isLoading } = useInsumos()
  const updatePrecio = useUpdatePrecioInsumo()
  const [precios, setPrecios] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Barras madre
  const barrasMadre = useMemo(() => {
    if (!insumos) return []
    return insumos.filter(i =>
      BARRAS_CODIGOS.some(c => i.codigo === c) ||
      (i.tipo_precio === 'manual' && /^[56]\.\d+$/.test(i.codigo) && !i.codigo.includes('.', 2))
    ).sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  }, [insumos])

  // Hijos agrupados por barra madre
  const hijosPorMadre = useMemo(() => {
    if (!insumos) return {}
    const map: Record<string, typeof insumos> = {}
    for (const barra of barrasMadre) {
      map[barra.codigo] = insumos
        .filter(i =>
          i.codigo.startsWith(barra.codigo + '.') &&
          i.codigo !== barra.codigo
        )
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    }
    return map
  }, [insumos, barrasMadre])

  function getPrecioMadre(codigo: string, fallback: number) {
    return parseFloat(precios[codigo] ?? '') || fallback
  }

  function calcularHijo(hijo: Insumo, precioBarra: number) {
    const params = hijo.formula_params?.params as any
    if (!params) return null
    const largoCorte = params.largo_corte_mm ?? params.largo_mm ?? 0
    const largoBarra = params.largo_barra_mm ?? 6000
    if (!largoCorte) return null
    return (largoCorte / largoBarra) * precioBarra
  }

  async function handleGuardar() {
    setSaving(true)
    try {
      let total = 0
      for (const barra of barrasMadre) {
        const nuevoPrecio = parseFloat(precios[barra.codigo] ?? '')
        if (!isNaN(nuevoPrecio) && nuevoPrecio !== barra.precio_sin_iva) {
          await updatePrecio.mutateAsync({ id: barra.id, precio: nuevoPrecio })
          total++
          // Recalcular hijos
          const hijos = hijosPorMadre[barra.codigo] ?? []
          for (const hijo of hijos) {
            const p = calcularHijo(hijo, nuevoPrecio)
            if (p !== null) {
              await updatePrecio.mutateAsync({ id: hijo.id, precio: p })
              total++
            }
          }
        }
      }
      toast.success(`${total} precios actualizados`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageSpinner />

  if (barrasMadre.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm">
        No se encontraron barras/flejes madre. Los insumos calculados se configuran via formula_params.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleGuardar} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar y recalcular todos
        </button>
      </div>

      {barrasMadre.map(barra => {
        const precioBarra = getPrecioMadre(barra.codigo, barra.precio_sin_iva)
        const hijos = hijosPorMadre[barra.codigo] ?? []

        return (
          <div key={barra.id} className="card overflow-hidden">
            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-4">
              <div>
                <span className="font-mono text-xs text-gray-500 mr-2">{barra.codigo}</span>
                <span className="text-sm font-medium text-gray-800">{barra.nombre}</span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Precio barra/rollo:</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={precios[barra.codigo] ?? barra.precio_sin_iva}
                      onChange={e => setPrecios(p => ({ ...p, [barra.codigo]: e.target.value }))}
                      className="input-field text-sm pl-6 w-32 h-8"
                    />
                  </div>
                </div>
              </div>
            </div>

            {hijos.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Código</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Nombre</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Largo (mm)</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Precio actual</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Precio nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hijos.map(h => {
                    const params = h.formula_params?.params as any
                    const largo = params?.largo_corte_mm ?? params?.largo_mm ?? '—'
                    const nuevo = calcularHijo(h, precioBarra)
                    return (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{h.codigo}</td>
                        <td className="px-4 py-2 text-gray-800">{h.nombre}</td>
                        <td className="px-4 py-2 text-right text-gray-500 text-xs tabular-nums">{largo}</td>
                        <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{formatPeso(h.precio_sin_iva)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {nuevo !== null
                            ? <span className="text-orange-600 font-medium">{formatPeso(nuevo)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-3 text-xs text-gray-400">Sin cortes registrados</p>
            )}
          </div>
        )
      })}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Info size={11} />
        Fórmula: (largo_corte_mm / largo_barra_mm) × precio_barra
      </div>
    </div>
  )
}
