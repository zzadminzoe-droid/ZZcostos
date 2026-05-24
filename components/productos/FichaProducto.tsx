'use client'

import { useState, useMemo, useRef } from 'react'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Check, X } from 'lucide-react'
import { BtnDescargarPDF } from '@/components/ui/BtnDescargarPDF'
import { PDFBom } from '@/lib/pdf/pdf-bom'
import { useBomItems, useUpdateProducto, useAddBomItem, useUpdateBomItem, useDeleteBomItem } from '@/lib/hooks/useProductos'
import { useInsumos } from '@/lib/hooks/useInsumos'
import { calcularCostoProducto, calcularMargen, formatPeso, formatPct } from '@/lib/calculos'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SearchInput } from '@/components/ui/SearchInput'
import { cn } from '@/lib/utils'
import type { Producto, BomItem, Insumo } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  producto: Producto
  insumoMap: Record<string, Insumo>
  onBack: () => void
}

export function FichaProducto({ producto, insumoMap, onBack }: Props) {
  const { data: bomItems, isLoading: bomLoading } = useBomItems(producto.id)
  const { data: todosInsumos } = useInsumos()
  const updateProducto = useUpdateProducto()
  const addBom = useAddBomItem()
  const updateBom = useUpdateBomItem()
  const deleteBom = useDeleteBomItem()

  // Estado panel derecho
  const [precioVenta, setPrecioVenta] = useState(String(producto.precio_venta || ''))
  const [manoDeObra, setManoDeObra] = useState(String(producto.mano_de_obra || ''))
  const [gastosFijos, setGastosFijos] = useState(String(producto.gastos_fijos || ''))
  const [incluirAdicionales, setIncluirAdicionales] = useState(producto.incluir_adicionales)
  const [savingProducto, setSavingProducto] = useState(false)

  // BOM edición inline
  const [editingBomId, setEditingBomId] = useState<string | null>(null)
  const [editingCantidad, setEditingCantidad] = useState('')
  const [deletingBomId, setDeletingBomId] = useState<string | null>(null)

  // Buscador de insumos para agregar
  const [showAddInsumo, setShowAddInsumo] = useState(false)
  const [busquedaInsumo, setBusquedaInsumo] = useState('')

  // BOM con precios en tiempo real
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
      parseFloat(manoDeObra) || 0,
      parseFloat(gastosFijos) || 0,
      incluirAdicionales
    ),
    [bomConPrecios, manoDeObra, gastosFijos, incluirAdicionales]
  )

  const margen = useMemo(
    () => parseFloat(precioVenta) > 0
      ? calcularMargen(parseFloat(precioVenta), costo.costo_sin_iva)
      : null,
    [precioVenta, costo.costo_sin_iva]
  )

  // Insumos filtrados para agregar al BOM
  const insumosFiltrados = useMemo(() => {
    if (!todosInsumos || !busquedaInsumo) return []
    const q = busquedaInsumo.toLowerCase()
    const codigosEnBom = new Set(bomItems?.map(b => b.insumo_codigo) ?? [])
    return todosInsumos
      .filter(i =>
        !codigosEnBom.has(i.codigo) &&
        (i.codigo.toLowerCase().includes(q) || i.nombre.toLowerCase().includes(q))
      )
      .slice(0, 8)
  }, [todosInsumos, busquedaInsumo, bomItems])

  async function handleGuardarProducto() {
    setSavingProducto(true)
    try {
      await updateProducto.mutateAsync({
        id: producto.id,
        precio_venta: parseFloat(precioVenta) || 0,
        mano_de_obra: parseFloat(manoDeObra) || 0,
        gastos_fijos: parseFloat(gastosFijos) || 0,
        incluir_adicionales: incluirAdicionales,
      })
    } finally {
      setSavingProducto(false)
    }
  }

  async function handleAgregarInsumo(insumo: Insumo) {
    await addBom.mutateAsync({
      producto_id: producto.id,
      insumo_id: insumo.id,
      insumo_codigo: insumo.codigo,
      insumo_nombre: insumo.nombre,
      cantidad: 1,
      orden: (bomItems?.length ?? 0),
    })
    setBusquedaInsumo('')
    setShowAddInsumo(false)
  }

  async function handleGuardarCantidad(item: BomItem) {
    const nueva = parseFloat(editingCantidad)
    if (isNaN(nueva) || nueva <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    await updateBom.mutateAsync({ id: item.id, cantidad: nueva, producto_id: producto.id })
    setEditingBomId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-secondary px-2.5 py-2">
          <ArrowLeft size={16} />
        </button>
        <BtnDescargarPDF
          label="Exportar BOM"
          filename={`ZZ-BOM-${producto.codigo}.pdf`}
          className="text-xs"
          document={
            <PDFBom
              producto={{
                codigo: producto.codigo,
                nombre: producto.nombre,
                familia: producto.familia?.nombre ?? '—',
              }}
              bom_items={(bomConPrecios as any[]).map(item => ({
                codigo: item.insumo_codigo,
                nombre: item.insumo_nombre,
                cantidad: item.cantidad,
                precio_unit: item.insumo?.precio_sin_iva ?? 0,
                subtotal: (item.insumo?.precio_sin_iva ?? 0) * item.cantidad,
              }))}
              costo_sin_iva={costo.costo_sin_iva}
              costo_con_iva={costo.costo_con_iva}
              precio_venta={parseFloat(precioVenta) || undefined}
              mano_de_obra={parseFloat(manoDeObra) || undefined}
              gastos_fijos={parseFloat(gastosFijos) || undefined}
              fecha={new Date().toLocaleDateString('es-AR')}
            />
          }
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{producto.codigo}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{producto.familia?.nombre}</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{producto.nombre}</h1>
        </div>

        {/* Chips de costo */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="text-center">
            <p className="text-xs text-gray-400">Costo S/IVA</p>
            <p className="text-base font-bold text-gray-900 tabular-nums">
              {costo.costo_sin_iva > 0 ? formatPeso(costo.costo_sin_iva) : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Costo C/IVA</p>
            <p className="text-base font-bold text-gray-900 tabular-nums">
              {costo.costo_con_iva > 0 ? formatPeso(costo.costo_con_iva) : '—'}
            </p>
          </div>
          {margen && (
            <div className="text-center">
              <p className="text-xs text-gray-400">Margen</p>
              <p className={cn('text-base font-bold tabular-nums',
                margen.estado === 'bueno' ? 'text-green-600' :
                margen.estado === 'regular' ? 'text-yellow-600' : 'text-red-500'
              )}>
                {formatPct(margen.margen_contribucion_pct)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BOM - columna principal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">
                Lista de materiales
                <span className="ml-2 text-gray-400 font-normal">({bomItems?.length ?? 0} ítems)</span>
              </h2>
              <button
                onClick={() => setShowAddInsumo(!showAddInsumo)}
                className="btn-secondary text-xs px-2.5 py-1.5"
              >
                <Plus size={13} />
                Agregar insumo
              </button>
            </div>

            {/* Buscador para agregar */}
            {showAddInsumo && (
              <div className="px-4 py-3 border-b border-brand-100 bg-brand-50/50">
                <SearchInput
                  value={busquedaInsumo}
                  onChange={setBusquedaInsumo}
                  placeholder="Buscar insumo por código o nombre..."
                  className="w-full"
                />
                {insumosFiltrados.length > 0 && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {insumosFiltrados.map(ins => (
                      <button
                        key={ins.id}
                        onClick={() => handleAgregarInsumo(ins)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <span className="font-mono text-xs text-gray-400 mr-2">{ins.codigo}</span>
                          <span className="text-sm text-gray-800">{ins.nombre}</span>
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">
                          {ins.precio_sin_iva > 0 ? formatPeso(ins.precio_sin_iva) : 'Sin precio'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {busquedaInsumo.length > 1 && insumosFiltrados.length === 0 && (
                  <p className="mt-2 text-xs text-gray-400">No se encontraron insumos</p>
                )}
              </div>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs w-24">Código</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Nombre</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs w-24">Cantidad</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs w-28">P. Unit.</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs w-28">Subtotal</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bomLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">Cargando...</td></tr>
                ) : bomConPrecios.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">BOM vacío — agregá insumos</td></tr>
                ) : (
                  bomConPrecios.map(item => {
                    const sinPrecio = !item.insumo || item.insumo.precio_sin_iva === 0
                    const subtotal = (item.insumo?.precio_sin_iva ?? 0) * item.cantidad
                    const isEditing = editingBomId === item.id

                    return (
                      <tr key={item.id} className={cn('group hover:bg-gray-50', sinPrecio && 'bg-red-50/30')}>
                        <td className="px-4 py-2 font-mono text-xs text-gray-400">{item.insumo_codigo}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-gray-800', sinPrecio && 'text-red-600')}>
                              {item.insumo_nombre}
                            </span>
                            {sinPrecio && <span className="badge-error text-[10px]">Sin precio</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.001"
                                value={editingCantidad}
                                onChange={e => setEditingCantidad(e.target.value)}
                                className="input-field text-xs w-20 h-7 text-right"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleGuardarCantidad(item as any)
                                  if (e.key === 'Escape') setEditingBomId(null)
                                }}
                              />
                              <button onClick={() => handleGuardarCantidad(item as any)}
                                className="p-1 text-green-500 hover:bg-green-50 rounded">
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditingBomId(null)}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingBomId(item.id); setEditingCantidad(String(item.cantidad)) }}
                              className="tabular-nums text-gray-700 hover:text-brand-600 hover:underline"
                            >
                              {item.cantidad}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500 text-xs">
                          {sinPrecio ? <span className="text-red-400">—</span> : formatPeso(item.insumo!.precio_sin_iva)}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">
                          {sinPrecio ? <span className="text-red-400">—</span> : formatPeso(subtotal)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setDeletingBomId(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {bomConPrecios.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                    <td colSpan={4} className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">
                      Total S/IVA
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900 tabular-nums">
                      {formatPeso(costo.costo_sin_iva)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Costos adicionales */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Costos adicionales</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">{incluirAdicionales ? 'Incluidos' : 'Excluidos'}</span>
                <button
                  onClick={() => setIncluirAdicionales(!incluirAdicionales)}
                  className={cn(
                    'w-9 h-5 rounded-full transition-colors relative',
                    incluirAdicionales ? 'bg-brand-500' : 'bg-gray-200'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    incluirAdicionales ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </button>
              </label>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Mano de obra ($)</label>
                <input
                  type="number"
                  step="1"
                  value={manoDeObra}
                  onChange={e => setManoDeObra(e.target.value)}
                  disabled={!incluirAdicionales}
                  className="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Gastos fijos ($)</label>
                <input
                  type="number"
                  step="1"
                  value={gastosFijos}
                  onChange={e => setGastosFijos(e.target.value)}
                  disabled={!incluirAdicionales}
                  className="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Precio de venta */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Precio de venta</h3>
            <input
              type="number"
              step="1"
              value={precioVenta}
              onChange={e => setPrecioVenta(e.target.value)}
              className="input-field text-sm mb-3"
              placeholder="$ 0"
            />
            {margen && parseFloat(precioVenta) > 0 && (
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Contribución marginal</span>
                  <span className="font-medium text-gray-800 tabular-nums">
                    {formatPeso(margen.contribucion_marginal)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Margen</span>
                  <span className={cn('font-bold text-sm tabular-nums',
                    margen.estado === 'bueno' ? 'text-green-600' :
                    margen.estado === 'regular' ? 'text-yellow-600' : 'text-red-500'
                  )}>
                    {formatPct(margen.margen_contribucion_pct)}
                  </span>
                </div>
                <div className={cn(
                  'h-1.5 rounded-full overflow-hidden bg-gray-200'
                )}>
                  <div
                    className={cn('h-full rounded-full transition-all',
                      margen.estado === 'bueno' ? 'bg-green-500' :
                      margen.estado === 'regular' ? 'bg-yellow-400' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(margen.margen_contribucion_pct, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Guardar */}
          <button
            onClick={handleGuardarProducto}
            disabled={savingProducto}
            className="btn-primary w-full justify-center"
          >
            {savingProducto ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Confirm eliminar BOM item */}
      <ConfirmDialog
        open={!!deletingBomId}
        onClose={() => setDeletingBomId(null)}
        onConfirm={async () => {
          if (deletingBomId) {
            await deleteBom.mutateAsync({ id: deletingBomId, producto_id: producto.id })
            setDeletingBomId(null)
          }
        }}
        title="Eliminar insumo del BOM"
        description="¿Eliminás este insumo de la lista de materiales?"
        confirmLabel="Eliminar"
        danger
      />
    </div>
  )
}
