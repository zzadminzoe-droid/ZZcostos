'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseBrowser } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Producto, BomItem } from '@/types'

export function useProductos() {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('productos')
        .select('*, familia:familias(id, nombre, orden)')
        .order('codigo')
      if (error) throw error
      return data as Producto[]
    },
  })
}

export function useProducto(id: string) {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['producto', id],
    queryFn: async () => {
      const { data, error } = await sb
        .from('productos')
        .select('*, familia:familias(id, nombre, orden)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Producto
    },
    enabled: !!id,
  })
}

export function useBomItems(productoId: string) {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['bom', productoId],
    queryFn: async () => {
      const { data, error } = await sb
        .from('bom_items')
        .select('*, insumo:insumos(precio_sin_iva, precio_con_iva, unidad_medida, tipo_precio)')
        .eq('producto_id', productoId)
        .order('orden')
      if (error) throw error
      return data as BomItem[]
    },
    enabled: !!productoId,
  })
}

/** Productos con costos calculados en cliente desde bom_items + insumos */
export function useProductosConCostos() {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['productos-costos'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('productos')
        .select('*, familia:familias(id, nombre, orden), bom_items(cantidad, insumo:insumos(precio_sin_iva, precio_con_iva))')
        .order('codigo')
      if (error) throw error

      return (data as any[]).map(p => {
        const items: any[] = p.bom_items ?? []
        let costoSinIva = 0
        let itemsSinPrecio = 0

        for (const item of items) {
          const precio = item.insumo?.precio_sin_iva ?? 0
          if (precio === 0) itemsSinPrecio++
          costoSinIva += precio * item.cantidad
        }

        return {
          ...(p as Producto),
          costo_sin_iva: costoSinIva,
          costo_con_iva: costoSinIva * 1.21,
          total_bom_items: items.length,
          items_sin_precio: itemsSinPrecio,
        }
      })
    },
  })
}

export function useProductoByCodigo(codigo: string) {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['producto-codigo', codigo],
    queryFn: async () => {
      const { data, error } = await sb
        .from('productos')
        .select('*, familia:familias(id, nombre, orden)')
        .eq('codigo', codigo)
        .single()
      if (error) throw error
      return data as Producto
    },
    enabled: !!codigo,
  })
}

export function useFamilias() {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['familias'],
    queryFn: async () => {
      const { data, error } = await sb.from('familias').select('*').order('orden')
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Producto> & { id: string }) => {
      const { familia, ...rest } = data as any
      const { error } = await sb.from('productos').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['producto', vars.id] })
      toast.success('Producto guardado')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useAddBomItem() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any
  return useMutation({
    mutationFn: async (item: Omit<BomItem, 'id'>) => {
      const { insumo, ...rest } = item as any
      const { error } = await sb.from('bom_items').insert(rest)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['bom', vars.producto_id] })
      toast.success('Insumo agregado al BOM')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateBomItem() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any
  return useMutation({
    mutationFn: async ({ id, cantidad, producto_id }: { id: string; cantidad: number; producto_id: string }) => {
      const { error } = await sb.from('bom_items').update({ cantidad }).eq('id', id)
      if (error) throw error
      return producto_id
    },
    onSuccess: (producto_id) => {
      qc.invalidateQueries({ queryKey: ['bom', producto_id] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteBomItem() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any
  return useMutation({
    mutationFn: async ({ id, producto_id }: { id: string; producto_id: string }) => {
      const { error } = await sb.from('bom_items').delete().eq('id', id)
      if (error) throw error
      return producto_id
    },
    onSuccess: (producto_id) => {
      qc.invalidateQueries({ queryKey: ['bom', producto_id] })
      toast.success('Insumo eliminado del BOM')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
