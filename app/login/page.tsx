import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">ZZ</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">ZZ Percusión</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestión de Costos</p>
        </div>

        <div className="card p-6">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} ZZ Percusión — Uso interno
        </p>
      </div>
    </div>
  )
}
