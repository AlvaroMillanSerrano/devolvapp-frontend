import { createContext, useContext } from 'react'

export const ToastContext = createContext(() => {})

/**
 * const toast = useToast()
 * toast('Solicitud registrada', { icon: 'check_circle' })
 * toast('No se pudo guardar', { variant: 'error' })
 */
export const useToast = () => useContext(ToastContext)
