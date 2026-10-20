import api from './client'
import { mockable, unwrap } from './mock'
import { ciudadanoMock as m } from '../mocks/ciudadano.mock'

/**
 * Rol CIUDADANO (EP-02, EP-03, EP-05, HU-06.04).
 * El backend obtiene el ciudadano del token: nunca se envía su id.
 * Un pedido = las bolsas del ciudadano + su recogida (estado PENDIENTE | EN_CAMINO | COMPLETADA | CANCELADA).
 */
export const ciudadanoService = {
  /**
   * HU-02.03 / HU-03.03 · GET /api/ciudadano/pedidos?estado=&page=&size=
   * estado: PENDIENTE | EN_CAMINO | COMPLETADA | CANCELADA | ACTIVOS (pendientes + en camino)
   * Page<{ id, codigo, estado, creadoEn, fecha, horaInicio, horaFin, numBolsas, totalEnvases, importeCiudadano, tieneIncidencias }>
   */
  getPedidos: mockable((params) => api.get('/ciudadano/pedidos', { params }).then(unwrap), (params) => m.pedidos(params)),

  /**
   * HU-02.02 / HU-02.03 / HU-06.04 · GET /api/ciudadano/pedidos/{id}
   * resumen + { direccion, iniciadoEn, completadoEn, canceladoEn, cancelable,
   * bolsas: [{ id, codigo, tipoEnvase, cantidad, capacidadMaxima, resultado, envasesValidos }],
   * liquidacion: { envasesValidos, importeCiudadano } | null,
   * incidencias: [{ id, codigo, tipo, estado, creadaEn, resolucion }] }
   */
  getPedido: mockable((id) => api.get(`/ciudadano/pedidos/${id}`).then(unwrap), (id) => m.pedido(id)),

  /**
   * HU-03.01 · GET /api/ciudadano/disponibilidad
   * Franjas de los próximos 14 días para el CP del ciudadano.
   * { codigoPostal, zona: { id, nombre } | null, huecos: [{ fecha, franjaId, horaInicio, horaFin, plazasLibres, completa }] }
   */
  getDisponibilidad: mockable(() => api.get('/ciudadano/disponibilidad').then(unwrap), () => m.disponibilidad()),

  /**
   * HU-02.01 / HU-02.02 / HU-03.02 · POST /api/ciudadano/pedidos
   * body: { fecha?, franjaId?, bolsas: [{ contenidos: { PET: 2, BRIK: 1 } }] }
   * Si incluye fecha y franja, el servidor asigna la zona, horario y recolector configurado.
   * 201 → detalle con código del pedido y de cada bolsa.
   */
  crearPedido: mockable((data) => api.post('/ciudadano/pedidos', data).then(unwrap), (data) => m.crearPedido(data), { delay: 700 }),

  /** HU-03.04 · POST /api/ciudadano/pedidos/{id}/cancelar · solo PENDIENTE, si no 409 ESTADO_NO_CANCELABLE */
  cancelarPedido: mockable((id) => api.post(`/ciudadano/pedidos/${id}/cancelar`).then(unwrap), (id) => m.cancelar(id)),

  /**
   * GET /api/ciudadano/impacto · CO2 evitado por los envases del ciudadano
   * { co2EvitadoKg, envasesReciclados, recogidas, porTipo: [{ tipoEnvase, envases, co2Kg }], porMes: [{ mes: 'YYYY-MM', co2Kg }],
   * zona: { nombre, co2EvitadoKg } | null }
   */
  getImpacto: mockable(() => api.get('/ciudadano/impacto').then(unwrap), () => m.impacto()),

  /** HU-05.01 · GET /api/ciudadano/monedero · { saldoDisponible } (solo la parte del ciudadano ya validada) */
  getMonedero: mockable(() => api.get('/ciudadano/monedero').then(unwrap), () => m.monedero()),

  /**
   * HU-05.05 · GET /api/ciudadano/monedero/movimientos?page=&size=
   * Page<{ id, tipo: ABONO|RETIRADA, fecha, importe, estado, concepto, referencia?, motivoFallo?, procesadaEn? }>
   */
  getMovimientos: mockable(
    (params) => api.get('/ciudadano/monedero/movimientos', { params }).then(unwrap),
    (params) => m.movimientos(params),
  ),

  /**
   * HU-05.03 · POST /api/ciudadano/monedero/retiradas
   * body: { importe, iban } → 201 { id, codigo, estado: 'PENDIENTE', importe, saldoDisponible }
   * 400 VALIDATION_ERROR (IBAN) · 422 SALDO_INSUFICIENTE
   */
  solicitarRetirada: mockable(
    (data) => api.post('/ciudadano/monedero/retiradas', data).then(unwrap),
    (data) => m.retirar(data),
    { delay: 700 },
  ),
}
