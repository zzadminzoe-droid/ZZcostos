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

      // React 18's reconciler schedules updateContainer async — we must wait
      // for the 'change' event (fired on commit) before calling toBlob().
      // This mirrors how usePDF hook works internally.
      const instance = pdf()
      const blob = await new Promise<Blob>((resolve, reject) => {
        instance.on('change', async () => {
          try {
            resolve(await instance.toBlob())
          } catch (e) {
            reject(e)
          }
        })
        instance.updateContainer(doc)
      })

      saveAs(blob, filename)
    } catch (err) {
      console.error('Error generando PDF:', err)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`PDF error: ${msg.slice(0, 120)}`, { duration: 8000 })
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
