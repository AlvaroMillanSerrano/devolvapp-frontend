import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { homeForRole } from '../config/roles'

/**
 * Guarda de rutas (HU-01.03).
 *
 *   <Route element={<RequireAuth roles={[ROLES.ADMIN]} />}> ...rutas de admin... </Route>
 *
 * - Sin sesión                       -> /login (recordando a dónde quería ir)
 * - Multirol sin rol activo          -> /seleccionar-perfil
 * - Tiene el rol pero no está activo -> se cambia el rol activo automáticamente
 * - No tiene el rol                  -> /403
 *
 * Esto solo protege la NAVEGACIÓN. Cada endpoint debe estar protegido en Spring Security.
 */
export function RequireAuth({ roles: allowed, children }) {
  const { isAuthenticated, activeRole, roles, selectRole } = useAuth()
  const location = useLocation()

  const required = allowed?.length ? allowed : null
  const roleToActivate =
    isAuthenticated && required && !required.includes(activeRole) ? required.find((r) => roles.includes(r)) : null

  useEffect(() => {
    if (roleToActivate) selectRole(roleToActivate)
  }, [roleToActivate, selectRole])

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (required && !required.includes(activeRole)) {
    if (roleToActivate) return null // el efecto activa el rol y se vuelve a renderizar
    if (!activeRole && roles.length > 1) return <Navigate to="/seleccionar-perfil" replace state={{ from: location }} />
    return <Navigate to="/403" replace />
  }
  if (!activeRole && roles.length > 1) return <Navigate to="/seleccionar-perfil" replace state={{ from: location }} />
  return children ?? <Outlet />
}

/** Para /login, /registro…: si ya hay sesión, manda a la home del rol activo. */
export function GuestOnly({ children }) {
  const { isAuthenticated, activeRole, roles } = useAuth()
  if (isAuthenticated && activeRole) return <Navigate to={homeForRole(activeRole)} replace />
  if (isAuthenticated && roles.length > 1) return <Navigate to="/seleccionar-perfil" replace />
  return children ?? <Outlet />
}

/** Ruta "/" -> home del rol activo (o login). */
export function RoleHomeRedirect() {
  const { isAuthenticated, activeRole, roles } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!activeRole && roles.length > 1) return <Navigate to="/seleccionar-perfil" replace />
  return <Navigate to={homeForRole(activeRole ?? roles[0])} replace />
}
