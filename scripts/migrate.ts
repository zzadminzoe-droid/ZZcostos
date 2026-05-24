/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ZZ Percusión — Migración desde COSTOS_ZZ_VFINAL.xlsx a Supabase
 *
 * Estructura real del Excel (analizada 2025-05-23):
 *
 * INSUMOS PRECIOS:
 *   Fila 0: meta (MANUAL/AUTOMATICO)
 *   Fila 1: encabezados (CODIGO, CATEGORIA, NOMBRE, Unidad, Cantidad, Precio sin IVA, ...)
 *   Fila 2+: datos
 *     A=código, B=categoría, C=nombre, D=unidad, E=cantidad, F=precio_sin_iva (col F es la que cuenta)
 *   Omitir: filas donde A es nulo, comienza con '.', o no empieza con dígito
 *
 * Hojas de productos (TOMS, TIMBALES, BOMBOS, REDOBLANTES, SOPORTES, OTROS):
 *   Fila 0: nombres de producto en cols A, F, K, P, U, Z, AE, AJ, AO, AT, AY, BD, BI, BN, BS...
 *   Fila 1: códigos de producto en las mismas cols
 *   Fila 2: encabezados (Codigo pieza, Insumo, Cantidad, Precio) — ignorar
 *   Fila 3+: ítems del BOM en grupos de 5 cols:
 *     [base+0]=código_insumo, [base+1]=nombre_insumo, [base+2]=cantidad, [base+3]=precio (ignorar), [base+4]=spacer
 *
 * LISTA DE COSTOS FINAL:
 *   Fila 0: encabezados
 *   Fila 1+: A=código, B=nombre, C=costo_sin_iva, D=costo_con_iva, E=precio_venta (todos null actualmente)
 *
 * Problemas detectados y cómo se manejan:
 *   - Códigos duplicados (TO128T x3, R135T x2): se genera sufijo _2, _3, etc.
 *   - Categoría "Caños" (minúscula): se normaliza a "CAÑOS"
 *   - Códigos de insumo raros (".2.23", "Chequear..."): se omiten
 *
 * Uso:
 *   npx tsx -r dotenv/config scripts/migrate.ts ./COSTOS_ZZ_VFINAL.xlsx dotenv_config_path=.env.local
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// ─── Config ───────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as any

// ─── Helpers ──────────────────────────────────────────────────

function toNum(val: unknown): number {
  if (val == null) return 0
  const n = Number(String(val).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function toStr(val: unknown): string {
  return val == null ? '' : String(val).trim()
}

/** Convierte índice de columna (0=A, 1=B, ..., 26=AA) a letra(s) de Excel */
function colIdxToLetter(idx: number): string {
  let result = ''
  let n = idx
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

/** Normaliza nombre de categoría */
function normCat(raw: unknown): string {
  const s = toStr(raw).toUpperCase().trim()
  // "Caños" → "CAÑOS"
  if (s === 'CAÑOS' || s === 'CAÑOS') return 'CAÑOS'
  return s
}

/** Verifica si un código de insumo es válido (empieza con dígito) */
function codigoValido(cod: unknown): boolean {
  const s = toStr(cod)
  return s.length > 0 && /^\d/.test(s)
}

// ─── Migración principal ───────────────────────────────────────
async function migrar(excelPath: string) {
  console.log(`\n📂 Leyendo: ${excelPath}`)
  const buf = fs.readFileSync(excelPath)
  const wb = XLSX.read(buf, { type: 'buffer' })
  console.log('📋 Hojas:', wb.SheetNames.join(', '))

  // ── 1. Cargar categorías de la DB ──────────────────────────
  const { data: cats, error: errCats } = await supabase
    .from('categorias')
    .select('id, nombre')
  if (errCats) throw new Error('No se pudo conectar a Supabase: ' + errCats.message)

  // Mapa: NOMBRE_NORMALIZADO -> id
  const catMap: Record<string, string> = {}
  for (const c of (cats ?? [])) {
    catMap[normCat(c.nombre)] = c.id
  }

  // Agregar categoría CAÑOS si no existe (puede haberse llamado "CAÑOS" en el schema)
  const catsMissing = new Set<string>()

  console.log(`\n✅ Categorías en DB: ${Object.keys(catMap).length}`)
  console.log('   ', Object.keys(catMap).join(', '))

  // ── 2. Migrar insumos ──────────────────────────────────────
  console.log('\n──────────────────────────────────────────')
  console.log('📦 PASO 1: Migrando insumos...')

  const wsInsumos = wb.Sheets['INSUMOS PRECIOS']
  const rowsInsumos = XLSX.utils.sheet_to_json(wsInsumos, {
    header: 'A',
    defval: null,
  }) as any[]

  // Usar Map para deduplicar por código (si hay duplicados, gana el que tiene precio > 0)
  const insumoMap_build = new Map<string, any>()
  const categoriasSinId: string[] = []

  for (const row of rowsInsumos.slice(2)) { // saltar filas 0 y 1
    const codigo = toStr(row['A'])
    if (!codigoValido(codigo)) continue

    const catRaw = normCat(row['B'])
    const nombre = toStr(row['C'])
    const unidad = toStr(row['D']) || 'Unidad'
    const cantidad = toNum(row['E']) || 1
    const precio = toNum(row['F'])

    if (!nombre) continue

    const catId = catMap[catRaw] ?? null
    if (catRaw && !catId) {
      if (!catsMissing.has(catRaw)) {
        categoriasSinId.push(catRaw)
        catsMissing.add(catRaw)
      }
    }

    const existing = insumoMap_build.get(codigo)
    // Si ya existe y el nuevo tiene precio, reemplazar; si el existente ya tiene precio, mantener
    if (!existing || (precio > 0 && existing.precio_sin_iva === 0)) {
      insumoMap_build.set(codigo, {
        codigo,
        categoria_id: catId,
        nombre,
        unidad_medida: unidad.trim(),
        cantidad,
        precio_sin_iva: precio,
        tipo_precio: 'manual',
      })
    }
  }

  const insumos = Array.from(insumoMap_build.values())

  if (categoriasSinId.length > 0) {
    console.warn('⚠️  Categorías sin ID en DB (se creará el insumo sin categoría):', categoriasSinId)
  }

  console.log(`   → ${insumos.length} insumos válidos encontrados (${insumos.filter(i => i.precio_sin_iva > 0).length} con precio)`)

  // Upsert en lotes de 100
  let erroresInsumos = 0
  for (let i = 0; i < insumos.length; i += 100) {
    const batch = insumos.slice(i, i + 100)
    const { error } = await supabase
      .from('insumos')
      .upsert(batch, { onConflict: 'codigo' })
    if (error) {
      console.error(`❌ Error lote ${i}: ${error.message}`)
      erroresInsumos++
    } else {
      process.stdout.write('.')
    }
  }
  console.log(`\n✅ Insumos migrados (${erroresInsumos} lotes con error)`)

  // ── 3. Cargar mapa de insumos por código ──────────────────
  const { data: todosInsumos } = await supabase
    .from('insumos')
    .select('id, codigo')
  const insumoMap: Record<string, string> = {}
  for (const ins of (todosInsumos ?? [])) {
    insumoMap[ins.codigo] = ins.id
  }
  console.log(`\n🗺️  ${Object.keys(insumoMap).length} insumos en mapa`)

  // ── 4. Cargar familias ────────────────────────────────────
  const { data: fams } = await supabase.from('familias').select('id, nombre')
  const famMap: Record<string, string> = {}
  for (const f of (fams ?? [])) {
    famMap[f.nombre.toUpperCase().trim()] = f.id
  }

  // ── 5. Migrar productos (BOM incluido) ─────────────────────
  console.log('\n──────────────────────────────────────────')
  console.log('🥁 PASO 2: Migrando productos y BOMs...')

  const HOJAS_FAMILIAS: Record<string, string> = {
    TOMS:         'TOMS',
    TIMBALES:     'TIMBALES',
    BOMBOS:       'BOMBOS',
    REDOBLANTES:  'REDOBLANTES',
    SOPORTES:     'SOPORTES',
    OTROS:        'OTROS',
  }

  // Registro de códigos usados para deduplicar
  const codigosUsados = new Set<string>()

  for (const [sheetName, familiaKey] of Object.entries(HOJAS_FAMILIAS)) {
    const ws = wb.Sheets[sheetName]
    if (!ws) {
      console.warn(`⚠️  Hoja "${sheetName}" no encontrada`)
      continue
    }

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 'A',
      defval: null,
    }) as any[]

    const row0 = rows[0] ?? {} // nombres
    const row1 = rows[1] ?? {} // códigos
    const familiaId = famMap[familiaKey] ?? null

    // Extraer productos (cada 5 columnas: índice 0, 5, 10, 15, ...)
    const productos: Array<{
      nombre: string
      codigo: string
      colBase: number // índice numérico de columna (0 = A, 5 = F, ...)
    }> = []

    for (let colIdx = 0; colIdx < 200; colIdx += 5) {
      const colLetter = colIdxToLetter(colIdx)
      const nombre = toStr(row0[colLetter])
      const codigoRaw = toStr(row1[colLetter])

      if (!nombre || ['Costo C/IVA', 'Costo S/IVA'].includes(nombre)) continue
      if (!codigoRaw) continue

      productos.push({ nombre, codigo: codigoRaw, colBase: colIdx })
    }

    console.log(`\n  📋 ${sheetName}: ${productos.length} productos`)

    for (const prod of productos) {
      // Deduplicar código
      let codigoFinal = prod.codigo
      if (codigosUsados.has(codigoFinal)) {
        let sufijo = 2
        while (codigosUsados.has(`${codigoFinal}_${sufijo}`)) sufijo++
        codigoFinal = `${codigoFinal}_${sufijo}`
        console.warn(`    ⚠️  Código duplicado "${prod.codigo}" → renombrado a "${codigoFinal}"`)
      }
      codigosUsados.add(codigoFinal)

      // Upsert producto
      const { data: prodData, error: errProd } = await supabase
        .from('productos')
        .upsert(
          { codigo: codigoFinal, nombre: prod.nombre, familia_id: familiaId },
          { onConflict: 'codigo' }
        )
        .select('id')
        .single()

      if (errProd) {
        console.error(`    ❌ Error insertando producto ${codigoFinal}: ${errProd.message}`)
        continue
      }

      const productoId = prodData.id

      // Leer BOM desde filas 3+ para esta columna
      const bomItems: any[] = []
      let orden = 0
      let insumosSinId = 0

      for (const row of rows.slice(3)) {
        const colCodigo  = colIdxToLetter(prod.colBase)      // A, F, K...
        const colNombre  = colIdxToLetter(prod.colBase + 1)  // B, G, L...
        const colCantidad = colIdxToLetter(prod.colBase + 2)  // C, H, M...

        const codigoIns = toStr(row[colCodigo])
        const nombreIns = toStr(row[colNombre])
        const cantidad  = toNum(row[colCantidad])

        // Saltar filas vacías o sin cantidad
        if (!codigoIns || !nombreIns || cantidad <= 0) continue
        // Saltar si código de insumo no es válido (ej: vacío, no es código de insumo)
        if (!codigoValido(codigoIns)) continue

        const insumoId = insumoMap[codigoIns]
        if (!insumoId) {
          insumosSinId++
          // Se inserta igual con insumo_id null para no perder el BOM
          continue
        }

        bomItems.push({
          producto_id: productoId,
          insumo_id: insumoId,
          insumo_codigo: codigoIns,
          insumo_nombre: nombreIns,
          cantidad,
          orden: orden++,
        })
      }

      // Reemplazar BOM existente
      if (bomItems.length > 0) {
        await supabase.from('bom_items').delete().eq('producto_id', productoId)
        const { error: errBom } = await supabase.from('bom_items').insert(bomItems)
        if (errBom) {
          console.error(`    ❌ BOM ${codigoFinal}: ${errBom.message}`)
        } else {
          const aviso = insumosSinId > 0 ? ` (${insumosSinId} insumos no encontrados)` : ''
          console.log(`    ✓ ${codigoFinal} — "${prod.nombre}" — ${bomItems.length} ítems${aviso}`)
        }
      } else {
        console.log(`    ⚠️  ${codigoFinal} — "${prod.nombre}" — BOM vacío`)
      }
    }
  }

  // ── 6. Resumen final ──────────────────────────────────────
  console.log('\n──────────────────────────────────────────')
  console.log('📊 RESUMEN FINAL:')

  const { count: totalInsumos } = await supabase
    .from('insumos')
    .select('*', { count: 'exact', head: true })
  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
  const { count: totalBom } = await supabase
    .from('bom_items')
    .select('*', { count: 'exact', head: true })

  console.log(`   Insumos migrados:  ${totalInsumos}`)
  console.log(`   Productos creados: ${totalProductos}`)
  console.log(`   Ítems BOM total:   ${totalBom}`)
  console.log('\n🎉 ¡Migración completada!\n')
}

// ─── Punto de entrada ─────────────────────────────────────────
const excelFile = process.argv[2]
if (!excelFile) {
  console.error('\nUso: npx tsx -r dotenv/config scripts/migrate.ts <ruta-excel> dotenv_config_path=.env.local\n')
  process.exit(1)
}

migrar(path.resolve(excelFile)).catch((err) => {
  console.error('\n❌ Error fatal:', err.message)
  process.exit(1)
})
