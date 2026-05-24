'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props {
  label?: string
  filename: string
  /** Elemento JSX de un Document de @react-pdf/renderer */
  document: React.ReactElement
  className?: string
}

export function BtnDescargarPDF({ label = 'PDF', filename, document: doc, className }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      // Importación dinámica para evitar problemas de SSR en Next.js
      const [{ pdf }, { saveAs }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('file-saver'),
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
