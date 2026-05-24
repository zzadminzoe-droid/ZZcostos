import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    'https://buttljxhobmqxnksalbs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dHRsanhob2JtcXhua3NhbGJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYyNDA3NCwiZXhwIjoyMDk1MjAwMDc0fQ.Zk9Fi8hA3lU3OwOK2cMSmyTxEiMOCBTv7PktruGM1jU',
    { auth: { autoRefreshToken: false, persistSession: false } }
  ) as any

  // Fix: audit trigger sin updated_by para bom_items
  const sql = `
    DROP TRIGGER IF EXISTS trg_audit_bom ON bom_items;

    CREATE OR REPLACE FUNCTION registrar_audit_bom()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
      VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE null END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE null END,
        NULL
      );
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_audit_bom
      AFTER INSERT OR UPDATE OR DELETE ON bom_items
      FOR EACH ROW EXECUTE FUNCTION registrar_audit_bom();
  `

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: { message: 'rpc not available' } }))
  
  if (error) {
    console.log('ℹ️  No se puede ejecutar SQL via RPC — usar SQL Editor manual')
    console.log('\nEjecutar esto en Supabase SQL Editor:\n')
    console.log(sql)
  } else {
    console.log('✅ Trigger corregido')
  }
}
main()
