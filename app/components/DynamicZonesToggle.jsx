import { useEffect, useState } from 'react'
import { env } from '../config/env'
import Icon from './ui/Icon'
import { reiniciarDatos } from '../mocks/db'

const STORAGE_KEY = 'devolvup.showDynamicZones'

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Botón flotante (solo si VITE_SHOW_DYNAMIC_ZONES=true) que activa <html data-show-dyn>.
 * Con él activo, todo elemento con `data-dyn="Zx · MÉTODO /endpoint"` se recuadra en naranja
 * y muestra su etiqueta: así se ve en pantalla qué bloques vienen del servidor.
 */
export default function DynamicZonesToggle() {
  const [on, setOn] = useState(read)

  useEffect(() => {
    if (on) document.documentElement.setAttribute('data-show-dyn', '')
    else document.documentElement.removeAttribute('data-show-dyn')
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
  }, [on])

  if (!env.showDynamicZones) return null

  return (
    <div className="fixed bottom-40 md:bottom-24 left-4 md:left-6 z-[70] flex flex-col items-start gap-2">
      {env.useMocks && (
        <span className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-amber-100 text-amber-900 font-label-sm text-label-sm shadow-sm">
          Modo mock · sin backend
          <button
            type="button"
            className="px-2 py-0.5 rounded-full hover:bg-amber-200 underline"
            title="Borra los cambios guardados en este navegador y vuelve a los datos de ejemplo"
            onClick={() => {
              if (!window.confirm('¿Volver a los datos de ejemplo? Se perderán los cambios hechos en modo mock.')) return
              reiniciarDatos()
              localStorage.removeItem('devolvup.session')
              sessionStorage.removeItem('devolvup.session')
              window.location.assign('/login')
            }}
          >
            Reiniciar datos
          </button>
        </span>
      )}
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-lg font-label-md text-label-md font-semibold transition-colors ${
          on ? 'bg-amber-600 text-white' : 'bg-inverse-surface text-inverse-on-surface hover:bg-on-surface'
        }`}
        title="Resalta los bloques que se cargan desde el servidor"
      >
        <Icon name={on ? 'visibility' : 'data_object'} className="text-[18px]" />
        Zonas dinámicas {on ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
