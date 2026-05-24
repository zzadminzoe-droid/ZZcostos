import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// ─── Browser client (componentes cliente) ─────────────────
export function createClient() {
  // Fallback para SSR/build time donde las vars pueden no estar disponibles.
  // React Query no ejecuta queries en SSR, así que esto nunca llega a la DB.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  return createBrowserClient<Database>(url, key)
}

// Singleton para uso general en cliente
let _client: ReturnType<typeof createClient> | null = null
export function getSupabaseBrowser() {
  if (typeof window === 'undefined') {
    // Durante SSR/build: crear instancia temporal sin singleton
    return createClient()
  }
  if (!_client) _client = createClient()
  return _client
}
