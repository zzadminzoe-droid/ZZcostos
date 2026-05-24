'use client'

import { useState, useMemo } from 'react'
import { Save, Loader2, Info } from 'lucide-react'
import { useInsumos, useUpdatePrecioInsumo, useUpdateInsumoFields } from '@/lib/hooks/useInsumos'
import { calcularPrecioFundicion } from '@/lib/precios-calculados'
import { formatPeso } from '@/lib/calculos'
import { PageSpinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

export function PreciosFundicion() {
  const { data: insumos, isLoading } = useInsumos()
  const updatePrecio = useUpdatePrecioInsumo()
  const updateFields = useUpdateInsumoFields()

  const [precioPorGramo, setPrecioPorGramo] = useState('20')
  const [precioCromado, setPrecioCromado] = useState('34.98')
  const [pesosPorId, setPesosPorId] = useState<Record<string, string>>({})
  const [cromadoPorId, setCromadoPorId] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  // Mostrar TODAS las piezas de fundición (código 3.x), con o sin formula_params
  const piezas = useMemo(() => {
    if (!insumos) return []
    return insumos
      .filter(i => i.codigo.startsWith('3.'))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))
  }, [insumos])

  const precioPorGramoNum = parseFloat(precioPorGramo) || 0
  const precioCromadoNum = parseFloat(precioCromado) || 0

  function getPesoG(pieza: typeof piezas[0]): number {
    if (pesosPorId[pieza.id] !== undefined) return parseFloat(pesosPorId[pieza.id]) || 0
    const fp = pieza.formula_params
    if (fp?.tipo === 'fundicion') return fp.peso_g
    return 0
  }

  function getCromado(pieza: typeof piezas[0]): boolean {
    if (cromadoPorId[pieza.id] !== undefined) return cromadoPorId[pieza.id]
    const fp = pieza.formula_params
    if (fp?.tipo === 'fundicion') return fp.cromado
    return false
  }

  function calcularNuevo(pieza: typeof piezas[0]): number | null {
    const peso = getPesoG(pieza)
    if (!peso) return null
    return calcularPrecioFundicion(
      { peso_gramos: peso, tiene_cromado: getCromado(pieza) },
      precioPorGramoNum,
      precioCromadoNum
    )
  }

  async function handleGuardar() {
    setSaving(true)
    try {
      let actualizados = 0
      for (const pieza of piezas) {
        const peso = getPesoG(pieza)
        const cromado = getCromado(pieza)
        const nuevo = calcularNuevo(pieza)

        // Si hay un peso editado o formula_params tiene dato → guardar
        const hasLocalEdit = pesosPorId[pieza.id] !== undefined || cromadoPorId[pieza.id] !== undefined
        if (hasLocalEdit || peso > 0) {
          // Actualizar formula_params en DB si el valor cambió
          if (hasLocalEdit) {
            await updateFields.mutateAsync({
              id: pieza.id,
              tipo_precio: 'calculado',
              formula_params: { tipo: 'fundicion', peso_g: peso, cromado },
            })
          }
          // Actualizar precio
          if (nuevo !== null) {
            await updatePrecio.mutateAsync({ id: pieza.id, precio: nuevo })
            actualizados++
          }
        }
      }
      // Limpiar edits locales
      setPesosPorId({})
      setCromadoPorId({})
      toast.success(`${actualizados} piezas actualizadas`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <PageSpinner />

  const conPeso = piezas.filter(p => getPesoG(p) > 0).length
  const sinPeso = piezas.length - conPeso

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
              Guardar y recalcular ({conPeso} con peso)
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <Info size={11} />
          Fórmula: peso_g × precio_fundicion + (cromado ? peso_g × precio_cromado : 0)
        </p>
        {sinPeso > 0 && (
          <p className="mt-2 text-xs text-yellow-600">
            ⚠️ {sinPeso} pieza{sinPeso > 1 ? 's' : ''} sin peso — completá el campo &quot;g&quot; para calcular
          </p>
        )}
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
                No hay piezas de fundición
              </td></tr>
            ) : piezas.map(p => {
              const cromado = getCromado(p)
              const nuevo = calcularNuevo(p)
              const hasEdit = pesosPorId[p.id] !== undefined || cromadoPorId[p.id] !== undefined

              return (
                <tr key={p.id} className={`hover:bg-gray-50 ${hasEdit ? 'bg-yellow-50/30' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.codigo}</td>
                  <td className="px-4 py-2.5 text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={pesosPorId[p.id] ?? (p.formula_params?.tipo === 'fundicion' ? p.formula_params.peso_g : '')}
                      placeholder="0"
                      onChange={e => setPesosPorId(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="input-field text-xs h-7 w-20 text-right ml-auto"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={cromado}
                      onChange={e => setCromadoPorId(prev => ({ ...prev, [p.id]: e.target.checked }))}
                      className="w-3.5 h-3.5 accent-brand-500"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{formatPeso(p.precio_sin_iva)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {nuevo !== null
                      ? <span className="text-orange-600 font-medium">{formatPeso(nuevo)}</span>
                      : <span className="text-gray-300 text-xs">Sin peso</span>
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
