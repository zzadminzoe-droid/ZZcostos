-- ============================================================
-- ZZ Percusión — Schema completo de Supabase
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- ─── Extensiones ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Categorías ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  orden int
);

-- ─── Insumos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  categoria_id uuid REFERENCES categorias(id),
  nombre text NOT NULL,
  unidad_medida text DEFAULT 'Unidad',
  cantidad numeric DEFAULT 1,
  precio_sin_iva numeric DEFAULT 0,
  precio_con_iva numeric GENERATED ALWAYS AS (precio_sin_iva * 1.21) STORED,
  proveedor text,
  tipo_precio text DEFAULT 'manual' CHECK (tipo_precio IN ('manual', 'calculado')),
  formula_params jsonb,
  precio_base_ref text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_insumos_codigo ON insumos(codigo);
CREATE INDEX IF NOT EXISTS idx_insumos_categoria ON insumos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_insumos_precio_base ON insumos(precio_base_ref);

-- ─── Historial de precios ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS historial_precios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid REFERENCES insumos(id) ON DELETE CASCADE,
  precio_anterior numeric NOT NULL,
  precio_nuevo numeric NOT NULL,
  porcentaje_cambio numeric GENERATED ALWAYS AS (
    CASE WHEN precio_anterior > 0
    THEN ((precio_nuevo - precio_anterior) / precio_anterior * 100)
    ELSE null END
  ) STORED,
  cambiado_por uuid REFERENCES auth.users(id),
  cambiado_at timestamptz DEFAULT now(),
  nota text
);

CREATE INDEX IF NOT EXISTS idx_historial_insumo ON historial_precios(insumo_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_precios(cambiado_at DESC);

-- ─── Familias de productos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  orden int
);

-- ─── Productos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  familia_id uuid REFERENCES familias(id),
  precio_venta numeric DEFAULT 0,
  mano_de_obra numeric DEFAULT 0,
  gastos_fijos numeric DEFAULT 0,
  incluir_adicionales boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_productos_familia ON productos(familia_id);

-- ─── BOM ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES insumos(id),
  insumo_codigo text NOT NULL,
  insumo_nombre text NOT NULL,
  cantidad numeric NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  orden int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bom_producto ON bom_items(producto_id);
CREATE INDEX IF NOT EXISTS idx_bom_insumo ON bom_items(insumo_id);
CREATE INDEX IF NOT EXISTS idx_bom_codigo ON bom_items(insumo_codigo);

-- ─── Audit log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL,
  registro_id uuid,
  accion text NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  usuario_nombre text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tabla ON audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);

-- ─── Configuración global ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text UNIQUE NOT NULL,
  valor text,
  descripcion text
);

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('cotizacion_dolar',       '1415', 'Cotización del dólar (ARS)'),
  ('iva_porcentaje',         '21',   'Porcentaje de IVA'),
  ('alerta_dias_sin_actualizar', '30', 'Días sin actualizar precio para mostrar alerta')
ON CONFLICT (clave) DO NOTHING;

-- ─── Datos maestros ───────────────────────────────────────────
INSERT INTO categorias (nombre, orden) VALUES
  ('CASCOS',               1),
  ('PARCHES',              2),
  ('FERRETERIA',           3),
  ('FLEJES',               4),
  ('CAÑOS',                5),
  ('FUNDICION ALUMINIO',   6),
  ('CHAPAS',               7),
  ('PINTURA',              8),
  ('OTROS',                9),
  ('CASCO ACERO INOX',     10)
ON CONFLICT DO NOTHING;

INSERT INTO familias (nombre, orden) VALUES
  ('Toms',        1),
  ('Timbales',    2),
  ('Bombos',      3),
  ('Redoblantes', 4),
  ('Soportes',    5),
  ('Otros',       6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- ─── Trigger: actualizar updated_at automáticamente ──────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Trigger: sincronizar nombre en BOM cuando cambia insumo ─
CREATE OR REPLACE FUNCTION sync_bom_nombre()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.nombre IS DISTINCT FROM NEW.nombre AND OLD.codigo = NEW.codigo THEN
    UPDATE bom_items
    SET insumo_nombre = NEW.nombre
    WHERE insumo_codigo = NEW.codigo;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_bom_nombre
  AFTER UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION sync_bom_nombre();

-- ─── Trigger: historial de precios ────────────────────────────
CREATE OR REPLACE FUNCTION registrar_historial_precio()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.precio_sin_iva IS DISTINCT FROM NEW.precio_sin_iva THEN
    INSERT INTO historial_precios (insumo_id, precio_anterior, precio_nuevo, cambiado_por)
    VALUES (NEW.id, OLD.precio_sin_iva, NEW.precio_sin_iva, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_precio
  AFTER UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION registrar_historial_precio();

-- ─── Trigger: audit log general ───────────────────────────────
CREATE OR REPLACE FUNCTION registrar_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    tabla, registro_id, accion,
    datos_anteriores, datos_nuevos, usuario_id
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE null END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE null END,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.updated_by
      ELSE NEW.updated_by
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_insumos
  AFTER INSERT OR UPDATE OR DELETE ON insumos
  FOR EACH ROW EXECUTE FUNCTION registrar_audit();

CREATE TRIGGER trg_audit_productos
  AFTER INSERT OR UPDATE OR DELETE ON productos
  FOR EACH ROW EXECUTE FUNCTION registrar_audit();

CREATE TRIGGER trg_audit_bom
  AFTER INSERT OR UPDATE OR DELETE ON bom_items
  FOR EACH ROW EXECUTE FUNCTION registrar_audit();

-- ─── Validación: no eliminar insumo si está en un BOM ────────
CREATE OR REPLACE FUNCTION check_insumo_en_bom()
RETURNS TRIGGER AS $$
DECLARE
  count_bom int;
BEGIN
  SELECT COUNT(*) INTO count_bom FROM bom_items WHERE insumo_id = OLD.id;
  IF count_bom > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar el insumo "%" porque está en % BOM(s) activo(s).', OLD.nombre, count_bom;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_insumo_en_bom
  BEFORE DELETE ON insumos
  FOR EACH ROW EXECUTE FUNCTION check_insumo_en_bom();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Política: solo usuarios autenticados pueden acceder
CREATE POLICY "Usuarios autenticados — SELECT" ON categorias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados — ALL" ON insumos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados — SELECT historial" ON historial_precios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados — SELECT familias" ON familias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados — ALL productos" ON productos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados — ALL bom" ON bom_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados — SELECT audit" ON audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados — ALL config" ON configuracion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
