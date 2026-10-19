/**
 * Layout común a los tres roles
 *
 * Barra superior + pestañas inferiores en móvil (estilo app de reparto). En pantallas grandes el ciudadano
 * y el recolector tienen un panel lateral con su impacto ambiental (CO2), que se carga aquí una sola vez
 * y llega a las vistas por el contexto del <Outlet> (useOutletContext → { impacto, reloadImpacto }).
 *
 * ZONAS DINÁMICAS
 *  [L1] Nombre del usuario ........... usuario de la sesión (POST /api/auth/login · GET /api/auth/me) → usuario.nombre
 *  [L2] Impacto (panel lateral) ...... GET /api/ciudadano/impacto | GET /api/recolector/impacto
 *  [L3] Zonas del recolector ......... usuario de la sesión → usuario.zonaPreferida, usuario.zonasRecogida
 *  [L4] Avisos de administración ..... GET /api/admin/pendientes (número en la pestaña «Pendientes»)
 */
import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_META, ROLES } from '../config/roles'
import { useApi } from '../hooks/useApi'
import { ciudadanoService } from '../api/ciudadanoService'
import { recolectorService } from '../api/recolectorService'
import { adminService } from '../api/adminService'
import Icon from '../components/ui/Icon'
import { ImpactoDetalle } from '../components/impacto/Impacto'
import RoleSwitcher from './RoleSwitcher'
import ErrorBoundary from '../components/ErrorBoundary'

const NAV_POR_ROL = {
  [ROLES.CIUDADANO]: [
    { to: '/ciudadano', label: 'Inicio', icon: 'home', end: true },
    { to: '/ciudadano/pedidos', label: 'Pedidos', icon: 'receipt_long' },
    { to: '/ciudadano/monedero', label: 'Monedero', icon: 'account_balance_wallet' },
    { to: '/ciudadano/perfil', label: 'Ajustes', icon: 'settings' },
  ],
  [ROLES.RECOLECTOR]: [
    { to: '/recolector', label: 'Hoy', icon: 'today', end: true },
    { to: '/recolector/ruta', label: 'Mapa y ruta', icon: 'route' },
    { to: '/recolector/historial', label: 'Historial', icon: 'history' },
    { to: '/recolector/perfil', label: 'Ajustes', icon: 'settings' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Resumen', icon: 'monitoring', end: true },
    { to: '/admin/pendientes', label: 'Pendientes', icon: 'inbox', badge: true },
    { to: '/admin/recogidas', label: 'Recogidas', icon: 'local_shipping' },
    { to: '/admin/pagos', label: 'Pagos', icon: 'payments' },
    { to: '/admin/incidencias', label: 'Incidencias', icon: 'report' },
    { to: '/admin/zonas', label: 'Zonas', icon: 'map' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'group' },
    { to: '/admin/perfil', label: 'Ajustes', icon: 'settings' },
  ],
}

const IMPACTO = {
  [ROLES.CIUDADANO]: () => ciudadanoService.getImpacto(),
  [ROLES.RECOLECTOR]: () => recolectorService.getImpacto(),
}

const totalPendientes = (p) => (p ? p.transferencias.total + p.solicitudesZona + p.incidenciasAbiertas + p.recogidasAtrasadas : 0)

export default function AppLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [masOpen, setMasOpen] = useState(false)
  const nav = NAV_POR_ROL[role]
  const home = ROLE_META[role].home
  const conAside = Boolean(IMPACTO[role])
  const impacto = useApi(() => (IMPACTO[role] ? IMPACTO[role]() : Promise.resolve(null)), [role])
  const pendientes = useApi(() => (role === ROLES.ADMIN ? adminService.getPendientes() : Promise.resolve(null)), [role, location.pathname])
  const badge = totalPendientes(pendientes.data)

  // Recolector en su primer inicio de sesión: crear su contraseña (si se la dio administración) y elegir zona preferida
  if (role === ROLES.RECOLECTOR && (user?.zonaPreferida === null || user?.debeCambiarPassword) && location.pathname !== '/recolector/bienvenida') {
    return <Navigate to="/recolector/bienvenida" replace />
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const perfil = nav.find((i) => i.to.endsWith('/perfil'))
  const enCabecera = nav.filter((i) => i !== perfil)
  // En móvil caben 5 pestañas: si hay más, la última es «Más»
  const pestanas = nav.length > 5 ? nav.slice(0, 4) : nav
  const enMas = nav.length > 5 ? nav.slice(4) : []

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur border-b border-surface-container">
        <div className="mx-auto max-w-7xl h-16 px-4 lg:px-6 flex items-center gap-3">
          <Link to={home} className="flex items-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Icon name="recycling" className="text-[22px] text-secondary-fixed" />
            </span>
            <span className="text-lg font-bold text-primary tracking-tight hidden min-[400px]:inline" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              DevolvUp
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4 overflow-x-auto">
            {enCabecera.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `h-9 px-3.5 rounded-full text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'
                  }`
                }
              >
                {item.label}
                {/* ⚡ ZONA DINÁMICA L4 — GET /api/admin/pendientes */}
                {item.badge && badge > 0 && <Badge n={badge} />}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher />
            {/* ⚡ ZONA DINÁMICA L1 — nombre del usuario (sesión) */}
            <span data-dyn="L1 · usuario" className="hidden lg:inline text-sm text-on-surface-variant">
              Hola, <strong className="text-on-surface">{user?.nombre}</strong>
            </span>
            {/* Ajustes de la cuenta: engranaje con texto, fácil de encontrar para cualquier usuario */}
            <NavLink
              to={perfil.to}
              className={({ isActive }) =>
                `h-10 px-3 rounded-full flex items-center gap-1.5 text-sm font-semibold border transition-colors ${
                  isActive ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'
                }`
              }
              title="Ajustes: mis datos, dirección y contraseña"
              aria-label="Ajustes de mi cuenta"
            >
              <Icon name="settings" className="text-[22px]" />
              <span className="hidden sm:inline">Ajustes</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <Icon name="logout" className="text-[20px]" />
            </button>
          </div>
        </div>
      </header>

      <div className={`flex-1 w-full mx-auto max-w-7xl px-4 lg:px-6 pt-5 pb-28 md:pb-10 ${conAside ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8' : ''}`}>
        <main className="min-w-0">
          <ErrorBoundary key={location.pathname}>
            <Outlet context={{ impacto: impacto.data, reloadImpacto: impacto.reload }} />
          </ErrorBoundary>
        </main>
        {conAside && (
          // ⚡ ZONA DINÁMICA L2 / L3 — impacto del rol y, para el recolector, sus zonas
          <aside data-dyn="L2 · GET /{rol}/impacto" className="hidden lg:flex flex-col gap-4 sticky top-[84px] self-start max-h-[calc(100vh-100px)] overflow-y-auto pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tu impacto</p>
            <ImpactoDetalle impacto={impacto.data} />
            {role === ROLES.RECOLECTOR && <ZonasRecolector user={user} />}
            {role === ROLES.CIUDADANO && <Consejos />}
          </aside>
        )}
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface-container-lowest border-t border-surface-container pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {pestanas.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex-1 h-16 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} className="text-[24px]" />
                  {item.label}
                  {item.badge && badge > 0 && <Badge n={badge} className="absolute top-1.5 left-1/2 ml-1.5" />}
                </>
              )}
            </NavLink>
          ))}
          {enMas.length > 0 && (
            <button
              type="button"
              onClick={() => setMasOpen((v) => !v)}
              className={`flex-1 h-16 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                enMas.some((i) => location.pathname.startsWith(i.to)) ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <Icon name="more_horiz" className="text-[24px]" />
              Más
            </button>
          )}
        </div>
        {masOpen && (
          <div className="absolute bottom-16 right-2 w-56 rounded-2xl bg-surface-container-lowest shadow-xl p-1.5">
            {enMas.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMasOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 p-3 rounded-xl text-sm font-semibold ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low'}`}
              >
                <Icon name={item.icon} className="text-[20px]" /> {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </div>
  )
}

const Badge = ({ n, className = '' }) => (
  <span className={`min-w-5 h-5 px-1.5 rounded-full bg-error text-on-error text-[11px] font-bold flex items-center justify-center ${className}`}>{n}</span>
)

/** Panel del recolector: zona preferida y zonas en las que recoge (L3). Los días concretos se ven en «Ajustes». */
function ZonasRecolector({ user }) {
  return (
    <section data-dyn="L3 · usuario.zonaPreferida / zonasRecogida" className="card flex flex-col gap-2 text-sm">
      <h3 className="font-bold flex items-center gap-1.5">
        <Icon name="map" className="text-[18px] text-primary" /> Tus zonas
      </h3>
      <p>
        Preferida: <strong>{user?.zonaPreferida?.nombre ?? '—'}</strong>
      </p>
      <p className="text-on-surface-variant">Recoges en: {user?.zonasRecogida?.map((z) => z.nombre).join(', ') || 'ninguna todavía'}</p>
      <Link to="/recolector/perfil" className="text-primary font-semibold">
        Ver mis días o pedir cambio de zona (en Ajustes)
      </Link>
    </section>
  )
}

const CONSEJOS = [
  ['water_drop', 'Vacía y enjuaga los envases: así cuentan todos como válidos.'],
  ['compress', 'Aplasta las botellas y latas: caben más en cada bolsa.'],
  ['label', 'Escribe el código en cada bolsa para que el recolector la identifique.'],
]

function Consejos() {
  return (
    <section className="card flex flex-col gap-3">
      <h3 className="font-bold text-sm flex items-center gap-1.5">
        <Icon name="lightbulb" className="text-[18px] text-primary" /> Para que cuenten todos tus envases
      </h3>
      {CONSEJOS.map(([icon, t]) => (
        <p key={t} className="text-sm text-on-surface-variant flex gap-2">
          <Icon name={icon} className="text-[18px] text-primary shrink-0" /> {t}
        </p>
      ))}
    </section>
  )
}
