/**
 * VISTA: Restablecer contraseña desde el enlace del correo
 * Ruta: /restablecer-password?token=XXXX   Acceso: público
 * HU: HU-01.04
 *
 * ZONAS DINÁMICAS
 *  [Z1] Validez del enlace ... GET /api/auth/password/token/{token}
 *       200 { valido, email (enmascarado), expiraEn } · 410 TOKEN_EXPIRED | TOKEN_USED → se ofrece pedir otro enlace
 * ACCIONES
 *  [A1] Guardar contraseña ... POST /api/auth/password/restablecer { token, password } (el token queda invalidado)
 *
 * Mock: ?token=expirado y ?token=usado simulan los dos casos de error.
 */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from './AuthShell'
import { authService } from '../../api/authService'
import { useApi } from '../../hooks/useApi'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { isStrongPassword } from '../../utils/validators'

export default function RestablecerPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const check = useApi(() => authService.validarTokenRecuperacion(token), [token])

  const [form, setForm] = useState({ password: '', password2: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!isStrongPassword(form.password)) v.password = 'Mínimo 8 caracteres, con letras y números'
    if (form.password2 !== form.password) v.password2 = 'Las contraseñas no coinciden'
    setErrors(v)
    if (Object.keys(v).length) return
    setLoading(true)
    setServerError(null)
    try {
      await authService.restablecerPassword(token, form.password)
      navigate('/login', { replace: true, state: { notice: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' } })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const invalid = check.error
  const titulo = invalid?.code === 'TOKEN_USED' ? 'Este enlace ya se ha utilizado' : 'El enlace no es válido o ha caducado'

  return (
    <AuthShell>
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
        {check.loading && (
          <div className="flex items-center justify-center gap-2 py-space-xl text-on-surface-variant">
            <Spinner /> Comprobando el enlace…
          </div>
        )}

        {/* ⚡ ZONA DINÁMICA Z1 — GET /api/auth/password/token/{token} (enlace caducado / usado) */}
        {!check.loading && invalid && (
          <div data-dyn="Z1 · GET /auth/password/token/{token}" className="flex flex-col items-center text-center gap-space-md py-space-md">
            <span className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
              <Icon name="link_off" className="text-[34px]" />
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">{titulo}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Por seguridad, los enlaces de recuperación caducan en poco tiempo y solo pueden usarse una vez. Solicita uno nuevo.
            </p>
            <Link
              to="/recuperar-password"
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-2"
            >
              <Icon name="refresh" className="text-[20px]" /> Solicitar un nuevo enlace
            </Link>
          </div>
        )}

        {!check.loading && check.data && (
          <form className="flex flex-col gap-space-md" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-headline-md text-on-surface">Crea una nueva contraseña</h2>
              <p data-dyn="Z1 · GET /auth/password/token/{token}" className="font-body-md text-body-md text-on-surface-variant">
                Para la cuenta <strong className="text-on-surface">{check.data.email}</strong>.
              </p>
            </div>
            {serverError && <Alert>{serverError}</Alert>}
            <FormField label="Nueva contraseña" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={errors.password} hint="Mínimo 8 caracteres, con letras y números" />
            <FormField label="Repite la contraseña" type="password" autoComplete="new-password" value={form.password2} onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))} error={errors.password2} />
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-70"
            >
              {loading ? <Spinner /> : <Icon name="lock_reset" className="text-[20px]" />}
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
