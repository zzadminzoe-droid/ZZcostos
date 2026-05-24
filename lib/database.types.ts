// Auto-generated from Supabase schema — regenerar con:
// npx supabase gen types typescript --project-id <id> > lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      categorias: {
        Row: { id: string; nombre: string; orden: number | null }
        Insert: { id?: string; nombre: string; orden?: number | null }
        Update: { id?: string; nombre?: string; orden?: number | null }
      }
      insumos: {
        Row: {
          id: string
          codigo: string
          categoria_id: string | null
          nombre: string
          unidad_medida: string
          cantidad: number
          precio_sin_iva: number
          precio_con_iva: number
          proveedor: string | null
          tipo_precio: string
          formula_params: Json | null
          precio_base_ref: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          codigo: string
          categoria_id?: string | null
          nombre: string
          unidad_medida?: string
          cantidad?: number
          precio_sin_iva?: number
          proveedor?: string | null
          tipo_precio?: string
          formula_params?: Json | null
          precio_base_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          categoria_id?: string | null
          nombre?: string
          unidad_medida?: string
          cantidad?: number
          precio_sin_iva?: number
          proveedor?: string | null
          tipo_precio?: string
          formula_params?: Json | null
          precio_base_ref?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      historial_precios: {
        Row: {
          id: string
          insumo_id: string
          precio_anterior: number
          precio_nuevo: number
          porcentaje_cambio: number | null
          cambiado_por: string | null
          cambiado_at: string
          nota: string | null
        }
        Insert: {
          id?: string
          insumo_id: string
          precio_anterior: number
          precio_nuevo: number
          cambiado_por?: string | null
          cambiado_at?: string
          nota?: string | null
        }
        Update: never
      }
      familias: {
        Row: { id: string; nombre: string; orden: number | null }
        Insert: { id?: string; nombre: string; orden?: number | null }
        Update: { id?: string; nombre?: string; orden?: number | null }
      }
      productos: {
        Row: {
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
        }
        Insert: {
          id?: string
          codigo: string
          nombre: string
          familia_id?: string | null
          precio_venta?: number
          mano_de_obra?: number
          gastos_fijos?: number
          incluir_adicionales?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          codigo?: string
          nombre?: string
          familia_id?: string | null
          precio_venta?: number
          mano_de_obra?: number
          gastos_fijos?: number
          incluir_adicionales?: boolean
          updated_at?: string
          updated_by?: string | null
        }
      }
      bom_items: {
        Row: {
          id: string
          producto_id: string
          insumo_id: string
          insumo_codigo: string
          insumo_nombre: string
          cantidad: number
          orden: number
        }
        Insert: {
          id?: string
          producto_id: string
          insumo_id: string
          insumo_codigo: string
          insumo_nombre: string
          cantidad?: number
          orden?: number
        }
        Update: {
          id?: string
          producto_id?: string
          insumo_id?: string
          insumo_codigo?: string
          insumo_nombre?: string
          cantidad?: number
          orden?: number
        }
      }
      audit_log: {
        Row: {
          id: string
          tabla: string
          registro_id: string | null
          accion: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          usuario_id: string | null
          usuario_nombre: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tabla: string
          registro_id?: string | null
          accion: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          usuario_id?: string | null
          usuario_nombre?: string | null
          created_at?: string
        }
        Update: never
      }
      configuracion: {
        Row: { id: string; clave: string; valor: string | null; descripcion: string | null }
        Insert: { id?: string; clave: string; valor?: string | null; descripcion?: string | null }
        Update: { id?: string; clave?: string; valor?: string | null; descripcion?: string | null }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
