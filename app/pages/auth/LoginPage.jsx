/**
 * VISTA: Inicio de sesión MULTIROL
 * Ruta: /login   Acceso: público (solo sin sesión)
 * HU: HU-01.02 (inicio de sesión), HU-01.03 (roles), HU-07.02 (cuentas suspendidas)
 *
 * ACCIONES CONTRA EL SERVIDOR
 *  [A1] Iniciar sesión ...... POST /api/auth/login  { username, password }
 *       200 → { accessToken, refreshToken, usuario: { roles: ["ROLE_CIUDADANO", ...] } }
 *       401 BAD_CREDENTIALS   → mensaje genérico (no revela si el usuario existe)
 *       403 ACCOUNT_SUSPENDED → cuenta suspendida por un administrador
 *       429 TOO_MANY_ATTEMPTS → bloqueo temporal por intentos fallidos
 *
 * Tras el login:
 *   - 1 rol .................................... → home de ese rol
 *   - varios roles + último rol usado guardado . → home de ese rol
 *   - varios roles sin preferencia ............. → /seleccionar-perfil
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { useAuth } from '../../auth/useAuth'
import { env } from '../../config/env'
import { homeForRole, normalizeRoles, ROLE_META } from '../../config/roles'
import { DEMO_PASSWORD, DEMO_USERS } from '../../mocks/auth.mock'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'

const ERROR_MESSAGES = {
  BAD_CREDENTIALS: 'Usuario o contraseña incorrectos.',
  ACCOUNT_SUSPENDED: 'Tu cuenta está suspendida. Si crees que es un error, contacta con soporte.',
  TOO_MANY_ATTEMPTS: 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const [form, setForm] = useState({ username: location.state?.email ?? '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const notice =
    location.state?.notice ?? (params.get('expired') ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.' : null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!form.username.trim()) v.username = 'Introduce tu correo electrónico o DNI/NIE'
    if (!form.password) v.password = 'Introduce tu contraseña'
    setErrors(v)
    if (Object.keys(v).length) return

    setLoading(true)
    setServerError(null)
    try {
      const { activeRole } = await login(form)
      const from = location.state?.from?.pathname
      if (activeRole) navigate(from && from !== '/' ? from : homeForRole(activeRole), { replace: true })
      else navigate('/seleccionar-perfil', { replace: true, state: { from: location.state?.from } })
    } catch (err) {
      setServerError(ERROR_MESSAGES[err.code] ?? err.message)
      setForm((f) => ({ ...f, password: '' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1">
                    <h2 className="font-headline-md text-headline-md text-on-surface">Iniciar sesión</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Entra con tu correo o DNI/NIE.
          </p>
        </div>

        {notice && <Alert variant="info">{notice}</Alert>}
        {serverError && <Alert>{serverError}</Alert>}

        <form className="flex flex-col gap-space-md" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Correo electrónico o DNI/NIE"
            icon="person"
            autoComplete="username"
            placeholder="tu@correo.es o 12345678Z"
            value={form.username}
            onChange={set('username')}
            error={errors.username}
            autoFocus
          />
          <FormField
            label="Contraseña"
            icon="key"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
          />

          <div className="flex items-center justify-between gap-space-sm flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer font-body-sm text-body-sm text-on-surface-variant">
              <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.remember} onChange={set('remember')} />
              Mantener sesión iniciada
            </label>
            <Link to="/recuperar-password" className="font-label-lg text-label-lg text-primary font-semibold hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-70"
          >
            {loading ? <Spinner /> : <Icon name="login" className="text-[20px]" />}
            {loading ? 'Comprobando credenciales…' : 'Entrar'}
          </button>
        </form>

        <div className="flex flex-col gap-space-xs pt-space-sm border-t border-surface-container-high">
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
            ¿Aún no tienes cuenta?{' '}
            <Link to="/registro" className="text-primary font-semibold hover:underline">
              Regístrate
            </Link>
          </p>
          <p className="font-label-sm text-label-sm text-tertiary text-center">
            Las cuentas de recolector y administración las da de alta DevolvUp.
          </p>
        </div>
      </div>

      {env.useMocks && (
        <div className="mt-space-md rounded-xl bg-amber-50 p-space-md flex flex-col gap-space-sm">
          <span className="font-label-md text-label-md font-semibold text-amber-900 flex items-center gap-1">
            <Icon name="science" className="text-[16px]" /> Cuentas de demostración (modo mock) · contraseña «{DEMO_PASSWORD}»
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => setForm((f) => ({ ...f, username: u.email, password: DEMO_PASSWORD }))}
                className="text-left px-space-sm py-2 rounded-lg bg-white/70 hover:bg-white transition-colors"
              >
                <span className="block font-label-md text-label-md text-on-surface font-semibold">{u.email}</span>
                <span className="block font-label-sm text-label-sm text-on-surface-variant">
                  {u.estado === 'SUSPENDIDA'
                    ? 'Cuenta suspendida'
                    : u.roles.includes('RECOLECTOR') && u.zonaPreferidaId === null
                      ? 'Recolector · primer inicio de sesión'
                      : normalizeRoles(u.roles).map((r) => ROLE_META[r].label).join(' + ')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  )
}
