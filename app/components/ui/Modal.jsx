import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

/**
 * Modal: hoja inferior en móvil y ventana centrada en escritorio.
 * Con `title` pinta la cabecera con botón de cerrar.
 */
export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  title,
  backdropClassName = 'bg-inverse-surface/40 backdrop-blur-sm',
  panelClassName = 'bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-5 shadow-xl max-h-[92vh] overflow-y-auto',
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 ${backdropClassName}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={title} className={panelClassName}>
        {title && (
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
