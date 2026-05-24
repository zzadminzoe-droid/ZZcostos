'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props {
  label?: string
  filename: string
  /**
   * PDF type for the API route ('precios' | 'costos' | 'bom')
   */
  pdfType: string
  /**
   * Data to send to the API route (props of the PDF component)
   */
  pdfData: Record<string, unknown>
  className?: string
}

export function BtnDescargarPDF({ label = 'PDF', filename, pdfType, pdfData, className }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: pdfType, data: pdfData }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
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
