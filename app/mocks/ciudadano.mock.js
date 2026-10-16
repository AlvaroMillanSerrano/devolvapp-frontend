import { mockError, mockPage } from '../api/mock'
import { loadSession } from '../auth/tokenStorage'
import {
  codigoBolsa,
  co2DePedido,
  dia,
  diaSemana,
  franjas,
  impactoDe,
  incidencias,
  nextIds,
  nuevaRetirada,
  PARAMETROS,
  pedidos,
  recolectorPara,
  retiradas,
  saldoDe,
  TIPOS_ENVASE,
  TIPOS_INCIDENCIA,
  usuarioPorId,
  zonaDeCp,
} from './db'
import { round2 } from './helpers'

const yo = () => usuarioPorId(loadSession()?.usuario?.id) ?? usuarioPorId(101)

const ocupacion = (fecha, franjaId) =>
  pedidos.filter((p) => p.fecha === fecha && p.franjaId === franjaId && p.estado !== 'CANCELADA').length

/** Resumen de lista: lo que el ciudadano ve en "Mis pedidos" (HU-02.03) */
const resumen = (p) => ({
  id: p.id,
  codigo: p.codigo,
  estado: p.estado,
  creadoEn: p.creadoEn,
  fecha: p.fecha,
  horaInicio: p.horaInicio,
  horaFin: p.horaFin,
  numBolsas: p.bolsas.length,
  totalEnvases: p.bolsas.reduce((s, b) => s + b.cantidad, 0),
  importeCiudadano: p.liquidacion?.parteCiudadano ?? null,
  tieneIncidencias: incidencias.some((i) => i.pedidoId === p.id),
})

const nombreIncidencia = (codigo) => TIPOS_INCIDENCIA.find((t) => t.codigo === codigo)?.nombre ?? codigo

/** Detalle (HU-02.02, HU-02.03, HU-03.03, HU-06.04) */
export function detallePedidoCiudadano(p) {
  return {
    ...resumen(p),
    direccion: p.direccion,
    iniciadoEn: p.iniciadoEn,
    completadoEn: p.completadoEn,
    canceladoEn: p.canceladoEn,
    cancelable: p.estado === 'PENDIENTE',
    bolsas: p.bolsas.map(({ id, codigo, tipoEnvase, cantidad, capacidadMaxima, resultado, envasesValidos }) => ({
      id,
      codigo,
      tipoEnvase,
      cantidad,
      capacidadMaxima,
      resultado,
      envasesValidos,
    })),
    liquidacion: p.liquidacion && { envasesValidos: p.liquidacion.envasesValidos, importeCiudadano: p.liquidacion.parteCiudadano },
    co2EvitadoKg: round2(co2DePedido(p)),
    // Solo la información de la incidencia habilitada para el ciudadano (sin historial interno)
    incidencias: incidencias
      .filter((i) => i.pedidoId === p.id)
      .map((i) => ({ id: i.id, codigo: i.codigo, tipo: nombreIncidencia(i.tipo), estado: i.estado, creadaEn: i.creadaEn, resolucion: i.resolucion })),
  }
}

const propio = (id) => {
  const p = pedidos.find((x) => x.id === Number(id))
  if (!p || p.ciudadanoId !== yo().id) throw mockError(404, 'NOT_FOUND', 'Pedido no encontrado.')
  return p
}

export const ciudadanoMock = {
  pedidos({ estado, page = 0, size = 10 } = {}) {
    let lista = pedidos.filter((p) => p.ciudadanoId === yo().id)
    if (estado === 'ACTIVOS') lista = lista.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO')
    else if (estado) lista = lista.filter((p) => p.estado === estado)
    // Los activos, del más próximo al más lejano; el resto, del más reciente al más antiguo
    const orden = estado === 'ACTIVOS' ? 1 : -1
    lista.sort((a, b) => orden * (a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio)))
    return mockPage(lista.map(resumen), { page, size })
  },

  pedido: (id) => detallePedidoCiudadano(propio(id)),

  disponibilidad() {
    const u = yo()
    const zona = zonaDeCp(u.direccion?.codigoPostal)
    if (!zona) return { codigoPostal: u.direccion?.codigoPostal ?? null, zona: null, huecos: [] }
    const huecos = []
    for (let i = 1; i <= 14; i++) {
      const fecha = dia(i)
      franjas
        // Solo se ofrecen los días con franjas Y recolector asignado (HU-07.06)
        .filter((f) => f.zonaId === zona.id && f.diaSemana === diaSemana(fecha) && recolectorPara(zona, fecha))
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
        .forEach((f) => {
          const plazasLibres = Math.max(0, f.capacidad - ocupacion(fecha, f.id))
          huecos.push({ fecha, franjaId: f.id, horaInicio: f.horaInicio, horaFin: f.horaFin, plazasLibres, completa: plazasLibres === 0 })
        })
    }
    return { codigoPostal: u.direccion.codigoPostal, zona: { id: zona.id, nombre: zona.nombre }, huecos }
  },

  crearPedido({ bolsas, fecha, franjaId }) {
    const u = yo()
    const zona = zonaDeCp(u.direccion?.codigoPostal)
    if (!zona) throw mockError(422, 'ZONA_SIN_SERVICIO', 'Todavía no hay recogidas en tu código postal.')
    if (!bolsas?.length) throw mockError(400, 'VALIDATION_ERROR', 'Añade al menos una bolsa.')
    if (bolsas.length > PARAMETROS.pedidos.maxBolsas) throw mockError(400, 'VALIDATION_ERROR', `Máximo ${PARAMETROS.pedidos.maxBolsas} bolsas por pedido.`)
    const fieldErrors = {}
    bolsas.forEach((b, i) => {
      const tipo = TIPOS_ENVASE.find((t) => t.codigo === b.tipoEnvase)
      if (!tipo) fieldErrors[`bolsas[${i}].tipoEnvase`] = 'Elige el tipo de envase'
      else if (!(b.cantidad > 0)) fieldErrors[`bolsas[${i}].cantidad`] = 'La cantidad debe ser mayor que 0'
      else if (b.cantidad > tipo.capacidadMaximaBolsa) fieldErrors[`bolsas[${i}].cantidad`] = `Máximo ${tipo.capacidadMaximaBolsa} envases por bolsa`
    })
    if (Object.keys(fieldErrors).length) throw mockError(400, 'VALIDATION_ERROR', 'Revisa las bolsas.', fieldErrors)
    const f = franjas.find((x) => x.id === franjaId && x.zonaId === zona.id)
    if (!f || f.diaSemana !== diaSemana(fecha) || !recolectorPara(zona, fecha)) throw mockError(400, 'FRANJA_NO_VALIDA', 'Esa franja ya no está disponible.')
    if (ocupacion(fecha, f.id) >= f.capacidad) throw mockError(409, 'FRANJA_COMPLETA', 'Esa franja se acaba de completar. Elige otra.')

    const id = nextIds.pedido()
    const p = {
      id,
      codigo: `P-${id}`,
      ciudadanoId: u.id,
      zonaId: zona.id,
      recolectorId: recolectorPara(zona, fecha), // HU-07.06: el recolector asignado a la zona ese día de la semana
      direccion: { ...u.direccion },
      fecha,
      franjaId: f.id,
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
      estado: 'PENDIENTE',
      creadoEn: new Date().toISOString(),
      iniciadoEn: null,
      completadoEn: null,
      canceladoEn: null,
      bolsas: bolsas.map((b) => ({
        id: nextIds.bolsa(),
        codigo: codigoBolsa(),
        tipoEnvase: b.tipoEnvase,
        cantidad: b.cantidad,
        capacidadMaxima: TIPOS_ENVASE.find((t) => t.codigo === b.tipoEnvase).capacidadMaximaBolsa,
        resultado: null,
        envasesValidos: null,
        nota: null,
      })),
      liquidacion: null,
    }
    pedidos.push(p)
    return detallePedidoCiudadano(p)
  },

  cancelar(id) {
    const p = propio(id)
    if (p.estado !== 'PENDIENTE') {
      const msg = p.estado === 'EN_CAMINO' ? 'El recolector ya está en camino: ya no se puede cancelar.' : 'Este pedido ya no se puede cancelar.'
      throw mockError(409, 'ESTADO_NO_CANCELABLE', msg)
    }
    p.estado = 'CANCELADA'
    p.canceladoEn = new Date().toISOString()
    return detallePedidoCiudadano(p)
  },

  monedero: () => ({ saldoDisponible: saldoDe(yo().id) }),

  /** CO2 evitado por el ciudadano y por toda su zona */
  impacto() {
    const u = yo()
    const zona = zonaDeCp(u.direccion?.codigoPostal)
    const propio = impactoDe(pedidos.filter((p) => p.ciudadanoId === u.id))
    return {
      ...propio,
      zona: zona ? { nombre: zona.nombre, co2EvitadoKg: impactoDe(pedidos.filter((p) => p.zonaId === zona.id)).co2EvitadoKg } : null,
    }
  },

  movimientos({ page = 0, size = 20 } = {}) {
    const id = yo().id
    const abonos = pedidos
      .filter((p) => p.ciudadanoId === id && p.liquidacion)
      .map((p) => ({
        id: `A-${p.id}`,
        tipo: 'ABONO',
        fecha: p.completadoEn,
        importe: p.liquidacion.parteCiudadano,
        estado: 'COMPLETADO',
        concepto: `Pedido ${p.codigo} · ${p.liquidacion.envasesValidos} envases válidos`,
        pedidoId: p.id,
      }))
    const salidas = retiradas
      .filter((r) => r.ciudadanoId === id)
      .map((r) => ({
        id: `R-${r.id}`,
        tipo: 'RETIRADA',
        fecha: r.solicitadaEn,
        importe: -r.importe,
        estado: r.estado,
        concepto: `Transferencia a ${r.iban.slice(0, 4)} •••• ${r.iban.slice(-4)}`,
        referencia: r.referenciaBancaria,
        motivoFallo: r.motivoFallo,
        procesadaEn: r.procesadaEn,
      }))
    const lista = [...abonos, ...salidas].sort((a, b) => b.fecha.localeCompare(a.fecha))
    return mockPage(lista, { page, size })
  },

  retirar({ importe, iban }) {
    const u = yo()
    const saldo = saldoDe(u.id)
    const valor = round2(Number(importe))
    if (!(valor > 0)) throw mockError(400, 'VALIDATION_ERROR', 'Indica un importe mayor que 0.', { importe: 'Importe no válido' })
    if (valor > saldo)
      throw mockError(422, 'SALDO_INSUFICIENTE', `No tienes saldo suficiente. Disponible: ${saldo.toFixed(2).replace('.', ',')} €`, {
        importe: 'Supera tu saldo disponible',
      })
    const clean = String(iban).replace(/\s/g, '').toUpperCase()
    const r = nuevaRetirada({ ciudadanoId: u.id, importe: valor, iban: clean })
    return { id: r.id, codigo: r.codigo, estado: r.estado, importe: r.importe, saldoDisponible: saldoDe(u.id) }
  },
}
