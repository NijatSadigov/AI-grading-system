import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive
      ? 'text-brand-700 font-medium'
      : 'text-slate-600 hover:text-slate-900'
    }`

  return (
    <div className="min-h-screen">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/liseylogo-symbol.png"
                alt="Hədəf"
                className="h-9 w-auto"
              />
              <div className="hidden sm:block leading-tight">
                <div className="font-display text-base">Hədəf</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">
                  STEAM Liseyi
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-7">
              <NavLink to="/classrooms" className={navItemClass}>
                Siniflər
              </NavLink>
              <NavLink to="/template" className={navItemClass}>
                Şablon
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/teachers" className={navItemClass}>
                  Müəllimlər
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">
                {user?.full_name}
              </div>
              <div className="text-xs text-slate-500 capitalize">
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Çıxış
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}