import api from './client'
import { mockable, unwrap } from './mock'
import { recolectorMock as m } from '../mocks/recolector.mock'

/**
 * Rol RECOLECTOR (EP-04, HU-06.01).
 * Solo ve las recogidas que tiene asignadas (por su zona): cualquier otra devuelve 403.
 */
export const recolectorService = {
  /**
   * HU-04.01 · GET /api/recolector/recogidas
   * Recogidas asignadas de hoy en adelante (y las que siguen en camino de días anteriores).
   * { asignaciones: [{ zona: { id, nombre }, dias: [1..7] }],
   * recogidas: [{ id, codigo, estado, fecha, horaInicio, horaFin, direccion, lat, lng, zona, numBolsas, totalEnvases }] }
   */
  getRecogidas: mockable(() => api.get('/recolector/recogidas').then(unwrap), () => m.recogidas()),

  /**
   * HU-04.01 · GET /api/recolector/recogidas/{id}
   * 403 si no es suya. Añade { ciudadano: { nombre, telefono }, iniciadoEn, completadoEn,
   * bolsas: [{ id, codigo, tipoEnvase, cantidad, capacidadMaxima, resultado, envasesValidos, nota }], incidencias }
   */
  getRecogida: mockable((id) => api.get(`/recolector/recogidas/${id}`).then(unwrap), (id) => m.recogida(id)),

  /** HU-04.02 · POST /api/recolector/recogidas/{id}/iniciar · PENDIENTE → EN_CAMINO (guarda fecha y hora) */
  iniciar: mockable((id) => api.post(`/recolector/recogidas/${id}/iniciar`).then(unwrap), (id) => m.iniciar(id)),

  /**
   * HU-04.04 · PUT /api/recolector/recogidas/{id}/bolsas/{bolsaId}
   * body: { resultado: ACEPTADA|DISCREPANCIA|NO_ENCONTRADA, envasesValidos?, nota? }
   * DISCREPANCIA y NO_ENCONTRADA crean una incidencia asociada a la bolsa (HU-04.03)
   */
  registrarResultadoBolsa: mockable(
    (id, bolsaId, data) => api.put(`/recolector/recogidas/${id}/bolsas/${bolsaId}`, data).then(unwrap),
    (id, bolsaId, data) => m.resultadoBolsa(id, bolsaId, data),
  ),

  /**
   * HU-04.03 · POST /api/recolector/recogidas/{id}/completar · EN_CAMINO → COMPLETADA
   * 409 BOLSAS_SIN_VERIFICAR si falta alguna bolsa. Calcula el abono (HU-05.02)
   */
  completar: mockable((id) => api.post(`/recolector/recogidas/${id}/completar`).then(unwrap), (id) => m.completar(id), { delay: 700 }),

  /** HU-06.01 · POST /api/recolector/recogidas/{id}/incidencias · body: { tipo, descripcion } → 201 { id, codigo, creadaEn } */
  registrarIncidencia: mockable(
    (id, data) => api.post(`/recolector/recogidas/${id}/incidencias`, data).then(unwrap),
    (id, data) => m.incidencia(id, data),
  ),

  /**
   * GET /api/recolector/ruta?fecha=YYYY-MM-DD&lat=&lng=
   * Ruta sugerida: paradas ordenadas por franja y, dentro de cada franja, por cercanía desde el origen (nave o ubicación actual).
   * { fecha, origen: { nombre, lat, lng }, paradas: [{ orden, ...recogida, distanciaDesdeAnteriorKm }], hechas, canceladas, distanciaKm, duracionMin }
   */
  getRuta: mockable((params) => api.get('/recolector/ruta', { params }).then(unwrap), (params) => m.ruta(params)),

  /** GET /api/recolector/historial?page= · Page<recogida completada + { completadoEn, envasesValidos, co2EvitadoKg, tieneIncidencias }> */
  getHistorial: mockable((params) => api.get('/recolector/historial', { params }).then(unwrap), (params) => m.historial(params)),

  /** GET /api/recolector/impacto · CO2 evitado con las recogidas del recolector (mismo formato que el del ciudadano, sin zona) */
  getImpacto: mockable(() => api.get('/recolector/impacto').then(unwrap), () => m.impacto()),

  /**
   * GET /api/recolector/preferencias
   * { zonaPreferida: { id, nombre } | null, asignaciones: [{ zona, dias }], zonas: [{ id, nombre, codigosPostales }],
   * solicitudes: [{ id, estado: PENDIENTE|APROBADA|RECHAZADA|CANCELADA, creadaEn, motivo, zonaActual, zonaSolicitada, resueltaEn, resueltaPor, respuesta }] }
   */
  getPreferencias: mockable(() => api.get('/recolector/preferencias').then(unwrap), () => m.preferencias()),

  /** PUT /api/recolector/preferencias/zona · body: { zonaId } · SOLO en el primer inicio de sesión; si ya tiene zona → 409 ZONA_YA_ELEGIDA */
  elegirZonaInicial: mockable(
    (zonaId) => api.put('/recolector/preferencias/zona', { zonaId }).then(unwrap),
    (zonaId) => m.elegirZonaInicial({ zonaId }),
  ),

  /** POST /api/recolector/solicitudes-zona · body: { zonaId, motivo } · 409 SOLICITUD_PENDIENTE si ya hay una abierta */
  solicitarCambioZona: mockable((data) => api.post('/recolector/solicitudes-zona', data).then(unwrap), (data) => m.solicitarCambioZona(data)),

  /** POST /api/recolector/solicitudes-zona/{id}/cancelar · solo si sigue PENDIENTE */
  cancelarSolicitudZona: mockable((id) => api.post(`/recolector/solicitudes-zona/${id}/cancelar`).then(unwrap), (id) => m.cancelarSolicitud(id)),
}
