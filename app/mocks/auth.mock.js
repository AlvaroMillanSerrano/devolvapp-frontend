import { mockError } from '../api/mock'
import { DEMO_PASSWORD, passwordDe, usuarios, zonaDeCp, zonaPorId, zonas } from './db'

/**
 * Cuentas de DEMOSTRACIÓN (solo modo mock). Contraseña común: demo1234
 * Sirven para probar el login multirol sin backend.
 */
export { DEMO_PASSWORD }
export const DEMO_USERS = usuarios.filter((u) => u.demo)

/** Forma del usuario que devuelven POST /api/auth/login, GET /api/auth/me y GET/PUT /api/perfil */
export function sessionUser(u) {
  const zona = u.direccion ? zonaDeCp(u.direccion.codigoPostal) : null
  const preferida = u.roles.includes('RECOLECTOR') ? zonaPorId(u.zonaPreferidaId) : null
  return {
    id: u.id,
    nombre: u.nombre,
    apellidos: u.apellidos,
    email: u.email,
    telefono: u.telefono,
    dni: u.dni,
    roles: u.roles.map((r) => `ROLE_${r}`),
    direccion: u.direccion ?? null,
    zona: zona ? { id: zona.id, nombre: zona.nombre } : null,
    // Recolector: zona preferida (null = primer inicio de sesión, debe elegirla)
    zonaPreferida: preferida ? { id: preferida.id, nombre: preferida.nombre } : null,
    // Cuenta creada por administración con contraseña provisional: debe cambiarla al entrar
    debeCambiarPassword: Boolean(u.debeCambiarPassword),
    zonasRecogida: zonas.filter((z) => Object.values(z.asignaciones).includes(u.id)).map((z) => ({ id: z.id, nombre: z.nombre })),
  }
}

const fakeJwt = (sub) => `mock.${btoa(JSON.stringify({ sub, exp: Date.now() / 1000 + 900 }))}.signature`

export function mockLogin(username, password) {
  const key = String(username).trim().toLowerCase()
  const found = usuarios.find((u) => u.email === key || u.dni.toLowerCase() === key)
  // HU-01.02: mensaje genérico, sin revelar si el usuario existe
  if (!found || password !== passwordDe(found)) {
    throw mockError(401, 'BAD_CREDENTIALS', 'Credenciales incorrectas.')
  }
  // HU-07.02: cuenta suspendida -> no puede iniciar sesión
  if (found.estado === 'SUSPENDIDA') {
    throw mockError(403, 'ACCOUNT_SUSPENDED', 'Tu cuenta está suspendida. Contacta con soporte.')
  }
  return {
    accessToken: fakeJwt(found.id),
    refreshToken: fakeJwt(`refresh-${found.id}`),
    tokenType: 'Bearer',
    expiresIn: 900,
    usuario: sessionUser(found),
  }
}

export function mockRegistro(data) {
  const fieldErrors = {}
  if (usuarios.some((u) => u.email === String(data.email).toLowerCase())) fieldErrors.email = 'Este correo ya está registrado'
  if (usuarios.some((u) => u.telefono === String(data.telefono).replace(/\D/g, '').slice(-9))) fieldErrors.telefono = 'Este teléfono ya está registrado'
  if (usuarios.some((u) => u.dni === String(data.dni).toUpperCase())) fieldErrors.dni = 'Este DNI/NIE ya está registrado'
  if (Object.keys(fieldErrors).length) {
    throw mockError(409, 'DUPLICATE_ACCOUNT', 'Ya existe una cuenta con esos datos.', fieldErrors)
  }
  return { id: 1000, email: data.email, roles: ['ROLE_CIUDADANO'] }
}

export function mockValidarToken(token) {
  if (token === 'expirado') throw mockError(410, 'TOKEN_EXPIRED', 'El enlace de recuperación ha caducado.')
  if (token === 'usado') throw mockError(410, 'TOKEN_USED', 'Este enlace ya se ha utilizado.')
  if (!token) throw mockError(400, 'TOKEN_INVALID', 'Enlace no válido.')
  return { valido: true, email: 'ciu***@devolvup.es', expiraEn: new Date(Date.now() + 30 * 60000).toISOString() }
}
