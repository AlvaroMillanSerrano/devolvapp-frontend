import axios from 'axios'
import { env } from '../config/env'
import { clearSession, getAccessToken, getRefreshToken, updateSession } from '../auth/tokenStorage'
import { toApiError } from './ApiError'

/**
 * Cliente HTTP único de la aplicación.
 *  - Añade `Authorization: Bearer <accessToken>` (JWT emitido por Spring Security).
 *  - Si una petición devuelve 401, intenta UNA vez renovar el token con el refresh token
 *    (POST /auth/refresh) y repite la petición original.
 *  - Normaliza todos los errores a ApiError.
 */
const api = axios.create({
  baseURL: env.apiUrl,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 20000,
})

let onSessionExpired = () => {}
/** El AuthProvider registra aquí qué hacer cuando la sesión ya no se puede renovar. */
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise = null
async function refreshTokens() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('Sin refresh token')
  // Petición "en crudo" para que no pase por los interceptores
  const { data } = await axios.post(`${env.apiUrl}/auth/refresh`, { refreshToken })
  updateSession({ accessToken: data.accessToken, refreshToken: data.refreshToken ?? refreshToken })
  return data.accessToken
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthCall = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true
      try {
        refreshPromise ??= refreshTokens().finally(() => {
          refreshPromise = null
        })
        await refreshPromise
        return api(original)
      } catch {
        clearSession()
        onSessionExpired()
      }
    }
    return Promise.reject(toApiError(error))
  },
)

/** Descarga un fichero (PDF, CSV, XML…) devuelto por el backend como blob. */
export async function downloadFile(url, fallbackName, params) {
  const response = await api.get(url, { params, responseType: 'blob' })
  const disposition = response.headers['content-disposition'] ?? ''
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName
  const href = URL.createObjectURL(response.data)
  const a = Object.assign(document.createElement('a'), { href, download: name })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

export default api
