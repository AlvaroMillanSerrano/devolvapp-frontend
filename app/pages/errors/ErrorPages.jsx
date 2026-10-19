import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { homeForRole } from '../../config/roles'
import Icon from '../../components/ui/Icon'

function ErrorScreen({ code, icon, title, text }) {
  const { isAuthenticated, activeRole } = useAuth()
  const home = isAuthenticated ? homeForRole(activeRole) : '/login'
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-gutter">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-sm p-space-xl flex flex-col items-center text-center gap-space-md">
        <span className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
          <Icon name={icon} className="text-[34px]" />
        </span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-tertiary">Error {code}</span>
        <h1 className="font-headline-md text-headline-md text-on-surface">{title}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
        <Link to={home} className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-title-md text-title-md hover:bg-primary-container">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

/** HU-01.03 · acceso denegado a una funcionalidad de otro rol */
export function ForbiddenPage() {
  return (
    <ErrorScreen
      code={403}
      icon="block"
      title="No tienes acceso a esta sección"
      text="Tu perfil no tiene permisos para esta funcionalidad. Si tu cuenta tiene otros perfiles, cámbialo desde la cabecera."
    />
  )
}

export function NotFoundPage() {
  return <ErrorScreen code={404} icon="travel_explore" title="Página no encontrada" text="La dirección no existe o se ha movido." />
}
