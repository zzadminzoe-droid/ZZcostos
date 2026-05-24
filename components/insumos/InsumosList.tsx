'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { useInsumos, useCategorias, useDeleteInsumo } from '@/lib/hooks/useInsumos'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageSpinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InsumoModal } from './InsumoModal'
import { formatPeso } from '@/lib/calculos'
import { cn } from '@/lib/utils'
import type { Insumo } from '@/types'

export function InsumosList() {
  const { data: insumos, isLoading } = useInsumos()
  const { data: categorias } = useCategorias()
  const deleteMutation = useDeleteInsumo()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null | 'new'>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!insumos) return []
    return insumos.filter(ins => {
      const matchSearch = !search ||
        ins.codigo.toLowerCase().includes(search.toLowerCase()) ||
        ins.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (ins.proveedor ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCat = catFilter === 'todas' || ins.categoria_id === catFilter
      const matchStatus =
        statusFilter === 'todos' ? true :
        statusFilter === 'con_precio' ? ins.precio_sin_iva > 0 :
        ins.precio_sin_iva === 0
      return matchSearch && matchCat && matchStatus
    })
  }, [insumos, search, catFilter, statusFilter])

  const sinPrecio = insumos?.filter(i => i.precio_sin_iva === 0).length ?? 0

  if (isLoading) return <PageSpinner />

  return (
    <div>
      {/* Header con filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código, nombre o proveedor..."
          className="w-72"
        />

        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="input-field h-9 text-sm w-48"
        >
          <option value="todas">Todas las categorías</option>
          {categorias?.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field h-9 text-sm w-40"
        >
          <option value="todos">Todos</option>
          <option value="con_precio">Con precio</option>
          <option value="sin_precio">Sin precio</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          {sinPrecio > 0 && (
            <span className="badge-error">
              <AlertCircle size={11} />
              {sinPrecio} sin precio
            </span>
          )}
          <button
            onClick={() => setEditingInsumo('new')}
            className="btn-primary"
          >
            <Plus size={15} />
            Nuevo insumo
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-36">Categoría</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">Unidad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-32">Proveedor</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">Precio S/IVA</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">Precio C/IVA</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="No se encontraron insumos"
                      description="Probá cambiando los filtros de búsqueda"
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(ins => (
                  <InsumoRow
                    key={ins.id}
                    insumo={ins}
                    onEdit={() => setEditingInsumo(ins)}
                    onDelete={() => setDeletingId(ins.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
            {filtered.length} de {insumos?.length ?? 0} insumos
          </div>
        )}
      </div>

      {/* Modal edición/creación */}
      {editingInsumo !== null && (
        <InsumoModal
          insumo={editingInsumo === 'new' ? null : editingInsumo}
          onClose={() => setEditingInsumo(null)}
        />
      )}

      {/* Confirm eliminar */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={async () => {
          if (deletingId) await deleteMutation.mutateAsync(deletingId)
          setDeletingId(null)
        }}
        title="Eliminar insumo"
        description="¿Estás segura? Esta acción no se puede deshacer. No se puede eliminar un insumo que esté en algún BOM activo."
        confirmLabel="Eliminar"
        danger
      />
    </div>
  )
}

function InsumoRow({ insumo, onEdit, onDelete }: {
  insumo: Insumo
  onEdit: () => void
  onDelete: () => void
}) {
  const sinPrecio = insumo.precio_sin_iva === 0
  const esCalculado = insumo.tipo_precio === 'calculado'

  return (
    <tr className={cn('hover:bg-gray-50 transition-colors group', sinPrecio && 'bg-red-50/30')}>
      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{insumo.codigo}</td>
      <td className="px-4 py-2.5">
        <span className="text-xs text-gray-500">{insumo.categoria?.nombre ?? '—'}</span>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{insumo.nombre}</span>
          {sinPrecio && (
            <span className="badge-error text-[10px]">Sin precio</span>
          )}
          {esCalculado && (
            <span className="badge-info text-[10px]">Calculado</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-gray-500 text-xs">{insumo.unidad_medida}</td>
      <td className="px-4 py-2.5 text-gray-500 text-xs">{insumo.proveedor ?? '—'}</td>
      <td className={cn('px-4 py-2.5 text-right font-medium tabular-nums', sinPrecio ? 'text-red-500' : 'text-gray-900')}>
        {sinPrecio ? '—' : formatPeso(insumo.precio_sin_iva)}
      </td>
      <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums text-xs">
        {sinPrecio ? '—' : formatPeso(insumo.precio_con_iva)}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          {!esCalculado && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
