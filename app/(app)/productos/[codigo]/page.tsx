'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProductoByCodigo } from '@/lib/hooks/useProductos'
import { useInsumos } from '@/lib/hooks/useInsumos'
import { FichaProducto } from '@/components/productos/FichaProducto'
import { PageSpinner } from '@/components/ui/Spinner'
import type { Insumo } from '@/types'

export default function ProductoPage({ params }: { params: { codigo: string } }) {
  const router = useRouter()
  const { data: producto, isLoading } = useProductoByCodigo(params.codigo)
  const { data: insumos } = useInsumos()

  const insumoMap = useMemo(() => {
    if (!insumos) return {}
    return Object.fromEntries(insumos.map(i => [i.id, i])) as Record<string, Insumo>
  }, [insumos])

  if (isLoading) return <PageSpinner />

  if (!producto) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">Producto no encontrado</p>
        <p className="text-sm mt-1">Código: {params.codigo}</p>
        <button onClick={() => router.back()} className="mt-4 btn-secondary text-xs">
          ← Volver
        </button>
      </div>
    )
  }

  return (
    <FichaProducto
      producto={producto}
      insumoMap={insumoMap}
      onBack={() => router.back()}
    />
  )
}
