import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setErr('Email və ya şifrə yanlışdır')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: editorial brand panel */}
      <div className="hidden lg:flex relative bg-brand-700 text-white p-16 flex-col justify-between overflow-hidden">
        {/* decorative orbs */}
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-brand-400/30 blur-3xl" />

        <div className="relative">
          <img
            src="/liseylogo-symbol-white.png"
            alt="Hədəf STEAM Liseyi"
            className="h-16 w-auto"
          />
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-5xl leading-[1.1] mb-6">
            Hər şagird üçün düşünülmüş qiymətləndirmə.
          </h2>
          <p className="text-brand-100 leading-relaxed text-lg">
            Beş prinsipə əsaslanan analitik model ilə şagirdlərin inkişafını
            izləyin, valideynlərə detallı rəylər hazırlayın.
          </p>
        </div>

        <div className="relative">
          <div className="font-display text-2xl tracking-wide">
            Hədəf <span className="text-brand-200">STEAM Liseyi</span>
          </div>
          <div className="text-xs text-brand-200 mt-1">
            © {new Date().getFullYear()} · Daxili qiymətləndirmə sistemi
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* mobile-only logo (shown when left panel is hidden) */}
          <img
            src="/liseylogo.png"
            alt="Hədəf STEAM Liseyi"
            className="h-12 w-auto mb-10 lg:hidden"
          />

          <div className="mb-10">
            <h1 className="font-display text-3xl mb-2">Daxil olun</h1>
            <p className="text-slate-500 text-sm">
              Müəllim hesabınıza giriş edin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-0 border-b border-slate-300 bg-transparent py-2 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                Şifrə
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border-0 border-b border-slate-300 bg-transparent py-2 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            {err && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors mt-4"
            >
              {submitting ? 'Giriş edilir…' : 'Daxil ol'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}