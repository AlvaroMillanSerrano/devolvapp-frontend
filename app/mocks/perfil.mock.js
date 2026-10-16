import { mockError } from '../api/mock'
import { loadSession } from '../auth/tokenStorage'
import { sessionUser } from './auth.mock'
import { conGeo, passwordDe, usuarioPorId, usuarios, validarDireccionServidor, zonaDeCp } from './db'

const yo = () => usuarioPorId(loadSession()?.usuario?.id)

/** Perfil del usuario autenticado (cualquier rol) */
export const perfilMock = {
  get: () => sessionUser(yo()),

  actualizar({ nombre, apellidos, email, telefono, direccion }) {
    const u = yo()
    const fe = {}
    if (!nombre?.trim()) fe.nombre = 'Obligatorio'
    if (!apellidos?.trim()) fe.apellidos = 'Obligatorio'
    const mail = String(email ?? '').trim().toLowerCase()
    if (usuarios.some((x) => x.id !== u.id && x.email === mail)) fe.email = 'Este correo ya está registrado'
    const tel = String(telefono ?? '').replace(/\D/g, '').slice(-9)
    if (usuarios.some((x) => x.id !== u.id && x.telefono === tel)) fe.telefono = 'Este teléfono ya está registrado'
    if (u.roles.includes('CIUDADANO')) validarDireccionServidor(direccion, fe)
    if (Object.keys(fe).length) throw mockError(400, 'VALIDATION_ERROR', 'Revisa los campos marcados.', fe)
    Object.assign(u, { nombre: nombre.trim(), apellidos: apellidos.trim(), email: mail, telefono: tel })
    // La dirección nueva se geocodifica; los pedidos ya programados conservan la anterior
    if (u.roles.includes('CIUDADANO') && direccion) u.direccion = conGeo(Object.fromEntries(Object.entries(direccion).map(([k, v]) => [k, String(v ?? '').trim()])))
    const res = sessionUser(u)
    return { ...res, avisoZona: u.direccion && !zonaDeCp(u.direccion.codigoPostal) ? 'Todavía no damos servicio en ese código postal.' : null }
  },

  cambiarPassword({ actual, nueva }) {
    const u = yo()
    if (actual !== passwordDe(u)) throw mockError(400, 'VALIDATION_ERROR', 'La contraseña actual no es correcta.', { actual: 'No es correcta' })
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(nueva ?? '')) throw mockError(400, 'VALIDATION_ERROR', 'La nueva contraseña no es válida.', { nueva: 'Mínimo 8 caracteres, con letras y números' })
    u.password = nueva
    u.debeCambiarPassword = false
    return null
  },

  /** Primer inicio de sesión con contraseña provisional: se fija la definitiva sin pedir la actual */
  crearPasswordInicial({ nueva }) {
    const u = yo()
    if (!u.debeCambiarPassword) throw mockError(409, 'NO_PERMITIDO', 'Tu contraseña ya está creada. Cámbiala desde tu perfil.')
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(nueva ?? '')) throw mockError(400, 'VALIDATION_ERROR', 'La contraseña no es válida.', { nueva: 'Mínimo 8 caracteres, con letras y números' })
    u.password = nueva
    u.debeCambiarPassword = false
    return sessionUser(u)
  },
}
