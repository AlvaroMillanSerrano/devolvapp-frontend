import api from './client'
import { mockable, unwrap } from './mock'
import { adminMock as m } from '../mocks/admin.mock'

/** Rol ADMIN (EP-06, EP-07, HU-05.04). */
export const adminService = {
  /**
   * GET /api/admin/pendientes · bandeja de tareas de administración
   * { transferencias: { total, importe }, solicitudesZona, incidenciasAbiertas, recogidasAtrasadas, recogidasSinRecolector,
   * diasSinRecolector: [{ zona: { id, nombre }, diaSemana }] }
   */
  getPendientes: mockable(() => api.get('/admin/pendientes').then(unwrap), () => m.pendientes()),

  /**
   * HU-07.04 / HU-07.05 · GET /api/admin/indicadores?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
   * { recogidas: { solicitadas, completadas, canceladas, enCurso }, incidencias: { registradas, abiertas },
   * economia: { envasesValidos, importeTotal, parteEmpresa, parteCiudadanos },
   * impacto: { co2EvitadoKg, envasesReciclados, porTipo, porMes, totalHistoricoKg }, porZona: [{ zona, co2Kg }] }
   */
  getIndicadores: mockable((params) => api.get('/admin/indicadores', { params }).then(unwrap), (params) => m.indicadores(params)),

  /**
   * HU-06.02 · GET /api/admin/incidencias?tipo=&estado=&page=&size=
   * Page<{ id, codigo, tipo, tipoNombre, estado: ABIERTA|EN_REVISION|RESUELTA, creadaEn, pedido: { id, codigo } }>
   */
  getIncidencias: mockable((params) => api.get('/admin/incidencias', { params }).then(unwrap), (params) => m.incidencias(params)),

  /**
   * HU-06.02 / HU-04.04 · GET /api/admin/incidencias/{id}
   * Añade { descripcion, bolsaId, resolucion, resueltaEn, historial: [{ fecha, autor, accion }],
   * recogida: { id, codigo, estado, fecha, horaInicio, horaFin, direccion, ciudadano, recolector, bolsas, liquidacion } }
   */
  getIncidencia: mockable((id) => api.get(`/admin/incidencias/${id}`).then(unwrap), (id) => m.incidencia(id)),

  /** HU-06.03 · PATCH /api/admin/incidencias/{id} · body: { estado?, resolucion? } (guarda autor y fecha en el historial) */
  actualizarIncidencia: mockable(
    (id, data) => api.patch(`/admin/incidencias/${id}`, data).then(unwrap),
    (id, data) => m.actualizarIncidencia(id, data),
  ),

  /**
   * HU-04.04 · GET /api/admin/recogidas?fecha=&estado=&zonaId=&q=&page=
   * estado: PENDIENTE | EN_CAMINO | COMPLETADA | CANCELADA | ATRASADAS (días pasados sin cerrar) | SIN_RECOLECTOR
   * Page<{ id, codigo, estado, fecha, horaInicio, horaFin, zona, direccion, ciudadano, recolector: { id, nombre } | null, numBolsas, totalEnvases, tieneIncidencias }>
   */
  getRecogidas: mockable((params) => api.get('/admin/recogidas', { params }).then(unwrap), (params) => m.recogidas(params)),

  /** HU-04.04 · GET /api/admin/recogidas/{id} · añade { creadoEn, iniciadoEn, completadoEn, canceladoEn, bolsas (con resultado), liquidacion, incidencias } */
  getRecogida: mockable((id) => api.get(`/admin/recogidas/${id}`).then(unwrap), (id) => m.recogida(id)),

  /** HU-07.06 · PUT /api/admin/recogidas/{id}/recolector · body: { recolectorId } · solo recogidas sin cerrar */
  reasignarRecogida: mockable(
    (id, recolectorId) => api.put(`/admin/recogidas/${id}/recolector`, { recolectorId }).then(unwrap),
    (id, recolectorId) => m.reasignarRecogida(id, recolectorId),
  ),

  /** HU-03.03 · POST /api/admin/recogidas/{id}/cancelar · cancelación autorizada (p. ej. ciudadano ausente) */
  cancelarRecogida: mockable((id) => api.post(`/admin/recogidas/${id}/cancelar`).then(unwrap), (id) => m.cancelarRecogida(id)),

  /**
   * HU-07.03 · GET /api/admin/transferencias?estado=&page=&size=
   * Page<{ id, codigo, ciudadano, importe, estado: PENDIENTE|COMPLETADA|FALLIDA, solicitadaEn }> + totales: { PENDIENTE, COMPLETADA, FALLIDA }
   */
  getTransferencias: mockable(
    (params) => api.get('/admin/transferencias', { params }).then(unwrap),
    (params) => m.transferencias(params),
  ),

  /** HU-07.03 · GET /api/admin/transferencias/{id} · añade { iban, procesadaEn, referenciaBancaria, motivoFallo, historial: [{ fecha, estado }] } */
  getTransferencia: mockable((id) => api.get(`/admin/transferencias/${id}`).then(unwrap), (id) => m.transferencia(id)),

  /**
   * HU-05.04 · POST /api/admin/transferencias/{id}/resultado
   * body: { estado: COMPLETADA } (aceptar: el servidor ordena el pago y genera referenciaBancaria "TRF-AAAAMMDD-000123")
   * | { estado: FALLIDA, motivoFallo } (rechazar: el importe vuelve al monedero)
   * 409 YA_PROCESADA (evita pagar dos veces)
   */
  registrarResultadoTransferencia: mockable(
    (id, data) => api.post(`/admin/transferencias/${id}/resultado`, data).then(unwrap),
    (id, data) => m.marcarTransferencia(id, data),
  ),

  /** HU-05.04 · POST /api/admin/transferencias/pagar-lote · body: { ids: [] } → { procesadas, remesa } · referencias generadas por el servidor (409 si alguna ya está procesada) */
  pagarTransferencias: mockable((data) => api.post('/admin/transferencias/pagar-lote', data).then(unwrap), (data) => m.pagarLote(data), { delay: 700 }),

  /** HU-07.06 · GET /api/admin/codigos-postales · CP de Málaga con la zona a la que pertenecen [{ cp, barrio, zona: { id, nombre } | null }] */
  getCodigosPostales: mockable(() => api.get('/admin/codigos-postales').then(unwrap), () => m.codigosPostales()),

  /**
   * HU-07.01 / HU-07.06 · GET /api/admin/zonas
   * [{ id, nombre, codigosPostales, pendientes, dias: [{ diaSemana (1=lunes), recolector: { id, nombre } | null, franjas: [{ id, horaInicio, horaFin, capacidad }] }] }]
   */
  getZonas: mockable(() => api.get('/admin/zonas').then(unwrap), () => m.zonas()),

  /** HU-07.06 · GET /api/admin/recolectores · activos [{ id, nombre, zonaPreferida, diasOcupados: [{ diaSemana, zona, zonaId }] }] */
  getRecolectores: mockable(() => api.get('/admin/recolectores').then(unwrap), () => m.recolectores()),

  /** HU-07.06 · POST /api/admin/zonas · body: { nombre, codigosPostales: ['29001'] } */
  crearZona: mockable((data) => api.post('/admin/zonas', data).then(unwrap), (data) => m.crearZona(data)),

  /** HU-07.06 · PUT /api/admin/zonas/{id} · body: { nombre, codigosPostales } · un CP solo puede estar en una zona */
  editarZona: mockable((id, data) => api.put(`/admin/zonas/${id}`, data).then(unwrap), (id, data) => m.editarZona(id, data)),

  /** HU-07.06 · DELETE /api/admin/zonas/{id} · 409 ZONA_CON_RECOGIDAS si tiene recogidas sin cerrar */
  borrarZona: mockable((id) => api.delete(`/admin/zonas/${id}`).then(unwrap), (id) => m.borrarZona(id)),

  /**
   * HU-07.06 · PUT /api/admin/zonas/{id}/dias/{diaSemana}/recolector · body: { recolectorId | null }
   * Asigna el recolector de la zona ese día de la semana. Las recogidas pendientes de ese día pasan a él.
   * 409 RECOLECTOR_OCUPADO si ya recoge ese día en otra zona
   */
  asignarDia: mockable(
    (zonaId, dia, recolectorId) => api.put(`/admin/zonas/${zonaId}/dias/${dia}/recolector`, { recolectorId }).then(unwrap),
    (zonaId, dia, recolectorId) => m.asignarDia(zonaId, dia, recolectorId),
  ),

  /**
   * HU-07.06 · GET /api/admin/solicitudes-zona?estado= · peticiones de cambio de zona de los recolectores
   * [{ id, estado, creadaEn, motivo, recolector: { id, nombre }, zonaActual, zonaSolicitada, resueltaEn, resueltaPor, respuesta }]
   */
  getSolicitudesZona: mockable((params) => api.get('/admin/solicitudes-zona', { params }).then(unwrap), (params) => m.solicitudesZona(params)),

  /**
   * HU-07.06 · POST /api/admin/solicitudes-zona/{id}/resolver · body: { aprobar, moverDias, respuesta }
   * Aprobar cambia la zona preferida y (moverDias) pasa sus días a la zona nueva si están libres → { solicitud, diasEnConflicto: [diaSemana] }
   */
  resolverSolicitudZona: mockable(
    (id, data) => api.post(`/admin/solicitudes-zona/${id}/resolver`, data).then(unwrap),
    (id, data) => m.resolverSolicitud(id, data),
  ),

  /** HU-07.01 · POST /api/admin/zonas/{id}/franjas · body: { diaSemana, horaInicio, horaFin, capacidad } */
  crearFranja: mockable(
    (zonaId, data) => api.post(`/admin/zonas/${zonaId}/franjas`, data).then(unwrap),
    (zonaId, data) => m.crearFranja(zonaId, data),
  ),

  /** HU-07.01 · PUT /api/admin/franjas/{id} · las recogidas ya confirmadas no cambian */
  editarFranja: mockable((id, data) => api.put(`/admin/franjas/${id}`, data).then(unwrap), (id, data) => m.editarFranja(id, data)),

  /** HU-07.01 · DELETE /api/admin/franjas/{id} · las recogidas ya confirmadas no se cancelan */
  borrarFranja: mockable((id) => api.delete(`/admin/franjas/${id}`).then(unwrap), (id) => m.borrarFranja(id)),

  /**
   * HU-07.02 · GET /api/admin/usuarios?q=&rol=&page=&size=
   * Page<{ id, nombre, email, roles: ['CIUDADANO'|'RECOLECTOR'|'ADMIN'], estado: ACTIVA|SUSPENDIDA }>
   */
  getUsuarios: mockable((params) => api.get('/admin/usuarios', { params }).then(unwrap), (params) => m.usuarios(params)),

  /** HU-07.02 · GET /api/admin/usuarios/{id} · añade { nombrePila, apellidos, dni, telefono, direccion, zona, altaEn, pedidos, zonaPreferida, zonasAsignadas, co2EvitadoKg } */
  getUsuario: mockable((id) => api.get(`/admin/usuarios/${id}`).then(unwrap), (id) => m.usuario(id)),

  /** HU-07.02 · PUT /api/admin/usuarios/{id} · body: { nombre, apellidos, email, telefono, direccion? } (mantener actualizada la información) */
  editarUsuario: mockable((id, data) => api.put(`/admin/usuarios/${id}`, data).then(unwrap), (id, data) => m.editarUsuario(id, data)),

  /** HU-01.03 · PUT /api/admin/usuarios/{id}/roles · body: { roles: ['CIUDADANO'|'RECOLECTOR'|'ADMIN'] } · reemplaza todos los roles y protege al último ADMIN activo */
  actualizarRoles: mockable(
    (id, roles) => api.put(`/admin/usuarios/${id}/roles`, { roles }).then(unwrap),
    (id, roles) => m.actualizarRoles(id, roles),
  ),

  /** HU-07.02 · POST /api/admin/usuarios/{id}/suspender · la cuenta no podrá iniciar sesión (403 ACCOUNT_SUSPENDED) */
  suspenderUsuario: mockable(
    (id) => api.post(`/admin/usuarios/${id}/suspender`).then(unwrap),
    (id) => m.cambiarEstadoUsuario(id, 'SUSPENDIDA'),
  ),

  /** HU-07.02 · POST /api/admin/usuarios/{id}/reactivar */
  reactivarUsuario: mockable(
    (id) => api.post(`/admin/usuarios/${id}/reactivar`).then(unwrap),
    (id) => m.cambiarEstadoUsuario(id, 'ACTIVA'),
  ),

  /**
   * HU-07.02 · POST /api/admin/recolectores · body: { nombre, apellidos, email, telefono, dni }
   * 201 → usuario + { passwordProvisional } (solo en esta respuesta). Al entrar deberá crear su contraseña y elegir zona
   */
  crearRecolector: mockable((data) => api.post('/admin/recolectores', data).then(unwrap), (data) => m.crearRecolector(data)),

  /** HU-07.02 · POST /api/admin/usuarios/{id}/password-provisional → { email, passwordProvisional } · deberá cambiarla al entrar */
  restablecerPassword: mockable((id) => api.post(`/admin/usuarios/${id}/password-provisional`).then(unwrap), (id) => m.restablecerPassword(id)),
}
