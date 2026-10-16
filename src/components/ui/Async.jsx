import Icon from './Icon'

export function Skeleton({ className = 'h-32' }) {
  return <div className={`animate-pulse rounded-xl bg-surface-container-high/60 ${className}`} />
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div
      role="alert"
      className={`rounded-xl bg-error-container/40 p-space-md flex items-center justify-between gap-space-sm text-on-error-container ${className}`}
    >
      <div className="flex items-center gap-space-xs">
        <Icon name="cloud_off" className="text-[20px]" />
        <span className="font-body-sm text-body-sm">{error?.message ?? 'No se han podido cargar los datos.'}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-space-sm py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = 'inbox', title, children, className = '' }) {
  return (
    <div className={`rounded-xl bg-surface-container-low p-space-lg flex flex-col items-center text-center gap-space-xs ${className}`}>
      <Icon name={icon} className="text-[32px] text-tertiary" />
      {title && <span className="font-title-md text-title-md text-on-surface">{title}</span>}
      {children && <div className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{children}</div>}
    </div>
  )
}

/**
 * Renderiza una zona dinámica según el estado devuelto por useApi:
 * esqueleto mientras carga, error con reintento, o `children(data)`.
 * No añade nodos al DOM.
 */
export default function Async({ state, fallback, children, errorClassName, empty }) {
  if (state.loading && state.data === undefined) return fallback ?? <Skeleton />
  if (state.error && state.data === undefined)
    return <ErrorState error={state.error} onRetry={state.reload} className={errorClassName} />
  if ((state.data === null || state.data === undefined) && empty) return empty
  return children(state.data)
}
