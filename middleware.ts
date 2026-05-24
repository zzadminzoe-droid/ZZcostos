import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth')

  // Detectar si hay sesión de Supabase en las cookies
  const hasSession = request.cookies.getAll().some(
    c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  if (isPublic) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/productos', request.url))
    }
    return NextResponse.next()
  }

  // Rutas protegidas — redirigir si no hay sesión
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
