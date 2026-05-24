// ============================================================
// ZZ Percusión — Tipos TypeScript centralizados
// ============================================================

export interface Categoria {
  id: string
  nombre: string
  orden: number | null
}

export interface Insumo {
  id: string
  codigo: string
  categoria_id: string | null
  nombre: string
  unidad_medida: string
  cantidad: number
  precio_sin_iva: number
  precio_con_iva: number
  proveedor: string | null
  tipo_precio: 'manual' | 'calculado'
  formula_params: FormulaParams | null
  precio_base_ref: string | null
  updated_at: string
  updated_by: string | null
  // join
  categoria?: Categoria
}

export type TipoFormula = 'casco' | 'fleje' | 'caño' | 'chapa' | 'fundicion'

// ── Formato plano (almacenado en JSONB) ──────────────────────
// Cada tipo discrimina por `tipo` y tiene sus campos directamente
export type FormulaParams =
  | { tipo: 'casco';    alto_mm: number;   largo_mm: number; largo_barra_mm?: number }
  | { tipo: 'fleje';   largo_mm: number;  largo_barra_mm?: number }
  | { tipo: 'caño';    largo_mm: number;  largo_barra_mm?: number }
  | { tipo: 'chapa';   largo_mm: number;  alto_mm: number; cromado: boolean }
  | { tipo: 'fundicion'; peso_g: number;  cromado: boolean }

// ── Tipos de params para las funciones de cálculo (sin cambios) ──
export interface CascoParams   { alto_mm: number; largo_mm: number }
export interface FlejeParams   { largo_corte_mm: number }
export interface CañoParams    { largo_corte_mm: number; largo_barra_mm: number }
export interface ChapaParams   { largo_mm: number; alto_mm: number; tiene_cromado: boolean }
export interface FundicionParams { peso_gramos: number; tiene_cromado: boolean }

export interface HistorialPrecio {
  id: string
  insumo_id: string
  precio_anterior: number
  precio_nuevo: number
  porcentaje_cambio: number | null
  cambiado_por: string | null
  cambiado_at: string
  nota: string | null
  // join
  insumo?: Pick<Insumo, 'codigo' | 'nombre'>
}

export interface Familia {
  id: string
  nombre: string
  orden: number | null
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  familia_id: string | null
  precio_venta: number
  mano_de_obra: number
  gastos_fijos: number
  incluir_adicionales: boolean
  updated_at: string
  updated_by: string | null
  // join
  familia?: Familia
  bom_items?: BomItem[]
}

export interface BomItem {
  id: string
  producto_id: string
  insumo_id: string
  insumo_codigo: string
  insumo_nombre: string
  cantidad: number
  orden: number
  // join (precio en tiempo real)
  insumo?: Pick<Insumo, 'precio_sin_iva' | 'precio_con_iva' | 'unidad_medida' | 'tipo_precio'>
}

export interface AuditLog {
  id: string
  tabla: string
  registro_id: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  datos_anteriores: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown> | null
  usuario_id: string | null
  usuario_nombre: string | null
  created_at: string
}

export interface Configuracion {
  id: string
  clave: string
  valor: string | null
  descripcion: string | null
}

// ============================================================
// Tipos calculados / UI
// ============================================================

export interface CostoProducto {
  costo_sin_iva: number
  costo_con_iva: number
  tiene_insumos_sin_precio: boolean
  insumos_faltantes: string[]
}

export interface MargenProducto {
  contribucion_marginal: number
  margen_contribucion_pct: number
  estado: 'bueno' | 'regular' | 'malo' // >20% | 10-20% | <10%
}

export interface SugerenciaAumento {
  aumento_promedio_pct: number
  precio_sugerido: number
  precio_actual: number
  aplica: boolean // true si aumento > 5%
}

export interface AlertaSistema {
  id: string
  tipo: 'error' | 'warning' | 'info'
  titulo: string
  descripcion: string
  afecta?: string[] // códigos de productos/insumos afectados
  created_at?: string
}
