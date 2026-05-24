import type { CascoParams, FlejeParams, CañoParams, ChapaParams, FundicionParams } from '@/types'

// ─── Dimensiones de placa fenólica base ────────────────────
const PLACA_ANCHO_MM = 2200
const PLACA_ALTO_MM = 1600

// ─── Cascos (láminas de madera fenólica) ──────────────────
// Precio = (alto_mm × largo_mm) / (2200 × 1600) × precio_placa
export function calcularPrecioCasco(
  params: CascoParams,
  precioPlaca: number
): number {
  const areaPlaca = PLACA_ANCHO_MM * PLACA_ALTO_MM
  const areaLamina = params.alto_mm * params.largo_mm
  return (areaLamina / areaPlaca) * precioPlaca
}

// ─── Flejes ────────────────────────────────────────────────
// Precio = (largo_corte_mm / 6000) × precio_barra
export function calcularPrecioFleje(
  params: FlejeParams,
  precioBarra: number,
  largoBarra = 6000
): number {
  return (params.largo_corte_mm / largoBarra) * precioBarra
}

// ─── Caños ─────────────────────────────────────────────────
// Precio = (largo_corte_mm / largo_barra_mm) × precio_barra
export function calcularPrecioCaño(
  params: CañoParams,
  precioBarra: number
): number {
  return (params.largo_corte_mm / params.largo_barra_mm) * precioBarra
}

// ─── Chapas ────────────────────────────────────────────────
// Precio = (largo × alto) / (1220 × 2440) × precio_chapa [+ cromado]
const CHAPA_LARGO_MM = 1220
const CHAPA_ALTO_MM = 2440

export function calcularPrecioChapa(
  params: ChapaParams,
  precioChapa: number,
  precioCromado = 0
): number {
  const areaChapa = CHAPA_LARGO_MM * CHAPA_ALTO_MM
  const areaPieza = params.largo_mm * params.alto_mm
  const precioBase = (areaPieza / areaChapa) * precioChapa
  return precioBase + (params.tiene_cromado ? precioCromado : 0)
}

// ─── Fundición y cromado ────────────────────────────────────
// Precio = peso_g × precio_por_gramo + (cromado ? peso_g × precio_cromado : 0)
export function calcularPrecioFundicion(
  params: FundicionParams,
  precioPorGramo: number,
  precioCromadoPorGramo = 0
): number {
  const fundicion = params.peso_gramos * precioPorGramo
  const cromado = params.tiene_cromado ? params.peso_gramos * precioCromadoPorGramo : 0
  return fundicion + cromado
}

// ─── Dispatcher general ────────────────────────────────────
export function recalcularPrecioInsumo(
  tipo: string,
  params: Record<string, unknown>,
  preciosMadre: {
    precio_placa?: number
    precio_barra?: number
    precio_chapa?: number
    precio_cromado_chapa?: number
    precio_por_gramo_fundicion?: number
    precio_cromado_por_gramo?: number
    largo_barra_mm?: number
  }
): number {
  switch (tipo) {
    case 'casco':
      return calcularPrecioCasco(
        params as unknown as CascoParams,
        preciosMadre.precio_placa ?? 0
      )
    case 'fleje':
      return calcularPrecioFleje(
        params as unknown as FlejeParams,
        preciosMadre.precio_barra ?? 0
      )
    case 'caño':
      return calcularPrecioCaño(
        params as unknown as CañoParams,
        preciosMadre.precio_barra ?? 0
      )
    case 'chapa':
      return calcularPrecioChapa(
        params as unknown as ChapaParams,
        preciosMadre.precio_chapa ?? 0,
        preciosMadre.precio_cromado_chapa ?? 0
      )
    case 'fundicion':
      return calcularPrecioFundicion(
        params as unknown as FundicionParams,
        preciosMadre.precio_por_gramo_fundicion ?? 0,
        preciosMadre.precio_cromado_por_gramo ?? 0
      )
    default:
      return 0
  }
}
