'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseBrowser } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Insumo } from '@/types'

const KEY = 'insumos'

export function useInsumos() {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await sb
        .from('insumos')
        .select('*, categoria:categorias(id, nombre, orden)')
        .order('codigo')
      if (error) throw error
      return data as Insumo[]
    },
  })
}

export function useCategorias() {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('categorias')
        .select('*')
        .order('orden')
      if (error) throw error
      return data as Array<{ id: string; nombre: string; orden: number | null }>
    },
  })
}

export function useUpdatePrecioInsumo() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any

  return useMutation({
    mutationFn: async ({ id, precio }: { id: string; precio: number }) => {
      const { error } = await sb
        .from('insumos')
        .update({ precio_sin_iva: precio })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['bom'] })
      toast.success('Precio actualizado')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpsertInsumo() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any

  return useMutation({
    mutationFn: async (data: Partial<Insumo> & { id?: string }) => {
      const { id, categoria, precio_con_iva, ...rest } = data as any
      if (id) {
        const { error } = await sb.from('insumos').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await sb.from('insumos').insert(rest)
        if (error) throw error
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success(vars.id ? 'Insumo actualizado' : 'Insumo creado')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

/** Actualiza campos sueltos de un insumo sin mostrar toast (útil para batch) */
export function useUpdateInsumoFields() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any

  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; [key: string]: unknown }) => {
      const { error } = await sb.from('insumos').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteInsumo() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('insumos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success('Insumo eliminado')
    },
    onError: (e: Error) => toast.error('No se puede eliminar: ' + e.message),
  })
}
