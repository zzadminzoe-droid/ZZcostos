import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    'https://buttljxhobmqxnksalbs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dHRsanhob2JtcXhua3NhbGJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTYyNDA3NCwiZXhwIjoyMDk1MjAwMDc0fQ.Zk9Fi8hA3lU3OwOK2cMSmyTxEiMOCBTv7PktruGM1jU',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verificar tablas
  const tablas = ['categorias', 'insumos', 'familias', 'productos', 'bom_items', 'historial_precios', 'configuracion']
  console.log('🔍 Verificando tablas...')
  for (const tabla of tablas) {
    const { error } = await supabase.from(tabla).select('*').limit(0)
    console.log(error ? `  ❌ ${tabla}: ${error.message}` : `  ✅ ${tabla}`)
  }

  // Verificar datos maestros
  const { data: cats } = await supabase.from('categorias').select('nombre').order('orden')
  console.log('\n📦 Categorías:', cats?.map(c => c.nombre).join(', '))

  const { data: fams } = await supabase.from('familias').select('nombre').order('orden')
  console.log('🥁 Familias:', fams?.map(f => f.nombre).join(', '))

  // Crear usuario
  console.log('\n👤 Creando usuario...')
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'zoe.atelierfuerza@gmail.com',
    password: 'ZZPercusion2025!',
    email_confirm: true,
  })
  if (error) {
    console.log(error.message.includes('already') ? '  ℹ️  Usuario ya existe' : `  ❌ ${error.message}`)
  } else {
    console.log(`  ✅ Usuario creado: ${data.user.email}`)
  }
}
main()
