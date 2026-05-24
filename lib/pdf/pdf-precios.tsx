import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const S = StyleSheet.create({
  page:      { fontFamily: 'Helvetica', fontSize: 9, padding: 36, color: '#111' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  brand:     { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  dateText:  { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  divider:   { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 14 },
  titulo:    { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 16 },
  th:        { fontFamily: 'Helvetica-Bold', color: '#6b7280', fontSize: 7.5 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: '#d1d5db', paddingBottom: 5, marginBottom: 2 },
  row:       { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },
  cell:      { fontSize: 9, color: '#111' },
  cellSub:   { fontSize: 8, color: '#6b7280' },
  cCodigo:   { width: '12%' },
  cNombre:   { width: '68%' },
  cPrecio:   { width: '20%', textAlign: 'right' },
  footer:    { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 7, color: '#9ca3af', flexDirection: 'row', justifyContent: 'space-between' },
  total:     { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, fontSize: 8, color: '#6b7280' },
})

interface ProductoPrecio {
  codigo: string
  nombre: string
  familia: string
  precio_venta: number
}

interface Props {
  productos: ProductoPrecio[]
  fecha: string
}

function fmt(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function PDFPrecios({ productos, fecha }: Props) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.brand}>ZZ Percusión</Text>
          <View>
            <Text style={S.dateText}>{fecha}</Text>
            <Text style={S.dateText}>Lista de Precios</Text>
          </View>
        </View>
        <View style={S.divider} />
        <Text style={S.titulo}>Lista de Precios</Text>

        {/* Tabla */}
        <View style={S.tableHead}>
          <Text style={[S.th, S.cCodigo]}>CÓDIGO</Text>
          <Text style={[S.th, S.cNombre]}>PRODUCTO</Text>
          <Text style={[S.th, S.cPrecio]}>PRECIO</Text>
        </View>

        {productos.map((p, i) => (
          <View key={p.codigo + i} style={S.row}>
            <Text style={[S.cellSub, S.cCodigo]}>{p.codigo}</Text>
            <Text style={[S.cell, S.cNombre]}>{p.nombre}</Text>
            <Text style={[S.cell, S.cPrecio, { fontFamily: 'Helvetica-Bold' }]}>{fmt(p.precio_venta)}</Text>
          </View>
        ))}

        <Text style={S.total}>{productos.length} artículos · Precios en pesos argentinos</Text>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text>ZZ Percusión — Lista de Precios</Text>
          <Text>{fecha}</Text>
        </View>
      </Page>
    </Document>
  )
}
