/**
 * VISTA: Recuperar contraseña — solicitud de enlace
 * Ruta: /recuperar-password   Acceso: público
 * HU: HU-01.04
 *
 * ACCIONES CONTRA EL SERVIDOR
 *  [A1] Solicitar enlace ... POST /api/auth/password/recuperar { email }
 *       Responde 202 exista o no la cuenta (no se revela qué correos están registrados).
 *       El backend envía un enlace /restablecer-password?token=… de un solo uso y caducidad limitada.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from './AuthShell'
import { authService } from '../../api/authService'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { isValidEmail } from '../../utils/validators'

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError('Introduce un correo electrónico válido')
      return
    }
    setError(null)
    setServerError(null)
    setLoading(true)
    try {
      await authService.solicitarRecuperacion(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
        <Link to="/login" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit">
          <Icon name="arrow_back" className="text-[16px]" /> Volver al inicio de sesión
        </Link>

        {sent ? (
          <div className="flex flex-col items-center text-center gap-space-md py-space-md">
            <span className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <Icon name="mark_email_read" className="text-[34px]" />
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Revisa tu correo</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Si <strong className="text-on-surface">{email}</strong> está registrado, recibirás un enlace para crear una nueva contraseña. El enlace
              caduca en poco tiempo y solo puede usarse una vez.
            </p>
            <button type="button" onClick={() => setSent(false)} className="font-label-lg text-label-lg text-primary font-semibold hover:underline">
              No me ha llegado: volver a enviarlo
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-space-md" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1">
              <h2 className="font-headline-md text-headline-md text-on-surface">¿Has olvidado tu contraseña?</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Indica el correo electrónico de tu cuenta y te enviaremos un enlace seguro para restablecerla.
              </p>
            </div>
            {serverError && <Alert>{serverError}</Alert>}
            <FormField label="Correo electrónico" icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} autoFocus />
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-70"
            >
              {loading ? <Spinner /> : <Icon name="send" className="text-[20px]" />}
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
