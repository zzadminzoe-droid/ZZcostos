import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const S = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, padding: 28, color: '#111' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  brand:      { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  dateText:   { fontSize: 7.5, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  divider:    { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 10 },
  titulo:     { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  th:         { fontFamily: 'Helvetica-Bold', color: '#6b7280', fontSize: 7 },
  tableHead:  { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d1d5db', paddingBottom: 3, marginBottom: 2 },
  row:        { flexDirection: 'row', paddingVertical: 3 },
  rowEven:    { backgroundColor: '#f9fafb' },
  cell:       { fontSize: 7.5, color: '#374151' },
  cellMuted:  { fontSize: 7.5, color: '#9ca3af' },
  cellOrange: { fontSize: 7.5, color: '#ea580c' },
  cCodigo:    { width: '9%' },
  cNombre:    { width: '28%' },
  cFamilia:   { width: '11%' },
  cCostoSIva: { width: '12%', textAlign: 'right' },
  cCostoCIva: { width: '12%', textAlign: 'right' },
  cPrecio:    { width: '12%', textAlign: 'right' },
  cMargen:    { width: '11%', textAlign: 'right' },
  cEstado:    { width: '5%', textAlign: 'center' },
  footer:     { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
  summary:    { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  sumItem:    { fontSize: 7.5 },
})

interface ProductoCosto {
  codigo: string
  nombre: string
  familia: string
  costo_sin_iva: number
  costo_con_iva: number
  precio_venta: number
  total_bom_items: number
  items_sin_precio: number
}

interface Props {
  productos: ProductoCosto[]
  fecha: string
}

function fmt(n: number): string {
  if (!n) return '—'
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function margenStr(p: ProductoCosto): string {
  if (!p.precio_venta || p.precio_venta <= 0) return '—'
  const m = ((p.precio_venta - p.costo_sin_iva) / p.precio_venta) * 100
  return m.toFixed(1) + '%'
}

function margenColor(p: ProductoCosto): string {
  if (!p.precio_venta || p.costo_sin_iva <= 0) return '#9ca3af'
  const m = ((p.precio_venta - p.costo_sin_iva) / p.precio_venta) * 100
  return m >= 20 ? '#16a34a' : m >= 10 ? '#ca8a04' : '#ef4444'
}

function estadoLabel(p: ProductoCosto): string {
  if (p.total_bom_items === 0) return 'Sin BOM'
  if (p.items_sin_precio > 0) return '⚠'
  return '✓'
}

export function PDFCostos({ productos, fecha }: Props) {
  const completos = productos.filter(p => p.total_bom_items > 0 && p.items_sin_precio === 0).length
  const conPrecio = productos.filter(p => p.precio_venta > 0).length
  const sinBom    = productos.filter(p => p.total_bom_items === 0).length

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.brand}>ZZ Percusión</Text>
          <View>
            <Text style={S.dateText}>{fecha}</Text>
            <Text style={S.dateText}>Lista de Costos</Text>
          </View>
        </View>
        <View style={S.divider} />
        <Text style={S.titulo}>Lista de Costos</Text>

        {/* Tabla */}
        <View style={S.tableHead}>
          <Text style={[S.th, S.cCodigo]}>CÓDIGO</Text>
          <Text style={[S.th, S.cNombre]}>PRODUCTO</Text>
          <Text style={[S.th, S.cFamilia]}>FAMILIA</Text>
          <Text style={[S.th, S.cCostoSIva]}>COSTO S/IVA</Text>
          <Text style={[S.th, S.cCostoCIva]}>COSTO C/IVA</Text>
          <Text style={[S.th, S.cPrecio]}>PRECIO VENTA</Text>
          <Text style={[S.th, S.cMargen]}>MARGEN %</Text>
          <Text style={[S.th, S.cEstado]}>ST</Text>
        </View>

        {productos.map((p, i) => (
          <View key={p.codigo} style={[S.row, i % 2 === 0 ? S.rowEven : {}]}>
            <Text style={[S.cell, S.cCodigo]}>{p.codigo}</Text>
            <Text style={[S.cell, S.cNombre]}>{p.nombre}</Text>
            <Text style={[S.cellMuted, S.cFamilia]}>{p.familia}</Text>
            <Text style={[p.costo_sin_iva > 0 ? S.cell : S.cellMuted, S.cCostoSIva]}>{fmt(p.costo_sin_iva)}</Text>
            <Text style={[p.costo_con_iva > 0 ? S.cell : S.cellMuted, S.cCostoCIva]}>{fmt(p.costo_con_iva)}</Text>
            <Text style={[p.precio_venta > 0 ? S.cell : S.cellOrange, S.cPrecio]}>{fmt(p.precio_venta)}</Text>
            <Text style={[{ color: margenColor(p) }, S.cMargen]}>{margenStr(p)}</Text>
            <Text style={[S.cell, S.cEstado, { color: p.total_bom_items === 0 ? '#9ca3af' : p.items_sin_precio > 0 ? '#ca8a04' : '#16a34a' }]}>
              {estadoLabel(p)}
            </Text>
          </View>
        ))}

        {/* Resumen */}
        <View style={S.summary}>
          <Text style={S.sumItem}>Total: {productos.length} productos</Text>
          <Text style={[S.sumItem, { color: '#16a34a' }]}>Completos: {completos}</Text>
          <Text style={[S.sumItem, { color: '#ca8a04' }]}>Sin BOM: {sinBom}</Text>
          <Text style={[S.sumItem, { color: '#2563eb' }]}>Con precio venta: {conPrecio}</Text>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text>Generado por ZZ Percusión</Text>
          <Text>{fecha}</Text>
        </View>
      </Page>
    </Document>
  )
}
