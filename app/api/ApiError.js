/**
 * Error normalizado de la API. Formato de error que se espera del backend
 * (p. ej. con un @RestControllerAdvice en Spring):
 *
 * {
 *   "status": 400,
 *   "code": "VALIDATION_ERROR",          // código estable para el front
 *   "message": "Datos no válidos",       // texto legible
 *   "fieldErrors": { "dni": "Formato de DNI/NIE no válido" }
 * }
 *
 * Códigos usados por el front: BAD_CREDENTIALS, ACCOUNT_SUSPENDED, TOO_MANY_ATTEMPTS,
 * DUPLICATE_EMAIL, DUPLICATE_PHONE, DUPLICATE_DNI, TOKEN_EXPIRED, TOKEN_USED,
 * VALIDATION_ERROR, INSUFFICIENT_BALANCE, INVALID_IBAN, SLOT_FULL, INVALID_STATE_TRANSITION,
 * INVALID_PIN, FORBIDDEN, NOT_FOUND, NETWORK_ERROR.
 */
export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Se ha producido un error inesperado', fieldErrors = {} } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

const DEFAULT_MESSAGES = {
  0: 'No se ha podido conectar con el servidor. Revisa tu conexión.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  403: 'No tienes permisos para realizar esta operación.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación entra en conflicto con el estado actual.',
  422: 'Los datos enviados no son válidos.',
  429: 'Demasiadas peticiones. Inténtalo de nuevo en unos minutos.',
  500: 'Error interno del servidor.',
}

/** Convierte un error de axios (o cualquier otro) en ApiError. */
export function toApiError(error) {
  if (error instanceof ApiError) return error
  if (error?.response) {
    const { status, data } = error.response
    return new ApiError({
      status,
      code: data?.code ?? (status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : `HTTP_${status}`),
      message: data?.message ?? DEFAULT_MESSAGES[status] ?? DEFAULT_MESSAGES[500],
      fieldErrors: data?.fieldErrors ?? data?.errors ?? {},
    })
  }
  return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: DEFAULT_MESSAGES[0] })
}
