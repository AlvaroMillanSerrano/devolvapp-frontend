/** Etiquetas y colores de todos los estados que devuelve el backend. */
export const ESTADOS = {
  // Pedido / recogida (HU-03.03)
  PENDIENTE: { label: 'Pendiente', icon: 'schedule', cls: 'bg-amber-100 text-amber-900' },
  EN_CAMINO: { label: 'En camino', icon: 'two_wheeler', cls: 'bg-sky-100 text-sky-900' },
  COMPLETADA: { label: 'Completada', icon: 'check_circle', cls: 'bg-secondary-container/60 text-on-secondary-fixed-variant' },
  CANCELADA: { label: 'Cancelada', icon: 'cancel', cls: 'bg-surface-container-high text-on-surface-variant' },
  // Incidencia (HU-06.03)
  ABIERTA: { label: 'Abierta', icon: 'report', cls: 'bg-error-container text-on-error-container' },
  EN_REVISION: { label: 'En revisión', icon: 'manage_search', cls: 'bg-amber-100 text-amber-900' },
  RESUELTA: { label: 'Resuelta', icon: 'task_alt', cls: 'bg-secondary-container/60 text-on-secondary-fixed-variant' },
  // Movimientos / transferencias (HU-05.04, HU-07.03)
  COMPLETADO: { label: 'Abonado', icon: 'check_circle', cls: 'bg-secondary-container/60 text-on-secondary-fixed-variant' },
  FALLIDA: { label: 'Fallida', icon: 'error', cls: 'bg-error-container text-on-error-container' },
  // Solicitudes de cambio de zona
  APROBADA: { label: 'Aprobada', icon: 'check_circle', cls: 'bg-secondary-container/60 text-on-secondary-fixed-variant' },
  RECHAZADA: { label: 'Rechazada', icon: 'block', cls: 'bg-error-container text-on-error-container' },
  // Cuentas (HU-07.02)
  ACTIVA: { label: 'Activa', icon: 'check_circle', cls: 'bg-secondary-container/60 text-on-secondary-fixed-variant' },
  SUSPENDIDA: { label: 'Suspendida', icon: 'block', cls: 'bg-error-container text-on-error-container' },
  // Resultado de bolsa (HU-04.04)
  ACEPTADA: { label: 'Aceptada', icon: 'check', cls: 'bg-secondary-container/60 text-on-secondary-fixed-variant' },
  DISCREPANCIA: { label: 'No coincide', icon: 'rule', cls: 'bg-amber-100 text-amber-900' },
  NO_ENCONTRADA: { label: 'No encontrada', icon: 'search_off', cls: 'bg-error-container text-on-error-container' },
}

/** Textos para el estado de una transferencia (PENDIENTE/COMPLETADA significan otra cosa aquí). */
export const TRANSFERENCIA = {
  PENDIENTE: { label: 'Por aceptar' },
  COMPLETADA: { label: 'Pagada' },
}

export const estadoLabel = (estado) => ESTADOS[estado]?.label ?? estado
