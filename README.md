# ZZ Percusión — Sistema de Gestión de Costos

App web para gestión de costos, precios e insumos de ZZ Percusión.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Vercel

---

## Setup inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.local.example .env.local
# Editar .env.local con las credenciales de Supabase
```

### 3. Crear proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com) → New project
2. Copiar URL y anon key en `.env.local`
3. Copiar también la service role key (para migración)

### 4. Ejecutar el schema
En el SQL Editor de Supabase, pegar y ejecutar `supabase/schema.sql`

### 5. Crear usuario inicial
En Supabase: **Authentication → Users → Add user**
- Email: `zoe.atelierfuerza@gmail.com`

### 6. Migrar datos desde Excel
```bash
npm run migrate ./COSTOS_ZZ_VFINAL.xlsx
```

### 7. Correr en desarrollo
```bash
npm run dev
```

---

## Estructura
```
app/(app)/     — Rutas protegidas
  insumos/     — Insumos y precios calculados
  productos/   — Productos + BOM editable
  costos/      — Lista de costos + PDF
  precios/     — Lista de precios para clientes
  alertas/     — Alertas + historial de cambios
app/login/     — Autenticación
components/    — UI, layout, insumos, productos, exports
lib/           — Supabase, cálculos, utils
scripts/       — Migración Excel
supabase/      — Schema SQL completo
types/         — Tipos TypeScript
```
