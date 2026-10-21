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
  horaInicio: p.horaInicio.slice(0, 5),
  horaFin: p.horaFin.slice(0, 5),
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
    bolsas: p.bolsas.map(({ id, codigo, tipoEnvase, contenidos, cantidad, capacidadMaxima, resultado, envasesValidos }) => ({
      id,
      codigo,
      tipoEnvase,
      contenidos,
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
    lista.sort((a, b) => {
      const fechaA = a.fecha ?? a.creadoEn
      const fechaB = b.fecha ?? b.creadoEn
      return orden * fechaA.localeCompare(fechaB)
    })
    return mockPage(lista.map(resumen), { page, size })
  },

  pedido: (id) => detallePedidoCiudadano(propio(id)),

  disponibilidad() {
    const u = yo()
    const zona = zonaDeCp(u.direccion?.codigoPostal)
    if (!zona) return { codigoPostal: u.direccion?.codigoPostal ?? null, zona: null, huecos: [] }
    const huecos = []
    for (let i = 0; i < 14; i++) {
      const fecha = dia(i)
      franjas
        // Solo se ofrecen los días con franjas Y recolector asignado (HU-07.06)
        .filter((f) => f.zonaId === zona.id && f.diaSemana === diaSemana(fecha) && recolectorPara(zona, fecha))
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
        .forEach((f) => {
          if (fecha === dia(0) && new Date(`${fecha}T${f.horaFin}:00`) <= new Date()) return
          const plazasLibres = Math.max(0, f.capacidad - ocupacion(fecha, f.id))
          huecos.push({ fecha, franjaId: f.id, horaInicio: f.horaInicio, horaFin: f.horaFin, plazasLibres, completa: plazasLibres === 0 })
        })
    }
    return { codigoPostal: u.direccion.codigoPostal, zona: { id: zona.id, nombre: zona.nombre }, huecos }
  },

  crearPedido({ fecha, franjaId, bolsas }) {
    const u = yo()
    if (!u.direccion) throw mockError(422, 'DOMICILIO_REQUERIDO', 'Completa un domicilio antes de solicitar la recogida.')
    const fieldErrors = {}
    if (!fecha) fieldErrors.fecha = 'La fecha de recogida es obligatoria'
    if (!franjaId) fieldErrors.franjaId = 'La franja de recogida es obligatoria'
    if (fecha && fecha < dia(0)) fieldErrors.fecha = 'La fecha de recogida no puede estar en el pasado'
    const zona = zonaDeCp(u.direccion.codigoPostal)
    const franja = franjas.find((item) =>
      item.id === Number(franjaId) && item.zonaId === zona?.id && item.diaSemana === diaSemana(fecha))
    if (fecha && franjaId && !franja) fieldErrors.franjaId = 'La franja seleccionada no está disponible para esa fecha'
    if (franja && new Date(`${fecha}T${franja.horaFin}:00`) <= new Date())
      fieldErrors.fecha = 'La franja horaria ya ha finalizado'
    if (Object.keys(fieldErrors).length)
      throw mockError(400, 'VALIDATION_ERROR', 'Selecciona una fecha y una franja disponibles.', fieldErrors)
    if (!bolsas?.length) throw mockError(400, 'VALIDATION_ERROR', 'Añade al menos una bolsa.')
    if (bolsas.length > PARAMETROS.pedidos.maxBolsas) throw mockError(400, 'VALIDATION_ERROR', `Máximo ${PARAMETROS.pedidos.maxBolsas} bolsas por pedido.`)
    bolsas.forEach((bolsa, index) => {
      const entries = Object.entries(bolsa.contenidos ?? {})
      if (!entries.length) fieldErrors[`bolsas[${index}].contenidos`] = 'Añade al menos un tipo de envase'
      entries.forEach(([codigo, raw]) => {
        const tipo = TIPOS_ENVASE.find((item) => item.codigo === codigo)
        const cantidad = Number(raw)
        if (!tipo) fieldErrors[`bolsas[${index}].contenidos.${codigo}`] = 'Tipo de envase no válido'
        else if (!Number.isInteger(cantidad) || cantidad <= 0) fieldErrors[`bolsas[${index}].contenidos.${codigo}`] = 'La cantidad debe ser mayor que cero'
        else if (cantidad > tipo.capacidadMaximaBolsa) fieldErrors[`bolsas[${index}].contenidos.${codigo}`] = `Máximo ${tipo.capacidadMaximaBolsa} envases por tipo`
      })
    })
    if (Object.keys(fieldErrors).length) throw mockError(400, 'VALIDATION_ERROR', 'Revisa el contenido de las bolsas.', fieldErrors)

    const id = nextIds.pedido()
    const p = {
      id,
      codigo: `P-${id}`,
      ciudadanoId: u.id,
      zonaId: franja.zonaId,
      recolectorId: recolectorPara(zona, fecha),
      direccion: { ...u.direccion },
      fecha,
      franjaId: franja.id,
      horaInicio: franja.horaInicio,
      horaFin: franja.horaFin,
      estado: 'PENDIENTE',
      creadoEn: new Date().toISOString(),
      iniciadoEn: null,
      completadoEn: null,
      canceladoEn: null,
      bolsas: bolsas.map((bolsa) => {
        const contenidos = Object.fromEntries(Object.entries(bolsa.contenidos).map(([codigo, raw]) => [codigo, Number(raw)]))
        const cantidad = Object.values(contenidos).reduce((total, value) => total + value, 0)
        const capacidadMaxima = Object.keys(contenidos).reduce((total, codigo) => total + TIPOS_ENVASE.find((item) => item.codigo === codigo).capacidadMaximaBolsa, 0)
        const tipos = Object.keys(contenidos)
        return {
          id: nextIds.bolsa(),
          codigo: codigoBolsa(),
          tipoEnvase: tipos.length === 1 ? tipos[0] : 'MEZCLADO',
          contenidos,
          cantidad,
          capacidadMaxima,
          resultado: null,
          envasesValidos: null,
          nota: null,
        }
      }),
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
