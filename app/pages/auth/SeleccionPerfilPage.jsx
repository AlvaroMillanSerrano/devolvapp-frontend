/**
 * VISTA: Selección de perfil para usuarios MULTIROL
 * Ruta: /seleccionar-perfil   Acceso: autenticado con 2+ roles
 * HU: HU-01.02 / HU-01.03
 *
 * ZONAS DINÁMICAS
 *  [Z1] Nombre y roles del usuario ... respuesta de POST /api/auth/login (usuario.roles) — sin petición adicional
 */
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { useAuth } from '../../auth/useAuth'
import { ROLE_META, ROLE_PRIORITY, homeForRole } from '../../config/roles'
import Icon from '../../components/ui/Icon'

export default function SeleccionPerfilPage() {
  const { user, roles, isAuthenticated, selectRole, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles.length === 1) return <Navigate to={homeForRole(roles[0])} replace />

  const ordered = ROLE_PRIORITY.filter((r) => roles.includes(r)).reverse()

  const enter = (role) => {
    selectRole(role)
    const from = location.state?.from?.pathname
    navigate(from && from.startsWith(ROLE_META[role].home) ? from : ROLE_META[role].home, { replace: true })
  }

  return (
    <AuthShell wide>
      <div className="flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">Cuenta con varios perfiles</span>
          {/* ⚡ ZONA DINÁMICA Z1 — usuario.nombre y usuario.roles (respuesta del login) */}
          <h2 data-dyn="Z1 · usuario.roles (login)" className="font-headline-md text-headline-md text-on-surface">
            Hola, {user?.nombre}. ¿Con qué perfil quieres entrar?
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Podrás cambiar de perfil en cualquier momento desde la cabecera, sin volver a iniciar sesión.
          </p>
        </div>

        <div className={`grid grid-cols-1 ${ordered.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-space-md`}>
          {ordered.map((role) => {
            const meta = ROLE_META[role]
            return (
              <button
                key={role}
                type="button"
                onClick={() => enter(role)}
                className="group text-left bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary/30 transition-all flex flex-col gap-space-md"
              >
                <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <Icon name={meta.icon} className="text-[26px]" />
                </span>
                <span className="flex flex-col gap-1 flex-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface">{meta.label}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{meta.descripcion}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary font-semibold">
                  Entrar como {meta.label.toLowerCase()} <Icon name="arrow_forward" className="text-[18px]" />
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
          className="self-center inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-error"
        >
          <Icon name="logout" className="text-[18px]" /> No soy {user?.nombre}, cerrar sesión
        </button>
      </div>
    </AuthShell>
  )
}
