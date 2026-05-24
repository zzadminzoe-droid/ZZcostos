'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Loader2 } from 'lucide-react'
import { useUpsertInsumo, useCategorias } from '@/lib/hooks/useInsumos'
import type { Insumo } from '@/types'

interface Props {
  insumo: Insumo | null // null = nuevo
  onClose: () => void
}

export function InsumoModal({ insumo, onClose }: Props) {
  const { data: categorias } = useCategorias()
  const upsert = useUpsertInsumo()
  const isNew = !insumo

  const [form, setForm] = useState({
    codigo:        insumo?.codigo ?? '',
    nombre:        insumo?.nombre ?? '',
    categoria_id:  insumo?.categoria_id ?? '',
    unidad_medida: insumo?.unidad_medida ?? 'Unidad',
    cantidad:      String(insumo?.cantidad ?? 1),
    precio_sin_iva: String(insumo?.precio_sin_iva ?? 0),
    proveedor:     insumo?.proveedor ?? '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.codigo.trim()) e.codigo = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    const precio = parseFloat(form.precio_sin_iva)
    if (isNaN(precio) || precio < 0) e.precio_sin_iva = 'Debe ser ≥ 0'
    const cant = parseFloat(form.cantidad)
    if (isNaN(cant) || cant <= 0) e.cantidad = 'Debe ser > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    await upsert.mutateAsync({
      id: insumo?.id,
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      categoria_id: form.categoria_id || null,
      unidad_medida: form.unidad_medida,
      cantidad: parseFloat(form.cantidad),
      precio_sin_iva: parseFloat(form.precio_sin_iva),
      proveedor: form.proveedor.trim() || null,
    } as any)

    onClose()
  }

  const F = ({ label, name, type = 'text', disabled = false, step }: {
    label: string; name: keyof typeof form; type?: string; disabled?: boolean; step?: string
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        disabled={disabled}
        className="input-field text-sm disabled:bg-gray-50 disabled:text-gray-400"
      />
      {errors[name] && <p className="text-xs text-red-500 mt-0.5">{errors[name]}</p>}
    </div>
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nuevo insumo' : `Editar insumo — ${insumo.codigo}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <F label="Código *" name="codigo" disabled={!isNew} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select
              value={form.categoria_id}
              onChange={e => setForm(p => ({ ...p, categoria_id: e.target.value }))}
              className="input-field text-sm"
            >
              <option value="">Sin categoría</option>
              {categorias?.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <F label="Nombre *" name="nombre" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidad de medida</label>
            <select
              value={form.unidad_medida}
              onChange={e => setForm(p => ({ ...p, unidad_medida: e.target.value }))}
              className="input-field text-sm"
            >
              {['Unidad', 'Metro', 'Kg', 'Litro', 'cm', 'mm', 'gr', 'Par', 'Set'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <F label="Cantidad mínima" name="cantidad" type="number" step="0.01" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <F label="Precio sin IVA ($)" name="precio_sin_iva" type="number" step="0.01" />
            {form.precio_sin_iva && parseFloat(form.precio_sin_iva) > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Con IVA: ${(parseFloat(form.precio_sin_iva) * 1.21).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <F label="Proveedor" name="proveedor" />
        </div>

        {!isNew && insumo?.tipo_precio === 'calculado' && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            Este insumo tiene precio calculado. Para modificar su precio, usá el sub-tab correspondiente.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={upsert.isPending} className="btn-primary">
            {upsert.isPending && <Loader2 size={14} className="animate-spin" />}
            {isNew ? 'Crear insumo' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
