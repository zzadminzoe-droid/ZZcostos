'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseBrowser } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function useConfiguracion() {
  const sb = getSupabaseBrowser() as any
  return useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const { data, error } = await sb.from('configuracion').select('*')
      if (error) throw error
      // Convertir a objeto clave→valor
      return Object.fromEntries((data ?? []).map((c: any) => [c.clave, c.valor ?? ''])) as Record<string, string>
    },
  })
}

export function useUpdateConfiguracion() {
  const qc = useQueryClient()
  const sb = getSupabaseBrowser() as any
  return useMutation({
    mutationFn: async ({ clave, valor }: { clave: string; valor: string }) => {
      const { error } = await sb
        .from('configuracion')
        .update({ valor })
        .eq('clave', clave)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['configuracion'] })
      toast.success('Configuración guardada')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
