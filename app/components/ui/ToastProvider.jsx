import { useCallback, useRef, useState } from 'react'
import { ToastContext } from './toastContext'
import Icon from './Icon'

/** Notificaciones tipo "toast" */
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const toast = useCallback((message, { icon, variant = 'info', duration = 3500 } = {}) => {
    const id = ++seq.current
    setToasts((list) => [...list, { id, message, icon: icon ?? (variant === 'error' ? 'error' : 'check_circle'), variant }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-[70] flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg max-w-sm ${
              t.variant === 'error' ? 'bg-error-container text-on-error-container' : 'bg-inverse-surface text-inverse-on-surface'
            }`}
          >
            <Icon name={t.icon} className={`text-[20px] ${t.variant === 'error' ? '' : 'text-secondary-fixed'}`} />
            <span className="font-label-md text-label-md font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
