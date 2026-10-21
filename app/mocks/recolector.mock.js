import { mockError, mockPage } from '../api/mock'
import { loadSession } from '../auth/tokenStorage'
import { round2 } from './helpers'
import { NAVE } from './malaga'
import {
  calcularLiquidacion,
  co2DePedido,
  dia,
  impactoDe,
  incidencias,
  nombreCompleto,
  nuevaIncidencia,
  nuevaSolicitudZona,
  pedidos,
  solicitudesZona,
  TIPOS_INCIDENCIA,
  usuarioPorId,
  zonaPorId,
  zonas,
} from './db'

const yoId = () => loadSession()?.usuario?.id ?? 419

/** HU-01.03 / HU-04.01: solo la información necesaria para hacer la recogida */
function vista(p, { detalle = false } = {}) {
  const c = usuarioPorId(p.ciudadanoId)
  const base = {
    id: p.id,
    codigo: p.codigo,
    estado: p.estado,
    fecha: p.fecha,
    horaInicio: p.horaInicio.slice(0, 5),
    horaFin: p.horaFin.slice(0, 5),
    direccion: p.direccion,
    lat: p.direccion.lat,
    lng: p.direccion.lng,
    zona: zonaPorId(p.zonaId)?.nombre,
    numBolsas: p.bolsas.length,
    totalEnvases: p.bolsas.reduce((s, b) => s + b.cantidad, 0),
  }
  if (!detalle) return base
  return {
    ...base,
    ciudadano: { nombre: `${c.nombre} ${c.apellidos.split(' ')[0][0]}.`, telefono: c.telefono },
    iniciadoEn: p.iniciadoEn,
    completadoEn: p.completadoEn,
    bolsas: p.bolsas.map(({ id, codigo, tipoEnvase, cantidad, capacidadMaxima, resultado, envasesValidos, nota }) => ({
      id,
      codigo,
      tipoEnvase,
      cantidad,
      capacidadMaxima,
      resultado,
      envasesValidos,
      nota,
    })),
    incidencias: incidencias
      .filter((i) => i.pedidoId === p.id)
      .map((i) => ({ id: i.id, codigo: i.codigo, tipo: TIPOS_INCIDENCIA.find((t) => t.codigo === i.tipo)?.nombre, estado: i.estado, creadaEn: i.creadaEn })),
  }
}

/** HU-04.01: 403 si la recogida es de otro recolector */
const asignada = (id) => {
  const p = pedidos.find((x) => x.id === Number(id))
  if (!p) throw mockError(404, 'NOT_FOUND', 'Recogida no encontrada.')
  if (p.recolectorId !== yoId()) throw mockError(403, 'FORBIDDEN', 'Esta recogida no está asignada a ti.')
  return p
}

const enCurso = (p) => {
  if (p.estado !== 'EN_CAMINO') throw mockError(409, 'ESTADO_NO_VALIDO', 'Primero tienes que iniciar la recogida.')
}

/** Zonas y días de la semana en que recoge el recolector */
export const asignacionesDe = (id) =>
  zonas
    .map((z) => ({ zona: { id: z.id, nombre: z.nombre }, dias: Object.entries(z.asignaciones).filter(([, r]) => r === id).map(([d]) => Number(d)) }))
    .filter((a) => a.dias.length)

export const solicitudVista = (x) => ({
  id: x.id,
  estado: x.estado,
  creadaEn: x.creadaEn,
  motivo: x.motivo,
  zonaActual: x.zonaActualId ? { id: x.zonaActualId, nombre: zonaPorId(x.zonaActualId)?.nombre } : null,
  zonaSolicitada: { id: x.zonaSolicitadaId, nombre: zonaPorId(x.zonaSolicitadaId)?.nombre },
  resueltaEn: x.resueltaEn,
  resueltaPor: x.resueltaPor,
  respuesta: x.respuesta,
})

/** Distancia por carretera estimada (línea recta x 1,3) */
function km(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3
}

/** Vecino más próximo desde `inicio` y mejora 2-opt del recorrido */
function optimizar(inicio, puntos) {
  const resto = [...puntos]
  const ruta = []
  let actual = inicio
  while (resto.length) {
    resto.sort((a, b) => km(actual, a) - km(actual, b))
    actual = resto.shift()
    ruta.push(actual)
  }
  const total = (r) => r.reduce((s, p, i) => s + km(i ? r[i - 1] : inicio, p), 0)
  let mejora = true
  while (mejora) {
    mejora = false
    for (let i = 0; i < ruta.length - 1; i++)
      for (let j = i + 1; j < ruta.length; j++) {
        const nueva = [...ruta.slice(0, i), ...ruta.slice(i, j + 1).reverse(), ...ruta.slice(j + 1)]
        if (total(nueva) + 1e-9 < total(ruta)) {
          ruta.splice(0, ruta.length, ...nueva)
          mejora = true
        }
      }
  }
  return ruta
}

export const recolectorMock = {
  /** Recogidas asignadas desde ayer en adelante (las de días anteriores sin cerrar también) + días que trabaja en cada zona */
  recogidas() {
    const desde = dia(-1)
    const lista = pedidos
      .filter((p) => p.recolectorId === yoId())
      .filter((p) => p.fecha >= dia(0) || (p.fecha >= desde && p.estado === 'EN_CAMINO'))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio))
      .map((p) => vista(p))
    return { asignaciones: asignacionesDe(yoId()), recogidas: lista }
  },

  /**
   * Ruta sugerida del día: las paradas se ordenan por franja (no se puede llegar antes de que empiece)
   * y, dentro de cada franja, por cercanía (vecino más próximo + mejora 2-opt) desde el punto de salida.
   */
  ruta({ fecha, lat, lng } = {}) {
    const f = fecha ?? dia(0)
    const delDia = pedidos.filter((p) => p.recolectorId === yoId() && p.fecha === f)
    const origen = lat != null && lng != null ? { nombre: 'Tu ubicación', lat: Number(lat), lng: Number(lng) } : NAVE
    const pendientes = delDia.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO')
    const franjasHora = [...new Set(pendientes.map((p) => p.horaInicio))].sort()
    const orden = []
    let actual = origen
    for (const h of franjasHora) {
      const grupo = optimizar(actual, pendientes.filter((p) => p.horaInicio === h).map((p) => vista(p)))
      orden.push(...grupo)
      if (grupo.length) actual = grupo[grupo.length - 1]
    }
    let previo = origen
    let distanciaKm = 0
    const paradas = orden.map((p, i) => {
      const d = km(previo, p)
      distanciaKm += d
      previo = p
      return { ...p, orden: i + 1, distanciaDesdeAnteriorKm: round2(d) }
    })
    return {
      fecha: f,
      origen,
      paradas,
      hechas: delDia.filter((p) => p.estado === 'COMPLETADA').map((p) => vista(p)),
      canceladas: delDia.filter((p) => p.estado === 'CANCELADA').map((p) => vista(p)),
      distanciaKm: round2(distanciaKm),
      // 25 km/h de media en ciudad + 5 minutos por parada
      duracionMin: Math.round((distanciaKm / 25) * 60 + paradas.length * 5),
    }
  },

  historial({ page = 0, size = 10 } = {}) {
    const lista = pedidos
      .filter((p) => p.recolectorId === yoId() && p.estado === 'COMPLETADA')
      .sort((a, b) => b.completadoEn.localeCompare(a.completadoEn))
      .map((p) => ({
        ...vista(p),
        completadoEn: p.completadoEn,
        envasesValidos: p.bolsas.reduce((s, b) => s + (b.envasesValidos ?? 0), 0),
        co2EvitadoKg: round2(co2DePedido(p)),
        tieneIncidencias: incidencias.some((i) => i.pedidoId === p.id),
      }))
    return mockPage(lista, { page, size })
  },

  impacto: () => impactoDe(pedidos.filter((p) => p.recolectorId === yoId())),

  preferencias() {
    const u = usuarioPorId(yoId())
    return {
      zonaPreferida: u.zonaPreferidaId ? { id: u.zonaPreferidaId, nombre: zonaPorId(u.zonaPreferidaId)?.nombre } : null,
      asignaciones: asignacionesDe(u.id),
      zonas: zonas.map((z) => ({ id: z.id, nombre: z.nombre, codigosPostales: z.codigosPostales })),
      solicitudes: solicitudesZona
        .filter((x) => x.recolectorId === u.id)
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
        .map(solicitudVista),
    }
  },

  /** Solo en el primer inicio de sesión: después cualquier cambio es una solicitud al admin */
  elegirZonaInicial({ zonaId }) {
    const u = usuarioPorId(yoId())
    if (u.zonaPreferidaId) throw mockError(409, 'ZONA_YA_ELEGIDA', 'Ya tienes zona preferida: para cambiarla envía una solicitud.')
    if (!zonaPorId(zonaId)) throw mockError(400, 'VALIDATION_ERROR', 'Elige una zona.', { zonaId: 'Obligatorio' })
    u.zonaPreferidaId = Number(zonaId)
    return recolectorMock.preferencias()
  },

  solicitarCambioZona({ zonaId, motivo }) {
    const u = usuarioPorId(yoId())
    if (!zonaPorId(zonaId)) throw mockError(400, 'VALIDATION_ERROR', 'Elige una zona.', { zonaId: 'Obligatorio' })
    if (Number(zonaId) === u.zonaPreferidaId) throw mockError(400, 'VALIDATION_ERROR', 'Ya es tu zona preferida.', { zonaId: 'Elige otra zona' })
    if (solicitudesZona.some((x) => x.recolectorId === u.id && x.estado === 'PENDIENTE'))
      throw mockError(409, 'SOLICITUD_PENDIENTE', 'Ya tienes una solicitud pendiente. Cancélala o espera la respuesta.')
    nuevaSolicitudZona({ recolectorId: u.id, zonaSolicitadaId: Number(zonaId), motivo: motivo?.trim() || null })
    return recolectorMock.preferencias()
  },

  cancelarSolicitud(id) {
    const sol = solicitudesZona.find((x) => x.id === Number(id) && x.recolectorId === yoId())
    if (!sol) throw mockError(404, 'NOT_FOUND', 'Solicitud no encontrada.')
    if (sol.estado !== 'PENDIENTE') throw mockError(409, 'YA_RESUELTA', 'Esta solicitud ya está resuelta.')
    sol.estado = 'CANCELADA'
    sol.resueltaEn = new Date().toISOString()
    return recolectorMock.preferencias()
  },

  recogida: (id) => vista(asignada(id), { detalle: true }),

  iniciar(id) {
    const p = asignada(id)
    if (p.estado !== 'PENDIENTE') throw mockError(409, 'ESTADO_NO_VALIDO', 'Solo se puede iniciar una recogida pendiente.')
    if (p.fecha !== dia(0))
      throw mockError(409, 'NO_PERMITIDO', 'Solo puedes iniciar una recogida en su fecha programada.')
    p.estado = 'EN_CAMINO'
    p.iniciadoEn = new Date().toISOString()
    return vista(p, { detalle: true })
  },

  resultadoBolsa(id, bolsaId, { resultado, envasesValidos, nota }) {
    const p = asignada(id)
    enCurso(p)
    const b = p.bolsas.find((x) => x.id === Number(bolsaId))
    if (!b) throw mockError(404, 'NOT_FOUND', 'Bolsa no encontrada.')
    if (resultado !== 'ACEPTADA' && !nota?.trim())
      throw mockError(400, 'VALIDATION_ERROR', 'Explica qué ha pasado con la bolsa.', { nota: 'Obligatorio' })
    if (resultado === 'DISCREPANCIA' && !(envasesValidos >= 0 && envasesValidos <= b.capacidadMaxima))
      throw mockError(400, 'VALIDATION_ERROR', 'Indica cuántos envases son válidos.', { envasesValidos: 'Número no válido' })
    b.resultado = resultado
    b.envasesValidos = resultado === 'ACEPTADA' ? b.cantidad : resultado === 'NO_ENCONTRADA' ? 0 : Number(envasesValidos)
    b.nota = resultado === 'ACEPTADA' ? null : nota.trim()
    // HU-04.04: la discrepancia queda asociada a una incidencia
    if (resultado !== 'ACEPTADA' && !incidencias.some((i) => i.bolsaId === b.id)) {
      nuevaIncidencia({
        pedido: p,
        bolsaId: b.id,
        tipo: resultado === 'NO_ENCONTRADA' ? 'BOLSA_NO_ENCONTRADA' : 'CONTENIDO_NO_COINCIDE',
        descripcion: `Bolsa ${b.codigo}: ${b.nota}`,
        autorId: yoId(),
      })
    }
    return vista(p, { detalle: true })
  },

  completar(id) {
    const p = asignada(id)
    enCurso(p)
    const pendientes = p.bolsas.filter((b) => !b.resultado).length
    if (pendientes) throw mockError(409, 'BOLSAS_SIN_VERIFICAR', `Te quedan ${pendientes} bolsa(s) por verificar.`)
    p.estado = 'COMPLETADA'
    p.completadoEn = new Date().toISOString()
    // HU-05.02: solo los envases válidos generan abono (y una sola vez)
    p.liquidacion ??= calcularLiquidacion(p.bolsas.reduce((s, b) => s + b.envasesValidos, 0))
    return vista(p, { detalle: true })
  },

  incidencia(id, { tipo, descripcion }) {
    const p = asignada(id)
    const fieldErrors = {}
    if (!tipo) fieldErrors.tipo = 'Elige el tipo de incidencia'
    if (!descripcion?.trim()) fieldErrors.descripcion = 'Describe lo ocurrido'
    if (Object.keys(fieldErrors).length) throw mockError(400, 'VALIDATION_ERROR', 'Faltan datos obligatorios.', fieldErrors)
    const inc = nuevaIncidencia({ pedido: p, tipo, descripcion: descripcion.trim(), autorId: yoId() })
    return { id: inc.id, codigo: inc.codigo, creadaEn: inc.creadaEn, autor: nombreCompleto(usuarioPorId(yoId())) }
  },
}
