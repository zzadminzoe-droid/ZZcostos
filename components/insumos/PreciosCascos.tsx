'use client'

import { useState, useMemo } from 'react'
import { Save, Loader2, Info } from 'lucide-react'
import { useInsumos, useUpdatePrecioInsumo } from '@/lib/hooks/useInsumos'
import { calcularPrecioCasco } from '@/lib/precios-calculados'
import { formatPeso } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

const PLACA_CODIGO = '1.1'

export function PreciosCascos() {
  const { data: insumos, isLoading } = useInsumos()
  const updatePrecio = useUpdatePrecioInsumo()

  // Placa base
  const placaBase = useMemo(
    () => insumos?.find(i => i.codigo === PLACA_CODIGO),
    [insumos]
  )

  const [precioPlaca, setPrecioPlaca] = useState<string>('')
  const [anchoPlaca, setAnchoPlaca] = useState('2200')
  const [altoPlaca, setAltoPlaca] = useState('1600')
  const [saving, setSaving] = useState(false)

  // Inicializar desde DB
  useMemo(() => {
    if (placaBase && !precioPlaca) {
      setPrecioPlaca(String(placaBase.precio_sin_iva))
    }
  }, [placaBase])

  // Láminas (hijos de la placa)
  const laminas = useMemo(() => {
    if (!insumos) return []
    return insumos
      .filter(i => i.precio_base_ref === PLACA_CODIGO || i.codigo.startsWith('1.1.'))
      .filter(i => i.tipo_precio === 'calculado' || i.formula_params)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  }, [insumos])

  // Calcular precio de cada lámina en base al precio de placa actual
  const precioPlacaNum = parseFloat(precioPlaca) || 0
  const anchoNum = parseFloat(anchoPlaca) || 2200
  const altoNum = parseFloat(altoPlaca) || 1600
  const areaPlaca = anchoNum * altoNum

  async function handleGuardar() {
    if (!placaBase || precioPlacaNum <= 0) {
      toast.error('Ingresá un precio válido para la placa')
      return
    }
    setSaving(true)
    try {
      // Actualizar precio de la placa base
      await updatePrecio.mutateAsync({ id: placaBase.id, precio: precioPlacaNum })

      // Recalcular y actualizar todas las láminas que tienen formula_params
      const laminasConFormula = laminas.filter(l => l.formula_params?.params)
      let actualizados = 0

      for (const lamina of laminasConFormula) {
        const params = lamina.formula_params?.params as any
        if (!params) continue
        const nuevoPrecio = calcularPrecioCasco(
          { alto_mm: params.alto_mm, largo_mm: params.largo_mm ?? 1600 },
          precioPlacaNum
        )
        await updatePrecio.mutateAsync({ id: lamina.id, precio: nuevoPrecio })
        actualizados++
      }

      toast.success(`Placa y ${actualizados} láminas actualizadas`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* Panel placa base */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          Placa fenólica base
          <span className="font-mono text-xs text-gray-400">({PLACA_CODIGO})</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio de placa ($)</label>
            <input
              type="number"
              value={precioPlaca}
              onChange={e => setPrecioPlaca(e.target.value)}
              className="input-field text-sm font-medium"
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ancho placa (mm)</label>
            <input type="number" value={anchoPlaca} onChange={e => setAnchoPlaca(e.target.value)}
              className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alto placa (mm)</label>
            <input type="number" value={altoPlaca} onChange={e => setAltoPlaca(e.target.value)}
              className="input-field text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={handleGuardar} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar y recalcular
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Info size={11} />
          Fórmula: (alto_mm × largo_mm) / ({anchoPlaca} × {altoPlaca}) × precio_placa
        </div>
      </div>

      {/* Tabla de láminas */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            Láminas ({laminas.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Nombre</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Precio actual</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Precio recalculado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {laminas.map(l => {
                const params = l.formula_params?.params as any
                const precioRecalc = params
                  ? calcularPrecioCasco(
                      { alto_mm: params.alto_mm, largo_mm: params.largo_mm ?? 1600 },
                      precioPlacaNum
                    )
                  : null
                const cambio = precioRecalc && l.precio_sin_iva > 0
                  ? ((precioRecalc - l.precio_sin_iva) / l.precio_sin_iva) * 100
                  : null

                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{l.codigo}</td>
                    <td className="px-4 py-2.5 text-gray-800">{l.nombre}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                      {formatPeso(l.precio_sin_iva)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {precioRecalc !== null ? (
                        <span className={cambio && Math.abs(cambio) > 0.5
                          ? 'text-orange-600 font-medium'
                          : 'text-gray-600'
                        }>
                          {formatPeso(precioRecalc)}
                          {cambio !== null && Math.abs(cambio) > 0.5 && (
                            <span className="ml-1 text-xs">({cambio > 0 ? '+' : ''}{cambio.toFixed(1)}%)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300">Sin fórmula</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
