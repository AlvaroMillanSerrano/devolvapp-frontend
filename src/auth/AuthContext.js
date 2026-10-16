import { createContext } from 'react'

/**
 * Valor expuesto por <AuthProvider>:
 * {
 *   user, roles: ['CIUDADANO', ...], activeRole, isAuthenticated,
 *   hasRole(role), login({ username, password, remember }), logout(),
 *   selectRole(role), refreshUser(), updateUser(patch)
 * }
 */
export const AuthContext = createContext(null)
