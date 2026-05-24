import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata: Metadata = {
  title: 'ZZ Percusión — Gestión de Costos',
  description: 'Sistema de gestión de costos para ZZ Percusión',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-surface min-h-screen antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '10px',
              background: '#1A202C',
              color: '#fff',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#48BB78', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#FC8181', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
