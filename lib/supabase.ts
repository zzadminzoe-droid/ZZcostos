import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// ─── Browser client (componentes cliente) ─────────────────
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton para uso general en cliente
let _client: ReturnType<typeof createClient> | null = null
export function getSupabaseBrowser() {
  if (!_client) _client = createClient()
  return _client
}
