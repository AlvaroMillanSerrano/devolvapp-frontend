/**
 * Persistencia de la sesión en el navegador.
 *  - "Mantener sesión iniciada" -> localStorage (sobrevive al cierre del navegador)
 *  - En otro caso                -> sessionStorage (se pierde al cerrar la pestaña)
 *
 * Alternativa más segura si el backend lo soporta: refresh token en cookie httpOnly
 * (SameSite=Strict) y access token solo en memoria. Ver docs/SPRING_SECURITY.md.
 */
const KEY = 'devolvup.session'
const LAST_ROLE_KEY = 'devolvup.lastRole'

const safe = (fn, fallback = null) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

let memory = null

export function loadSession() {
  if (memory) return memory
  const raw = safe(() => localStorage.getItem(KEY)) ?? safe(() => sessionStorage.getItem(KEY))
  memory = raw ? safe(() => JSON.parse(raw)) : null
  return memory
}

export function saveSession(session, remember = loadSession()?.remember ?? false) {
  memory = { ...session, remember }
  const target = remember ? localStorage : sessionStorage
  const other = remember ? sessionStorage : localStorage
  safe(() => target.setItem(KEY, JSON.stringify(memory)))
  safe(() => other.removeItem(KEY))
  return memory
}

export function updateSession(patch) {
  const current = loadSession()
  if (!current) return null
  return saveSession({ ...current, ...patch }, current.remember)
}

export function clearSession() {
  memory = null
  safe(() => localStorage.removeItem(KEY))
  safe(() => sessionStorage.removeItem(KEY))
}

export const getAccessToken = () => loadSession()?.accessToken ?? null
export const getRefreshToken = () => loadSession()?.refreshToken ?? null

/** Último rol usado por cada usuario (para preseleccionarlo en usuarios multirol). */
export const getLastRole = (userId) => safe(() => JSON.parse(localStorage.getItem(LAST_ROLE_KEY) || '{}')[userId])
export const setLastRole = (userId, role) =>
  safe(() => {
    const map = JSON.parse(localStorage.getItem(LAST_ROLE_KEY) || '{}')
    map[userId] = role
    localStorage.setItem(LAST_ROLE_KEY, JSON.stringify(map))
  })
