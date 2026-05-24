/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ZZ Percusión — Fix formula_params
 *
 * Actualiza tipo_precio = 'calculado' y formula_params (formato plano) para:
 *   - CASCOS:     códigos 1.1.x (excl. 1.1, 1.1.22, 1.1.23)
 *   - CAÑOS:      códigos 5.x.y (hijos)
 *   - FLEJES:     códigos 6.x.y (hijos)
 *   - FUNDICIÓN:  códigos 3.x
 *   - CHAPA:      códigos 4.x.y (hijos)
 *
 * También verifica duplicados de productos (_2 al final del código).
 *
 * Uso:
 *   npx tsx -r dotenv/config scripts/fix-formula-params.ts dotenv_config_path=.env.local
 *   # Sólo mostrar sin guardar:
 *   npx tsx -r dotenv/config scripts/fix-formula-params.ts dotenv_config_path=.env.local --dry-run
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as any

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('\n🔵 MODO DRY-RUN — no se guardarán cambios en la DB\n')

// ─── Tablas de conversión ────────────────────────────────────────────────────

const EXCLUIR_CASCOS = ['1.1', '1.1.22', '1.1.23']

/** Extrae alto en mm del nombre de una lámina de casco */
function extractAltoMmFromNombre(nombre: string): number | null {
  // Formato cm: "Lamina 10cm x 1600mm" → 10cm = 100mm
  const cmFirst = nombre.match(/^[A-Za-záéíóúÁÉÍÓÚ\s]+?(\d+(?:[.,]\d+)?)\s*cm\b/i)
  if (cmFirst) {
    const cm = parseFloat(cmFirst[1].replace(',', '.'))
    return isNaN(cm) || cm <= 0 ? null : Math.round(cm * 10)
  }

  // Formato pulgadas: "Lamina 3"x1600mm", "Lamina 5,5"x1600mm"
  const inchMatch = nombre.match(/(\d+(?:[.,]\d+)?)\s*["""“”''""]?x\d/i)
  if (!inchMatch) return null
  const pulgadas = parseFloat(inchMatch[1].replace(',', '.'))
  if (isNaN(pulgadas) || pulgadas <= 0) return null
  return Math.round(pulgadas * 25.4)
}

/** Extrae largo en mm del nombre de un caño/fleje/barral */
function extractLargoMmFromNombre(nombre: string): number | null {
  // "Caño 1"x160cm" o "Caño 22mm x 15cm" → largo en mm
  const cmMatch = nombre.match(/x\s*(\d+(?:[.,]\d+)?)\s*cm/i)
  if (cmMatch) return Math.round(parseFloat(cmMatch[1].replace(',', '.')) * 10)

  // "Barral 14" (8mm x 280mm)" → 280mm (número antes de "mm)")
  const barralMatch = nombre.match(/x\s*(\d+(?:[.,]\d+)?)\s*mm\s*\)/i)
  if (barralMatch) return Math.round(parseFloat(barralMatch[1].replace(',', '.')))

  // "Fleje 7/8"x1/8"x439mm" o "x49,5mm" → último xNmm
  const allMm: number[] = []
  nombre.replace(/x(\d+(?:[.,]\d+)?)mm/gi, (_, n: string) => {
    const v = parseFloat(n.replace(',', '.'))
    if (!isNaN(v)) allMm.push(v)
    return _
  })
  if (allMm.length > 0) return Math.round(allMm[allMm.length - 1])

  return null
}

// ─── Lógica de categorización ─────────────────────────────────────────────────

interface UpdatePayload {
  tipo_precio: 'calculado'
  precio_base_ref: string | null
  formula_params: Record<string, unknown>
}

function clasificarInsumo(insumo: any): UpdatePayload | null {
  const { codigo, nombre } = insumo

  // ── CASCOS ────────────────────────────────────────────────────
  if (codigo.startsWith('1.1.') && !EXCLUIR_CASCOS.includes(codigo)) {
    const alto_mm = extractAltoMmFromNombre(nombre)
    if (alto_mm === null) {
      console.warn(`  ⚠️  CASCO ${codigo} "${nombre}" — no se pudo extraer alto_mm, se pone 0`)
    }
    return {
      tipo_precio: 'calculado',
      precio_base_ref: '1.1',
      formula_params: { tipo: 'casco', alto_mm: alto_mm ?? 0, largo_mm: 1600 },
    }
  }

  // ── CAÑOS (5.x.y) ─────────────────────────────────────────────
  const cañoMatch = codigo.match(/^(5\.\d+)\.\d+/)
  if (cañoMatch) {
    const parentCodigo = cañoMatch[1]
    const largo_mm = extractLargoMmFromNombre(nombre)
    if (largo_mm === null) {
      console.warn(`  ⚠️  CAÑO ${codigo} "${nombre}" — no se pudo extraer largo_mm, se pone 0`)
    }
    return {
      tipo_precio: 'calculado',
      precio_base_ref: parentCodigo,
      formula_params: { tipo: 'caño', largo_mm: largo_mm ?? 0, largo_barra_mm: 6000 },
    }
  }

  // ── FLEJES (6.x.y) ────────────────────────────────────────────
  const flejeMatch = codigo.match(/^(6\.\d+)\.\d+/)
  if (flejeMatch) {
    const parentCodigo = flejeMatch[1]
    const largo_mm = extractLargoMmFromNombre(nombre)
    if (largo_mm === null) {
      console.warn(`  ⚠️  FLEJE ${codigo} "${nombre}" — no se pudo extraer largo_mm, se pone 0`)
    }
    return {
      tipo_precio: 'calculado',
      precio_base_ref: parentCodigo,
      formula_params: { tipo: 'fleje', largo_mm: largo_mm ?? 0, largo_barra_mm: 6000 },
    }
  }

  // ── FUNDICIÓN (3.x) ───────────────────────────────────────────
  if (/^3\.\d/.test(codigo)) {
    return {
      tipo_precio: 'calculado',
      precio_base_ref: null,
      formula_params: { tipo: 'fundicion', peso_g: 0, cromado: false },
    }
  }

  // ── CHAPA (4.x.y y más profundos) ─────────────────────────────
  const chapaMatch = codigo.match(/^(4\.\d+)\./)
  if (chapaMatch) {
    const parentCodigo = chapaMatch[1]
    return {
      tipo_precio: 'calculado',
      precio_base_ref: parentCodigo,
      formula_params: { tipo: 'chapa', largo_mm: 0, alto_mm: 0, cromado: false },
    }
  }

  return null
}

// ─── Principal ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧 ZZ Percusión — fix-formula-params\n')

  // Cargar todos los insumos
  const { data: insumos, error } = await supabase
    .from('insumos')
    .select('id, codigo, nombre, tipo_precio, formula_params')
    .order('codigo')

  if (error) {
    console.error('❌ Error al cargar insumos:', error.message)
    process.exit(1)
  }

  console.log(`📦 ${insumos.length} insumos cargados\n`)

  const byTipo: Record<string, number> = {}
  const updates: Array<{ id: string; codigo: string; nombre: string; payload: UpdatePayload }> = []

  for (const ins of insumos) {
    const payload = clasificarInsumo(ins)
    if (!payload) continue

    // Solo actualizar si no tiene formula_params ya, o si cambia tipo
    const yaConfigurado = ins.formula_params && ins.tipo_precio === 'calculado'
    if (yaConfigurado) {
      // Forzar igualmente para que queden en formato plano correcto
    }

    updates.push({ id: ins.id, codigo: ins.codigo, nombre: ins.nombre, payload })
    byTipo[payload.formula_params.tipo as string] = (byTipo[payload.formula_params.tipo as string] ?? 0) + 1
  }

  console.log('📊 Resumen de insumos a actualizar:')
  for (const [tipo, count] of Object.entries(byTipo)) {
    console.log(`   ${tipo.padEnd(12)}: ${count}`)
  }
  console.log(`   ─────────────────`)
  console.log(`   TOTAL        : ${updates.length}`)

  if (DRY_RUN) {
    console.log('\n📋 Primeros 20 cambios (dry-run):')
    for (const u of updates.slice(0, 20)) {
      console.log(`   ${u.codigo.padEnd(14)} ${u.nombre.slice(0, 40).padEnd(42)} → ${JSON.stringify(u.payload.formula_params)}`)
    }
    console.log('\n✅ Dry-run completado. Agregar --no-dry-run para aplicar.\n')
    return
  }

  // ── Aplicar en lotes de 50 ────────────────────────────────────
  console.log('\n⬆️  Actualizando...')
  let ok = 0
  let fail = 0

  for (let i = 0; i < updates.length; i++) {
    const { id, codigo, payload } = updates[i]
    const { error: err } = await supabase
      .from('insumos')
      .update({
        tipo_precio: payload.tipo_precio,
        precio_base_ref: payload.precio_base_ref,
        formula_params: payload.formula_params,
      })
      .eq('id', id)

    if (err) {
      console.error(`  ❌ ${codigo}: ${err.message}`)
      fail++
    } else {
      ok++
      if (ok % 50 === 0) process.stdout.write(`  ${ok}/${updates.length}...\n`)
    }
  }

  console.log(`\n✅ Actualizados: ${ok}  ❌ Errores: ${fail}`)

  // ── FIX 3: Verificar duplicados de productos ──────────────────
  console.log('\n──────────────────────────────────────────')
  console.log('🔍 FIX 3: Verificación de duplicados de productos\n')

  const { data: dupes2 } = await supabase
    .from('productos')
    .select('id, codigo, nombre')
    .like('codigo', '%_2')

  const { data: dupes3 } = await supabase
    .from('productos')
    .select('id, codigo, nombre')
    .like('codigo', '%_3')

  const dupes = [...(dupes2 ?? []), ...(dupes3 ?? [])]

  if (dupes.length === 0) {
    console.log('   ✅ Sin duplicados detectados.\n')
  } else {
    console.log(`   ⚠️  ${dupes.length} producto(s) con sufijo _2/_3:`)
    for (const d of dupes) {
      const original = d.codigo.replace(/_\d+$/, '')
      console.log(`   - ${d.codigo.padEnd(20)} "${d.nombre}"`)
      console.log(`     → original posible: ${original}`)
    }
    console.log('\n   Para eliminar duplicados confirmados, ejecutar manualmente en Supabase.')
  }

  console.log('\n🎉 fix-formula-params completado!\n')
}

main().catch(e => {
  console.error('\n❌ Error fatal:', e.message)
  process.exit(1)
})
