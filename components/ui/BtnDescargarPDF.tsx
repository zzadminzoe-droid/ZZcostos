'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import type React from 'react'

interface Props {
  label?: string
  filename: string
  /**
   * Factory async que importa dinámicamente el Document y lo construye.
   * Se llama SOLO cuando el usuario hace click — nunca en SSR ni al cargar la página.
   *
   * Ejemplo:
   *   buildDocument={async () => {
   *     const { PDFCostos } = await import('@/lib/pdf/pdf-costos')
   *     return <PDFCostos productos={data} fecha={fecha} />
   *   }}
   */
  buildDocument: () => Promise<React.ReactElement>
  className?: string
}

export function BtnDescargarPDF({ label = 'PDF', filename, buildDocument, className }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const [{ pdf }, { saveAs }, doc] = await Promise.all([
        import('@react-pdf/renderer'),
        import('file-saver'),
        buildDocument(),
      ])
      const blob = await pdf(doc).toBlob()
      saveAs(blob, filename)
    } catch (err) {
      console.error('Error generando PDF:', err)
      toast.error('No se pudo generar el PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn('btn-secondary text-xs', loading && 'opacity-60 cursor-wait', className)}
    >
      {loading
        ? <><Loader2 size={13} className="animate-spin" /> Generando...</>
        : <><Download size={13} /> {label}</>
      }
    </button>
  )
}
