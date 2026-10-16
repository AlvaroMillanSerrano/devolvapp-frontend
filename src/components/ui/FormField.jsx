import { useId, useState } from 'react'
import Icon from './Icon'

/**
 * Campo de formulario con el estilo de inputs de DESIGN.md
 * (alto 44px, foco en primary, error en rojo con mensaje debajo).
 */
export function FormField({ label, error, hint, icon, className = '', inputClassName = '', type = 'text', children, ...props }) {
  const id = useId()
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="font-label-lg text-label-lg text-on-surface font-semibold">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && <Icon name={icon} className="absolute left-3 text-[20px] text-tertiary pointer-events-none" />}
        {children ?? (
          <input
            id={id}
            type={isPassword && show ? 'text' : type}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`w-full h-11 ${icon ? 'pl-10' : 'pl-3'} ${isPassword ? 'pr-11' : 'pr-3'} rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 transition-all ${
              error ? 'ring-2 ring-error/60 focus:ring-error' : 'focus:ring-primary'
            } ${inputClassName}`}
            {...props}
          />
        )}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[20px]" />
          </button>
        )}
      </div>
      {error ? (
        <span id={`${id}-error`} className="font-body-sm text-body-sm text-error flex items-center gap-1">
          <Icon name="error" className="text-[16px]" />
          {error}
        </span>
      ) : (
        hint && <span className="font-label-sm text-label-sm text-on-surface-variant">{hint}</span>
      )}
    </div>
  )
}

export function Alert({ variant = 'error', icon, children, className = '' }) {
  const styles = {
    error: 'bg-error-container/60 text-on-error-container',
    info: 'bg-secondary-container/40 text-on-secondary-container',
    warning: 'bg-amber-50 text-amber-900',
  }
  const icons = { error: 'error', info: 'info', warning: 'warning' }
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`p-space-sm rounded-lg flex items-start gap-2 ${styles[variant]} ${className}`}>
      <Icon name={icon ?? icons[variant]} className="text-[20px] shrink-0" />
      <div className="font-body-sm text-body-sm">{children}</div>
    </div>
  )
}

export function Spinner({ className = 'text-[20px]' }) {
  return <Icon name="progress_activity" className={`animate-spin ${className}`} />
}
