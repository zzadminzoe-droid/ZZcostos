'use client'

import { useState, useMemo } from 'react'
import { Save, Loader2, Info } from 'lucide-react'
import { useInsumos, useUpdatePrecioInsumo } from '@/lib/hooks/useInsumos'
import { calcularPrecioFundicion } from '@/lib/precios-calculados'
import { formatPeso } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

export function PreciosFundicion() {
  const { data: insumos, isLoading } = useInsumos()
  const updatePrecio = useUpdatePrecioInsumo()

  const [precioPorGramo, setPrecioPorGramo] = useState('20')
  const [precioCromado, setPrecioCromado] = useState('34.98')
  const [saving, setSaving] = useState(false)

  // Insumos de fundición (categoría FUNDICION ALUMINIO, código empieza con 3.)
  const piezas = useMemo(() => {
    if (!insumos) return []
    return insumos
      .filter(i => i.codigo.startsWith('3.') && (i.formula_params || i.tipo_precio === 'calculado'))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  }, [insumos])

  const precioPorGramoNum = parseFloat(precioPorGramo) || 0
  const precioCromadoNum = parseFloat(precioCromado) || 0

  function calcularNuevo(pieza: typeof piezas[0]) {
    const params = pieza.formula_params?.params as any
    if (!params?.peso_gramos) return null
    return calcularPrecioFundicion(
      { peso_gramos: params.peso_gramos, tiene_cromado: params.tiene_cromado ?? false },
      precioPorGramoNum,
      precioCromadoNum
    )
  }

  async function handleGuardar() {
    setSaving(true)
    try {
      let actualizados = 0
      for (const pieza of piezas) {
        const nuevo = calcularNuevo(pieza)
        if (nuevo !== null) {
          await updatePrecio.mutateAsync({ id: pieza.id, precio: nuevo })
          actualizados++
        }
      }
      toast.success(`${actualizados} piezas actualizadas`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Parámetros de fundición</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio por gramo — Fundición ($)</label>
            <input type="number" step="0.01" value={precioPorGramo}
              onChange={e => setPrecioPorGramo(e.target.value)}
              className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio por gramo — Cromado ($)</label>
            <input type="number" step="0.01" value={precioCromado}
              onChange={e => setPrecioCromado(e.target.value)}
              className="input-field text-sm" />
          </div>
          <div className="flex items-end col-span-2 md:col-span-2">
            <button onClick={handleGuardar} disabled={saving || piezas.length === 0}
              className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar y recalcular ({piezas.length} piezas)
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <Info size={11} />
          Fórmula: peso_g × precio_fundicion + (cromado ? peso_g × precio_cromado : 0)
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Nombre</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Peso (g)</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500 text-xs">Cromado</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Precio actual</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Precio nuevo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {piezas.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">
                No hay piezas con fórmula de fundición configurada
              </td></tr>
            ) : piezas.map(p => {
              const params = p.formula_params?.params as any
              const nuevo = calcularNuevo(p)
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="px-4 py-2.5 text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{params?.peso_gramos ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {params?.tiene_cromado
                      ? <span className="badge-info text-[10px]">Sí</span>
                      : <span className="text-gray-300 text-xs">No</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{formatPeso(p.precio_sin_iva)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {nuevo !== null
                      ? <span className="text-orange-600 font-medium">{formatPeso(nuevo)}</span>
                      : <span className="text-gray-300">Sin fórmula</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
