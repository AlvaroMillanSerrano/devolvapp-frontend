import { Component } from 'react'
import Icon from './ui/Icon'

/**
 * Si una vista falla al pintarse, muestra un aviso con opción de reintentar
 * en lugar de dejar toda la pantalla en blanco. Úsalo con `key={ruta}` para que se reinicie al navegar.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error al pintar la vista', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="card flex flex-col items-center text-center gap-3 py-10 mt-4">
        <Icon name="sentiment_dissatisfied" className="text-[40px] text-error" />
        <h2 className="text-lg font-bold">Algo ha fallado en esta pantalla</h2>
        <p className="text-sm text-on-surface-variant max-w-md">Puedes volver a intentarlo. Si sigue pasando, avisa a soporte.</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
        </div>
      </div>
    )
  }
}
