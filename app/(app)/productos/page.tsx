'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useProductos, useFamilias } from '@/lib/hooks/useProductos'
import { useInsumos } from '@/lib/hooks/useInsumos'
import { SearchInput } from '@/components/ui/SearchInput'
import { PageSpinner } from '@/components/ui/Spinner'
import { ProductoCard } from '@/components/productos/ProductoCard'
import { FichaProducto } from '@/components/productos/FichaProducto'
import { calcularCostoProducto } from '@/lib/calculos'
import type { Producto } from '@/types'

export default function ProductosPage() {
  const { data: productos, isLoading } = useProductos()
  const { data: familias } = useFamilias()
  const { data: insumos } = useInsumos()

  const [search, setSearch] = useState('')
  const [familiaFilter, setFamiliaFilter] = useState('todas')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const insumoMap = useMemo(() => {
    if (!insumos) return {}
    return Object.fromEntries(insumos.map(i => [i.id, i]))
  }, [insumos])

  const filtered = useMemo(() => {
    if (!productos) return []
    return productos.filter(p => {
      const matchSearch = !search ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        p.nombre.toLowerCase().includes(search.toLowerCase())
      const matchFamilia = familiaFilter === 'todas' || p.familia_id === familiaFilter
      return matchSearch && matchFamilia
    })
  }, [productos, search, familiaFilter])

  const selected = useMemo(
    () => productos?.find(p => p.id === selectedId) ?? null,
    [productos, selectedId]
  )

  if (isLoading) return <PageSpinner />

  if (selected) {
    return (
      <FichaProducto
        producto={selected}
        insumoMap={insumoMap}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Productos</h1>
        <div className="text-sm text-gray-500">{filtered.length} productos</div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código o nombre..."
          className="w-64"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setFamiliaFilter('todas')}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              familiaFilter === 'todas'
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            Todas
          </button>
          {familias?.map((f: any) => (
            <button
              key={f.id}
              onClick={() => setFamiliaFilter(f.id)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                familiaFilter === f.id
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(p => (
          <ProductoCard
            key={p.id}
            producto={p}
            insumoMap={insumoMap}
            onClick={() => setSelectedId(p.id)}
          />
        ))}
      </div>
    </div>
  )
}
