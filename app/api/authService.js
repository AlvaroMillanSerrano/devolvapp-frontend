import api from './client'
import { mockable, unwrap } from './mock'
import { getRefreshToken, loadSession } from '../auth/tokenStorage'
import { mockLogin, mockRegistro, mockValidarToken } from '../mocks/auth.mock'
import { perfilMock } from '../mocks/perfil.mock'

/**
 * EP-01 · Gestión de usuarios y autenticación (Spring Security + JWT).
 * Contrato detallado en docs/SPRING_SECURITY.md.
 */
export const authService = {
  /**
   * HU-01.02 · POST /api/auth/login
   * body: { username (email o DNI/NIE), password }
   * 200: { accessToken, refreshToken, tokenType, expiresIn, usuario: { id, nombre, apellidos, email, roles: ["ROLE_..."], ... } }
   * 401 BAD_CREDENTIALS · 403 ACCOUNT_SUSPENDED · 429 TOO_MANY_ATTEMPTS
   */
  login: mockable(
    (username, password) => api.post('/auth/login', { username, password }).then(unwrap),
    (username, password) => mockLogin(username, password),
    { delay: 600 },
  ),

  /** POST /api/auth/logout · invalida el refresh token en el servidor */
  logout: mockable(
    () => api.post('/auth/logout', { refreshToken: getRefreshToken() }).then(unwrap),
    () => null,
  ),

  /** GET /api/auth/me · datos frescos del usuario autenticado (roles incluidos) */
  me: mockable(
    () => api.get('/auth/me').then(unwrap),
    () => (loadSession() ? perfilMock.get() : null),
  ),

  /**
   * HU-01.01 · POST /api/auth/registro (crea SIEMPRE una cuenta con ROLE_CIUDADANO)
   * body: { nombre, apellidos, dni, telefono, email, password, direccion: { tipoVia, nombreVia, numero, piso, letra, codigoPostal, ciudad }, aceptaPrivacidad }
   * 201 · 400 VALIDATION_ERROR (fieldErrors) · 409 DUPLICATE_* (fieldErrors)
   */
  registro: mockable(
    (data) => api.post('/auth/registro', data).then(unwrap),
    (data) => mockRegistro(data),
    { delay: 700 },
  ),

  /**
   * HU-01.04 · POST /api/auth/password/recuperar   body: { email }
   * Responde 202 SIEMPRE (exista o no el correo) para no revelar cuentas registradas.
   */
  solicitarRecuperacion: mockable(
    (email) => api.post('/auth/password/recuperar', { email }).then(unwrap),
    () => null,
    { delay: 700 },
  ),

  /** HU-01.04 · GET /api/auth/password/token/{token} · 200 válido · 410 TOKEN_EXPIRED | TOKEN_USED */
  validarTokenRecuperacion: mockable(
    (token) => api.get(`/auth/password/token/${encodeURIComponent(token)}`).then(unwrap),
    (token) => mockValidarToken(token),
  ),

  /** HU-01.04 · POST /api/auth/password/restablecer   body: { token, password } · el token es de un solo uso */
  restablecerPassword: mockable(
    (token, password) => api.post('/auth/password/restablecer', { token, password }).then(unwrap),
    (token) => {
      mockValidarToken(token)
      return null
    },
    { delay: 700 },
  ),
}
