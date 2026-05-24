'use client'

import { useState, useMemo } from 'react'
import { Save, Loader2, Info } from 'lucide-react'
import { useInsumos, useUpdatePrecioInsumo } from '@/lib/hooks/useInsumos'
import { calcularPrecioChapa } from '@/lib/precios-calculados'
import { formatPeso } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Insumo } from '@/types'
import toast from 'react-hot-toast'

export function PreciosChapa() {
  const { data: insumos, isLoading } = useInsumos()
  const updatePrecio = useUpdatePrecioInsumo()

  const [precioCromado, setPrecioCromado] = useState('0')
  const [preciosChapa, setPreciosChapa] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Chapas madre (categoría CHAPAS, sin punto extra)
  const chapasMadre = useMemo(() => {
    if (!insumos) return []
    return insumos
      .filter(i => i.categoria?.nombre === 'CHAPAS' && !/\.\d+\./.test(i.codigo))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  }, [insumos])

  const hijosPorMadre = useMemo(() => {
    if (!insumos) return {}
    const map: Record<string, typeof insumos> = {}
    for (const chapa of chapasMadre) {
      map[chapa.codigo] = insumos
        .filter(i => i.precio_base_ref === chapa.codigo && i.tipo_precio === 'calculado')
        .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
    }
    return map
  }, [insumos, chapasMadre])

  function getPrecioChapa(codigo: string, fallback: number) {
    return parseFloat(preciosChapa[codigo] ?? '') || fallback
  }

  function calcularNuevo(hijo: Insumo, precioChapa: number) {
    const params = hijo.formula_params?.params as any
    if (!params?.largo_mm) return null
    return calcularPrecioChapa(
      { largo_mm: params.largo_mm, alto_mm: params.alto_mm ?? 1, tiene_cromado: params.tiene_cromado ?? false },
      precioChapa,
      parseFloat(precioCromado) || 0
    )
  }

  async function handleGuardar() {
    setSaving(true)
    try {
      let total = 0
      for (const chapa of chapasMadre) {
        const nuevoPrecio = parseFloat(preciosChapa[chapa.codigo] ?? '')
        if (!isNaN(nuevoPrecio) && nuevoPrecio !== chapa.precio_sin_iva) {
          await updatePrecio.mutateAsync({ id: chapa.id, precio: nuevoPrecio })
          total++
        }
        const hijos = hijosPorMadre[chapa.codigo] ?? []
        const precioUsar = isNaN(nuevoPrecio) ? chapa.precio_sin_iva : nuevoPrecio
        for (const h of hijos) {
          const p = calcularNuevo(h, precioUsar)
          if (p !== null) {
            await updatePrecio.mutateAsync({ id: h.id, precio: p })
            total++
          }
        }
      }
      toast.success(`${total} precios actualizados`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Parámetros generales</h2>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio cromado (adicional por pieza $)</label>
            <input type="number" step="0.01" value={precioCromado}
              onChange={e => setPrecioCromado(e.target.value)}
              className="input-field text-sm w-40" />
          </div>
          <button onClick={handleGuardar} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar y recalcular todos
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <Info size={11} />
          Fórmula: (largo × alto) / (1220 × 2440) × precio_chapa + (cromado ? precio_cromado : 0)
        </p>
      </div>

      {chapasMadre.map(chapa => {
        const precioChapa = getPrecioChapa(chapa.codigo, chapa.precio_sin_iva)
        const hijos = hijosPorMadre[chapa.codigo] ?? []
        return (
          <div key={chapa.id} className="card overflow-hidden">
            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center gap-4">
              <div>
                <span className="font-mono text-xs text-gray-500 mr-2">{chapa.codigo}</span>
                <span className="text-sm font-medium text-gray-800">{chapa.nombre}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-xs text-gray-500">Precio chapa:</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                  <input type="number" step="0.01"
                    value={preciosChapa[chapa.codigo] ?? chapa.precio_sin_iva}
                    onChange={e => setPreciosChapa(p => ({ ...p, [chapa.codigo]: e.target.value }))}
                    className="input-field text-sm pl-6 w-32 h-8" />
                </div>
              </div>
            </div>
            {hijos.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Código</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Nombre</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs">Cromado</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Precio actual</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Precio nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hijos.map(h => {
                    const params = h.formula_params?.params as any
                    const nuevo = calcularNuevo(h, precioChapa)
                    return (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{h.codigo}</td>
                        <td className="px-4 py-2 text-gray-800">{h.nombre}</td>
                        <td className="px-4 py-2 text-center">
                          {params?.tiene_cromado
                            ? <span className="badge-info text-[10px]">Sí</span>
                            : <span className="text-gray-300 text-xs">No</span>}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{formatPeso(h.precio_sin_iva)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {nuevo !== null
                            ? <span className="text-orange-600 font-medium">{formatPeso(nuevo)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-3 text-xs text-gray-400">Sin piezas con fórmula registradas</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
