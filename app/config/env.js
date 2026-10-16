const flag = (value, fallback) => (value === undefined ? fallback : String(value).toLowerCase() === 'true')

export const env = {
  /** Base de la API REST de Spring Boot (p. ej. "/api" con proxy o "https://api.devolvup.es/api"). */
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  /** Si es true, los servicios responden con los datos de src/mocks y no llaman al servidor. */
  useMocks: flag(import.meta.env.VITE_USE_MOCKS, false),
  /** Muestra el conmutador que resalta las zonas dinámicas (solo útil en desarrollo). */
  showDynamicZones: flag(import.meta.env.VITE_SHOW_DYNAMIC_ZONES, import.meta.env.DEV),
}
