import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/pdf
 * Body: { type: 'precios' | 'costos' | 'bom', data: any }
 * Returns: application/pdf binary
 *
 * @react-pdf/renderer runs perfectly in Node.js — no browser polyfill issues.
 * The client just POSTs the data and downloads the response blob.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, data } = body as { type: string; data: any }

    let element: any

    if (type === 'precios') {
      const { PDFPrecios } = await import('@/lib/pdf/pdf-precios')
      const { createElement } = await import('react')
      element = createElement(PDFPrecios, data)

    } else if (type === 'costos') {
      const { PDFCostos } = await import('@/lib/pdf/pdf-costos')
      const { createElement } = await import('react')
      element = createElement(PDFCostos, data)

    } else if (type === 'bom') {
      const { PDFBom } = await import('@/lib/pdf/pdf-bom')
      const { createElement } = await import('react')
      element = createElement(PDFBom, data)

    } else {
      return NextResponse.json({ error: 'Unknown PDF type' }, { status: 400 })
    }

    const { renderToBuffer } = await import('@react-pdf/renderer')
    const buffer = await renderToBuffer(element)
    // Convert Node.js Buffer to Uint8Array for NextResponse compatibility
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[api/pdf] Error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
