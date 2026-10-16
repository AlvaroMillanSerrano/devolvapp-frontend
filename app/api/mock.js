import { env } from '../config/env'
import { ApiError } from './ApiError'
import { guardarEstado } from '../mocks/db'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Envuelve una llamada real a la API con su equivalente simulado.
 *
 *   getResumen: mockable(
 *     () => api.get('/ciudadano/resumen').then(unwrap),   // ← petición real (Spring)
 *     () => mocks.resumen,                                 // ← respuesta simulada
 *   )
 *
 * Con VITE_USE_MOCKS=true se ejecuta la función simulada (con un pequeño retardo para
 * que se vean los estados de carga). Con false, la real.
 * La función simulada puede lanzar `mockError(...)` para simular respuestas de error.
 */
export function mockable(real, simulated, { delay = 350 } = {}) {
  return async (...args) => {
    if (!env.useMocks) return real(...args)
    await wait(delay)
    let result
    try {
      result = await simulated(...args)
    } finally {
      guardarEstado() // los cambios del modo mock sobreviven a una recarga
    }
    // structuredClone evita que los componentes muten los datos simulados compartidos
    return result === undefined ? result : structuredClone(result)
  }
}

export const mockError = (status, code, message, fieldErrors) => new ApiError({ status, code, message, fieldErrors })

/** Extrae `data` de la respuesta de axios. */
export const unwrap = (response) => response.data

/** Simula una respuesta paginada al estilo Spring Data (Page<T>). */
export function mockPage(items, { page = 0, size = 10 } = {}) {
  const start = page * size
  return {
    content: items.slice(start, start + size),
    totalElements: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    number: page,
    size,
  }
}
