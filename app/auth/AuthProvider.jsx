import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { clearSession, getLastRole, loadSession, saveSession, setLastRole, updateSession } from './tokenStorage'
import { authService } from '../api/authService'
import { setSessionExpiredHandler } from '../api/client'
import { normalizeRoles, ROLE_PRIORITY } from '../config/roles'

/**
 * Sesión multirol.
 *
 * Un usuario puede tener varios roles (authorities de Spring Security). El front trabaja
 * con un "rol activo" que decide qué layout/menú se muestra:
 *   - 1 rol              -> se activa automáticamente.
 *   - varios roles       -> se reutiliza el último usado; si no hay, pantalla /seleccionar-perfil.
 *   - en cualquier momento se puede cambiar desde el selector de perfil de la cabecera.
 *
 * IMPORTANTE (HU-01.03): el rol activo es solo una decisión de interfaz. La autorización real
 * la hace Spring Security con TODAS las authorities del token en cada endpoint.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession())

  const roles = useMemo(() => normalizeRoles(session?.usuario?.roles), [session])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      /* el logout local se hace igualmente */
    }
    clearSession()
    setSession(null)
  }, [])

  // Si el refresh token ya no sirve, el cliente HTTP nos avisa para cerrar la sesión.
  useEffect(() => {
    setSessionExpiredHandler(() => setSession(null))
  }, [])

  const login = useCallback(async ({ username, password, remember }) => {
    const res = await authService.login(username, password)
    const userRoles = normalizeRoles(res.usuario.roles)
    const last = getLastRole(res.usuario.id)
    const activeRole = userRoles.length === 1 ? userRoles[0] : userRoles.includes(last) ? last : null
    const next = saveSession(
      { accessToken: res.accessToken, refreshToken: res.refreshToken, usuario: res.usuario, activeRole },
      remember,
    )
    setSession(next)
    return { roles: userRoles, activeRole }
  }, [])

  const selectRole = useCallback(
    (role) => {
      if (!roles.includes(role)) return
      setLastRole(session.usuario.id, role)
      setSession(updateSession({ activeRole: role }))
    },
    [roles, session],
  )

  const updateUser = useCallback((patch) => {
    const current = loadSession()
    if (!current) return
    setSession(updateSession({ usuario: { ...current.usuario, ...patch } }))
  }, [])

  /** Vuelve a pedir GET /auth/me (p. ej. tras cambiar roles o dirección). */
  const refreshUser = useCallback(async () => {
    const usuario = await authService.me()
    if (usuario) updateUser(usuario)
  }, [updateUser])

  const value = useMemo(() => {
    const activeRole = session?.activeRole && roles.includes(session.activeRole) ? session.activeRole : null
    return {
      user: session?.usuario ?? null,
      roles,
      activeRole,
      defaultRole: ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      hasRole: (role) => roles.includes(role),
      login,
      logout,
      selectRole,
      updateUser,
      refreshUser,
    }
  }, [session, roles, login, logout, selectRole, updateUser, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
