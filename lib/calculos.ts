import type {
  BomItem,
  CostoProducto,
  MargenProducto,
  SugerenciaAumento,
  HistorialPrecio,
} from '@/types'

// ─── Costo de producto ──────────────────────────────────────

export function calcularCostoProducto(
  bomItems: BomItem[],
  manoDeObra = 0,
  gastosFijos = 0,
  incluirAdicionales = false
): CostoProducto {
  const faltantes: string[] = []
  let totalSinIva = 0

  for (const item of bomItems) {
    const precio = item.insumo?.precio_sin_iva ?? 0
    if (precio === 0) {
      faltantes.push(item.insumo_codigo)
    }
    totalSinIva += precio * item.cantidad
  }

  if (incluirAdicionales) {
    totalSinIva += manoDeObra + gastosFijos
  }

  return {
    costo_sin_iva: totalSinIva,
    costo_con_iva: totalSinIva * 1.21,
    tiene_insumos_sin_precio: faltantes.length > 0,
    insumos_faltantes: faltantes,
  }
}

// ─── Margen de contribución ────────────────────────────────

export function calcularMargen(
  precioVenta: number,
  costoSinIva: number
): MargenProducto {
  if (precioVenta <= 0) {
    return { contribucion_marginal: 0, margen_contribucion_pct: 0, estado: 'malo' }
  }
  const contribucion = precioVenta - costoSinIva
  const pct = (contribucion / precioVenta) * 100

  return {
    contribucion_marginal: contribucion,
    margen_contribucion_pct: pct,
    estado: pct >= 20 ? 'bueno' : pct >= 10 ? 'regular' : 'malo',
  }
}

// ─── Sugerencia de aumento ─────────────────────────────────

export function calcularSugerenciaAumento(
  bomItems: BomItem[],
  historialPorInsumo: Record<string, HistorialPrecio[]>,
  precioVentaActual: number,
  diasVentana = 30
): SugerenciaAumento {
  const corte = new Date()
  corte.setDate(corte.getDate() - diasVentana)

  let pesoTotal = 0
  let aumentoPonderado = 0

  for (const item of bomItems) {
    const precioActual = item.insumo?.precio_sin_iva ?? 0
    const historial = historialPorInsumo[item.insumo_id] ?? []

    // Buscar el precio más viejo dentro de la ventana
    const enVentana = historial.filter(
      (h) => new Date(h.cambiado_at) >= corte
    )

    if (enVentana.length > 0 && precioActual > 0) {
      const precioBase = enVentana[enVentana.length - 1].precio_anterior
      if (precioBase > 0) {
        const pct = ((precioActual - precioBase) / precioBase) * 100
        const peso = item.cantidad * precioActual
        aumentoPonderado += pct * peso
        pesoTotal += peso
      }
    }
  }

  const aumentoPromedio = pesoTotal > 0 ? aumentoPonderado / pesoTotal : 0
  const precioSugerido =
    precioVentaActual > 0
      ? precioVentaActual * (1 + aumentoPromedio / 100)
      : 0

  return {
    aumento_promedio_pct: aumentoPromedio,
    precio_sugerido: precioSugerido,
    precio_actual: precioVentaActual,
    aplica: aumentoPromedio > 5,
  }
}

// ─── Helpers de formato ────────────────────────────────────

export function formatPeso(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

export function formatPct(valor: number): string {
  return `${valor.toFixed(1)}%`
}

export function formatNumero(valor: number): string {
  return new Intl.NumberFormat('es-AR').format(valor)
}
