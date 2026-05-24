'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const S = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, padding: 32, color: '#111' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  brand:       { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  dateText:    { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  divider:     { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 12 },
  titulo:      { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 2 },
  subtitulo:   { fontSize: 9, color: '#6b7280', marginBottom: 14 },
  th:          { fontFamily: 'Helvetica-Bold', color: '#6b7280', fontSize: 7.5 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingBottom: 4, marginBottom: 2 },
  row:         { flexDirection: 'row', paddingVertical: 3.5 },
  rowEven:     { backgroundColor: '#f9fafb' },
  cell:        { fontSize: 8, color: '#374151' },
  cellRed:     { fontSize: 8, color: '#ef4444' },
  colCod:      { width: '12%' },
  colNom:      { width: '40%' },
  colCant:     { width: '10%', textAlign: 'right' },
  colPUnit:    { width: '17%', textAlign: 'right' },
  colSub:      { width: '17%', textAlign: 'right' },
  spacer:      { width: '4%' },
  tfoot:       { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 6, gap: 24 },
  totLabel:    { fontSize: 8, color: '#6b7280' },
  totValue:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111', textAlign: 'right' },
  margenBox:   { marginTop: 10, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 4 },
  margenRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  footer:      { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
})

interface BomItem {
  codigo: string
  nombre: string
  cantidad: number
  precio_unit: number
  subtotal: number
}

interface Props {
  producto: { codigo: string; nombre: string; familia: string }
  bom_items: BomItem[]
  costo_sin_iva: number
  costo_con_iva: number
  precio_venta?: number
  mano_de_obra?: number
  gastos_fijos?: number
  fecha: string
}

function fmt(n: number): string {
  if (!n) return '—'
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%'
}

export function PDFBom({ producto, bom_items, costo_sin_iva, costo_con_iva, precio_venta, mano_de_obra, gastos_fijos, fecha }: Props) {
  const contrib = precio_venta && precio_venta > 0 ? precio_venta - costo_sin_iva : null
  const margenPct = contrib !== null && precio_venta! > 0 ? (contrib / precio_venta!) * 100 : null

  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.brand}>ZZ Percusión</Text>
          <View>
            <Text style={S.dateText}>{fecha}</Text>
            <Text style={S.dateText}>Lista de materiales</Text>
          </View>
        </View>
        <View style={S.divider} />

        {/* Título */}
        <Text style={S.titulo}>{producto.nombre}</Text>
        <Text style={S.subtitulo}>{producto.codigo}  ·  {producto.familia}</Text>

        {/* Tabla BOM */}
        <View style={S.tableHeader}>
          <Text style={[S.th, S.colCod]}>CÓDIGO</Text>
          <Text style={[S.th, S.colNom]}>INSUMO</Text>
          <Text style={[S.th, S.colCant]}>CANT</Text>
          <Text style={[S.th, S.colPUnit]}>P. UNITARIO</Text>
          <Text style={[S.th, S.colSub]}>SUBTOTAL</Text>
          <View style={S.spacer} />
        </View>

        {bom_items.map((item, i) => {
          const sinPrecio = !item.precio_unit
          return (
            <View key={item.codigo + i} style={[S.row, i % 2 === 0 ? S.rowEven : {}]}>
              <Text style={[S.cell, S.colCod]}>{item.codigo}</Text>
              <Text style={[sinPrecio ? S.cellRed : S.cell, S.colNom]}>{item.nombre}</Text>
              <Text style={[S.cell, S.colCant]}>{item.cantidad}</Text>
              <Text style={[sinPrecio ? S.cellRed : S.cell, S.colPUnit]}>
                {sinPrecio ? 'Sin precio' : fmt(item.precio_unit)}
              </Text>
              <Text style={[sinPrecio ? S.cellRed : S.cell, S.colSub]}>
                {sinPrecio ? '—' : fmt(item.subtotal)}
              </Text>
              <View style={S.spacer} />
            </View>
          )
        })}

        {/* Totales */}
        <View style={S.tfoot}>
          {(mano_de_obra ?? 0) > 0 && (
            <View>
              <Text style={S.totLabel}>Mano de obra</Text>
              <Text style={S.totValue}>{fmt(mano_de_obra!)}</Text>
            </View>
          )}
          {(gastos_fijos ?? 0) > 0 && (
            <View>
              <Text style={S.totLabel}>Gastos fijos</Text>
              <Text style={S.totValue}>{fmt(gastos_fijos!)}</Text>
            </View>
          )}
          <View>
            <Text style={S.totLabel}>Costo S/IVA</Text>
            <Text style={S.totValue}>{fmt(costo_sin_iva)}</Text>
          </View>
          <View>
            <Text style={[S.totLabel, { color: '#111' }]}>Costo C/IVA</Text>
            <Text style={[S.totValue, { fontSize: 11 }]}>{fmt(costo_con_iva)}</Text>
          </View>
        </View>

        {/* Margen */}
        {precio_venta && precio_venta > 0 && contrib !== null && margenPct !== null && (
          <View style={S.margenBox}>
            <View style={S.margenRow}>
              <Text style={S.totLabel}>Precio de venta</Text>
              <Text style={S.totValue}>{fmt(precio_venta)}</Text>
            </View>
            <View style={S.margenRow}>
              <Text style={S.totLabel}>Contribución marginal</Text>
              <Text style={S.totValue}>{fmt(contrib)}</Text>
            </View>
            <View style={S.margenRow}>
              <Text style={S.totLabel}>Margen %</Text>
              <Text style={[S.totValue, {
                color: margenPct >= 20 ? '#16a34a' : margenPct >= 10 ? '#ca8a04' : '#ef4444'
              }]}>
                {fmtPct(margenPct)}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text>Generado por ZZ Percusión</Text>
          <Text>{fecha}</Text>
        </View>
      </Page>
    </Document>
  )
}
