import api from './client'
import { mockable, unwrap } from './mock'
import { perfilMock as m } from '../mocks/perfil.mock'

/** Datos del usuario autenticado, para cualquier rol. */
export const perfilService = {
  /** GET /api/perfil · mismo formato que el usuario del login (incluye direccion con tipoVia, nombreVia, numero, piso, letra, codigoPostal, ciudad) */
  get: mockable(() => api.get('/perfil').then(unwrap), () => m.get()),

  /**
   * PUT /api/perfil · body: { nombre, apellidos, email, telefono, direccion? (solo ciudadano) }
   * El backend geocodifica la dirección (lat, lng). Los pedidos ya programados mantienen la dirección anterior.
   * 200 → usuario + { avisoZona } · 400 VALIDATION_ERROR (fieldErrors "direccion.codigoPostal") · 409 email/teléfono duplicado
   */
  actualizar: mockable((data) => api.put('/perfil', data).then(unwrap), (data) => m.actualizar(data), { delay: 600 }),

  /** PUT /api/perfil/password · body: { actual, nueva } · 400 si la actual no es correcta */
  cambiarPassword: mockable((data) => api.put('/perfil/password', data).then(unwrap), (data) => m.cambiarPassword(data), { delay: 600 }),

  /**
   * PUT /api/perfil/password-inicial · body: { nueva }
   * Solo si usuario.debeCambiarPassword (cuenta creada por administración con contraseña provisional).
   * 200 → usuario con debeCambiarPassword=false · 409 NO_PERMITIDO si ya la cambió
   */
  crearPasswordInicial: mockable((nueva) => api.put('/perfil/password-inicial', { nueva }).then(unwrap), (nueva) => m.crearPasswordInicial({ nueva }), { delay: 600 }),
}
