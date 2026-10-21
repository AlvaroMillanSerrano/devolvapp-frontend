import { mockError, mockPage } from '../api/mock'
import { loadSession } from '../auth/tokenStorage'
import {
  CODIGOS_POSTALES_MALAGA,
  conGeo,
  passwordProvisional,
  dia,
  diaSemana,
  franjas,
  impactoDe,
  incidencias,
  nextIds,
  nombreCompleto,
  pedidos,
  retiradas,
  solicitudesZona,
  TIPOS_INCIDENCIA,
  usuarioPorId,
  usuarios,
  zonaDeCp,
  zonaPorId,
  zonas,
  validarDireccionServidor,
} from './db'
import { round2 } from './helpers'
import { solicitudVista } from './recolector.mock'

const yo = () => nombreCompleto(usuarioPorId(loadSession()?.usuario?.id)) ?? 'Administración'
const enPeriodo = (iso, desde, hasta) => (!desde || iso.slice(0, 10) >= desde) && (!hasta || iso.slice(0, 10) <= hasta)
const nombreTipo = (codigo) => TIPOS_INCIDENCIA.find((t) => t.codigo === codigo)?.nombre ?? codigo
const buscar = (lista, id, msg) => {
  const x = lista.find((e) => e.id === Number(id))
  if (!x) throw mockError(404, 'NOT_FOUND', msg)
  return x
}
const recolectorRef = (id) => (id ? { id: Number(id), nombre: nombreCompleto(usuarioPorId(id)) } : null)

/* ───── Recogidas (HU-04.04, HU-06.02) ───── */
const recogidaResumen = (p) => ({
  id: p.id,
  codigo: p.codigo,
  estado: p.estado,
  fecha: p.fecha,
  horaInicio: p.horaInicio.slice(0, 5),
  horaFin: p.horaFin,
  zona: zonaPorId(p.zonaId)?.nombre,
  direccion: p.direccion,
  ciudadano: nombreCompleto(usuarioPorId(p.ciudadanoId)),
  recolector: recolectorRef(p.recolectorId),
  numBolsas: p.bolsas.length,
  totalEnvases: p.bolsas.reduce((s, b) => s + b.cantidad, 0),
  tieneIncidencias: incidencias.some((i) => i.pedidoId === p.id),
})
const recogidaAdmin = (p) => ({
  ...recogidaResumen(p),
  creadoEn: p.creadoEn,
  iniciadoEn: p.iniciadoEn,
  completadoEn: p.completadoEn,
  canceladoEn: p.canceladoEn,
  bolsas: p.bolsas,
  liquidacion: p.liquidacion,
  incidencias: incidencias.filter((i) => i.pedidoId === p.id).map(incidenciaResumen),
})

function incidenciaResumen(i) {
  const p = pedidos.find((x) => x.id === i.pedidoId)
  return { id: i.id, codigo: i.codigo, tipo: i.tipo, tipoNombre: nombreTipo(i.tipo), estado: i.estado, creadaEn: i.creadaEn, pedido: { id: p.id, codigo: p.codigo } }
}

const transferenciaResumen = (r) => ({
  id: r.id,
  codigo: r.codigo,
  ciudadano: nombreCompleto(usuarioPorId(r.ciudadanoId)),
  importe: r.importe,
  estado: r.estado,
  solicitadaEn: r.solicitadaEn,
})

const usuarioResumen = (u) => ({ id: u.id, nombre: nombreCompleto(u), email: u.email, roles: u.roles, estado: u.estado })

/* ───── Zonas (HU-07.01, HU-07.06) ───── */
const zonaVista = (z) => ({
  id: z.id,
  nombre: z.nombre,
  codigosPostales: z.codigosPostales,
  pendientes: pedidos.filter((p) => p.zonaId === z.id && p.estado === 'PENDIENTE').length,
  dias: [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    diaSemana: d,
    recolector: recolectorRef(z.asignaciones[d]),
    franjas: franjas.filter((f) => f.zonaId === z.id && f.diaSemana === d).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  })),
})

const validarFranja = ({ diaSemana: d, horaInicio, horaFin, capacidad }) => {
  const fe = {}
  if (!(d >= 1 && d <= 7)) fe.diaSemana = 'Elige un día'
  if (!/^\d{2}:\d{2}$/.test(horaInicio ?? '')) fe.horaInicio = 'Hora no válida'
  if (!/^\d{2}:\d{2}$/.test(horaFin ?? '') || horaFin <= horaInicio) fe.horaFin = 'Debe ser posterior al inicio'
  if (!(capacidad >= 1)) fe.capacidad = 'Mínimo 1 recogida'
  if (Object.keys(fe).length) throw mockError(400, 'VALIDATION_ERROR', 'Revisa la franja.', fe)
}

const validarZona = ({ nombre, codigosPostales }, zonaId) => {
  const fe = {}
  if (!nombre?.trim()) fe.nombre = 'Ponle un nombre'
  else if (zonas.some((z) => z.id !== zonaId && z.nombre.toLowerCase() === nombre.trim().toLowerCase())) fe.nombre = 'Ya existe una zona con ese nombre'
  if (!codigosPostales?.length) fe.codigosPostales = 'Elige al menos un código postal'
  const ocupado = codigosPostales?.find((cp) => {
    const z = zonaDeCp(cp)
    return z && z.id !== zonaId
  })
  if (ocupado) fe.codigosPostales = `El CP ${ocupado} ya pertenece a la zona ${zonaDeCp(ocupado).nombre}`
  if (Object.keys(fe).length) throw mockError(400, 'VALIDATION_ERROR', 'Revisa la zona.', fe)
}

/** Recogidas pendientes de la zona en ese día de la semana pasan al nuevo recolector */
const reasignarPendientes = (z, d) =>
  pedidos.filter((p) => p.zonaId === z.id && p.estado === 'PENDIENTE' && diaSemana(p.fecha) === d).forEach((p) => (p.recolectorId = z.asignaciones[d] ?? null))

export const adminMock = {
  /* Bandeja: todo lo que espera una decisión de administración */
  pendientes() {
    const porAceptar = retiradas.filter((r) => r.estado === 'PENDIENTE')
    const diasSinRecolector = zonas.flatMap((z) =>
      [1, 2, 3, 4, 5, 6, 7]
        .filter((d) => !z.asignaciones[d] && franjas.some((f) => f.zonaId === z.id && f.diaSemana === d))
        .map((d) => ({ zona: { id: z.id, nombre: z.nombre }, diaSemana: d })),
    )
    return {
      transferencias: { total: porAceptar.length, importe: round2(porAceptar.reduce((s, r) => s + r.importe, 0)) },
      solicitudesZona: solicitudesZona.filter((s) => s.estado === 'PENDIENTE').length,
      incidenciasAbiertas: incidencias.filter((i) => i.estado === 'ABIERTA').length,
      recogidasAtrasadas: pedidos.filter((p) => p.fecha < dia(0) && (p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO')).length,
      recogidasSinRecolector: pedidos.filter((p) => p.estado === 'PENDIENTE' && !p.recolectorId).length,
      diasSinRecolector,
    }
  },

  /* HU-07.04 + HU-07.05 + impacto ambiental */
  indicadores({ desde, hasta } = {}) {
    const ps = pedidos.filter((p) => enPeriodo(p.creadoEn, desde, hasta))
    const liquidadas = pedidos.filter((p) => p.liquidacion && enPeriodo(p.completadoEn, desde, hasta))
    const sum = (k) => round2(liquidadas.reduce((s, p) => s + p.liquidacion[k], 0))
    const incs = incidencias.filter((i) => enPeriodo(i.creadaEn, desde, hasta))
    return {
      recogidas: {
        solicitadas: ps.length,
        completadas: ps.filter((p) => p.estado === 'COMPLETADA').length,
        canceladas: ps.filter((p) => p.estado === 'CANCELADA').length,
        enCurso: ps.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO').length,
      },
      incidencias: { registradas: incs.length, abiertas: incs.filter((i) => i.estado !== 'RESUELTA').length },
      economia: {
        envasesValidos: liquidadas.reduce((s, p) => s + p.liquidacion.envasesValidos, 0),
        importeTotal: sum('importeTotal'),
        parteEmpresa: sum('parteEmpresa'),
        parteCiudadanos: sum('parteCiudadano'),
      },
      impacto: { ...impactoDe(liquidadas), totalHistoricoKg: impactoDe(pedidos).co2EvitadoKg },
      porZona: zonas.map((z) => ({ zona: z.nombre, co2Kg: impactoDe(liquidadas.filter((p) => p.zonaId === z.id)).co2EvitadoKg })),
    }
  },

  /* Recogidas */
  recogidas({ fecha, estado, zonaId, q, page = 0, size = 10 } = {}) {
    const t = q?.trim().toLowerCase()
    const lista = pedidos
      .filter((p) => (!fecha || p.fecha === fecha) && (!zonaId || p.zonaId === Number(zonaId)))
      .filter((p) =>
        !estado
          ? true
          : estado === 'ATRASADAS'
            ? p.fecha < dia(0) && (p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO')
            : estado === 'SIN_RECOLECTOR'
              ? p.estado === 'PENDIENTE' && !p.recolectorId
              : p.estado === estado,
      )
      .filter((p) => !t || `${p.codigo} ${nombreCompleto(usuarioPorId(p.ciudadanoId))} ${p.direccion.nombreVia}`.toLowerCase().includes(t))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.horaInicio.localeCompare(b.horaInicio))
      .map(recogidaResumen)
    return mockPage(lista, { page, size })
  },

  recogida: (id) => recogidaAdmin(buscar(pedidos, id, 'Recogida no encontrada.')),

  reasignarRecogida(id, recolectorId) {
    const p = buscar(pedidos, id, 'Recogida no encontrada.')
    if (p.estado !== 'PENDIENTE' && p.estado !== 'EN_CAMINO') throw mockError(409, 'ESTADO_NO_VALIDO', 'Solo se pueden reasignar recogidas sin cerrar.')
    p.recolectorId = recolectorId ? Number(recolectorId) : null
    return recogidaAdmin(p)
  },

  cancelarRecogida(id) {
    const p = buscar(pedidos, id, 'Recogida no encontrada.')
    if (p.estado === 'COMPLETADA' || p.estado === 'CANCELADA') throw mockError(409, 'ESTADO_NO_CANCELABLE', 'Esta recogida ya está cerrada.')
    p.estado = 'CANCELADA'
    p.canceladoEn = new Date().toISOString()
    return recogidaAdmin(p)
  },

  /* HU-06.02 / HU-06.03 */
  incidencias({ tipo, estado, page = 0, size = 10 } = {}) {
    const lista = incidencias
      .filter((i) => (!tipo || i.tipo === tipo) && (!estado || i.estado === estado))
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .map(incidenciaResumen)
    return mockPage(lista, { page, size })
  },

  incidencia(id) {
    const i = buscar(incidencias, id, 'Incidencia no encontrada.')
    const p = pedidos.find((x) => x.id === i.pedidoId)
    return { ...incidenciaResumen(i), descripcion: i.descripcion, bolsaId: i.bolsaId, resolucion: i.resolucion, resueltaEn: i.resueltaEn, historial: i.historial, recogida: recogidaAdmin(p) }
  },

  actualizarIncidencia(id, { estado, resolucion }) {
    const i = buscar(incidencias, id, 'Incidencia no encontrada.')
    if (estado === 'RESUELTA' && !resolucion?.trim()) throw mockError(400, 'VALIDATION_ERROR', 'Indica cómo se ha resuelto.', { resolucion: 'Obligatorio para resolver' })
    const ahora = new Date().toISOString()
    if (estado && estado !== i.estado) {
      i.historial.push({ fecha: ahora, autor: yo(), accion: `Estado: ${{ ABIERTA: 'Abierta', EN_REVISION: 'En revisión', RESUELTA: 'Resuelta' }[estado]}` })
      i.estado = estado
      i.resueltaEn = estado === 'RESUELTA' ? ahora : null
    }
    if (resolucion !== undefined && resolucion !== i.resolucion) {
      i.resolucion = resolucion.trim() || null
      i.historial.push({ fecha: ahora, autor: yo(), accion: 'Resolución actualizada' })
    }
    return adminMock.incidencia(id)
  },

  /* HU-05.04 / HU-07.03 */
  transferencias({ estado, page = 0, size = 10 } = {}) {
    const lista = retiradas
      .filter((r) => !estado || r.estado === estado)
      .sort((a, b) => b.solicitadaEn.localeCompare(a.solicitadaEn))
      .map(transferenciaResumen)
    const total = (e) => round2(retiradas.filter((r) => r.estado === e).reduce((s, r) => s + r.importe, 0))
    return { ...mockPage(lista, { page, size }), totales: { PENDIENTE: total('PENDIENTE'), COMPLETADA: total('COMPLETADA'), FALLIDA: total('FALLIDA') } }
  },

  transferencia(id) {
    const r = buscar(retiradas, id, 'Transferencia no encontrada.')
    return { ...transferenciaResumen(r), iban: r.iban, procesadaEn: r.procesadaEn, procesadaPor: r.procesadaPor, referenciaBancaria: r.referenciaBancaria, remesa: r.remesa ?? null, motivoFallo: r.motivoFallo, historial: r.historial }
  },

  marcarTransferencia(id, { estado, motivoFallo, remesa = null }) {
    const r = buscar(retiradas, id, 'Transferencia no encontrada.')
    // HU-05.04: una transferencia ya procesada no se vuelve a pagar
    if (r.estado !== 'PENDIENTE') throw mockError(409, 'YA_PROCESADA', `La transferencia ${r.codigo} ya se ha procesado.`)
    if (estado === 'FALLIDA' && !motivoFallo?.trim()) throw mockError(400, 'VALIDATION_ERROR', 'Indica el motivo.', { motivoFallo: 'Obligatorio' })
    r.estado = estado
    r.procesadaEn = new Date().toISOString()
    r.procesadaPor = yo()
    // La referencia la genera el servidor al ordenar el pago: TRF-AAAAMMDD-<id>
    r.referenciaBancaria = estado === 'COMPLETADA' ? `TRF-${r.procesadaEn.slice(0, 10).replace(/-/g, '')}-${String(r.id).padStart(6, '0')}` : null
    r.remesa = estado === 'COMPLETADA' ? remesa : null
    r.motivoFallo = motivoFallo?.trim() || null
    r.historial.push({ fecha: r.procesadaEn, estado, autor: r.procesadaPor })
    return adminMock.transferencia(id)
  },

  /** Acepta y paga varias transferencias con la misma referencia de remesa */
  pagarLote({ ids }) {
    if (!ids?.length) throw mockError(400, 'VALIDATION_ERROR', 'Selecciona al menos una transferencia.')
    const ya = ids.map((id) => buscar(retiradas, id, 'Transferencia no encontrada.')).filter((r) => r.estado !== 'PENDIENTE')
    if (ya.length) throw mockError(409, 'YA_PROCESADA', `Ya procesadas: ${ya.map((r) => r.codigo).join(', ')}`)
    // Una remesa agrupa todos los pagos de la orden: REM-AAAAMMDD-HHMMSS
    const t = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
    const remesa = `REM-${t.slice(0, 8)}-${t.slice(8)}`
    ids.forEach((id) => adminMock.marcarTransferencia(id, { estado: 'COMPLETADA', remesa }))
    return { procesadas: ids.length, remesa }
  },

  /* HU-07.01 / HU-07.06 */
  codigosPostales: () =>
    CODIGOS_POSTALES_MALAGA.map((c) => {
      const z = zonaDeCp(c.cp)
      return { cp: c.cp, barrio: c.barrio, zona: z ? { id: z.id, nombre: z.nombre } : null }
    }),

  zonas: () => zonas.map(zonaVista),

  recolectores: () =>
    usuarios
      .filter((u) => u.roles.includes('RECOLECTOR') && u.estado === 'ACTIVA')
      .map((u) => ({
        id: u.id,
        nombre: nombreCompleto(u),
        zonaPreferida: u.zonaPreferidaId ? { id: u.zonaPreferidaId, nombre: zonaPorId(u.zonaPreferidaId)?.nombre } : null,
        // Días ya ocupados en cualquier zona: un recolector no puede estar en dos zonas el mismo día
        diasOcupados: zonas.flatMap((z) => Object.entries(z.asignaciones).filter(([, r]) => r === u.id).map(([d]) => ({ diaSemana: Number(d), zona: z.nombre, zonaId: z.id }))),
      })),

  crearZona({ nombre, codigosPostales }) {
    validarZona({ nombre, codigosPostales })
    const z = { id: nextIds.zona(), nombre: nombre.trim(), codigosPostales: [...codigosPostales].sort(), asignaciones: {} }
    zonas.push(z)
    return zonaVista(z)
  },

  editarZona(id, { nombre, codigosPostales }) {
    const z = buscar(zonas, id, 'Zona no encontrada.')
    validarZona({ nombre, codigosPostales }, z.id)
    z.nombre = nombre.trim()
    z.codigosPostales = [...codigosPostales].sort()
    return zonaVista(z)
  },

  borrarZona(id) {
    const z = buscar(zonas, id, 'Zona no encontrada.')
    const pend = pedidos.filter((p) => p.zonaId === z.id && (p.estado === 'PENDIENTE' || p.estado === 'EN_CAMINO')).length
    if (pend) throw mockError(409, 'ZONA_CON_RECOGIDAS', `La zona tiene ${pend} recogidas sin cerrar. Cancélalas o espera a que terminen.`)
    zonas.splice(zonas.indexOf(z), 1)
    franjas.splice(0, franjas.length, ...franjas.filter((f) => f.zonaId !== z.id))
    return null
  },

  asignarDia(zonaId, diaSem, recolectorId) {
    const z = buscar(zonas, zonaId, 'Zona no encontrada.')
    const d = Number(diaSem)
    if (recolectorId) {
      const otra = zonas.find((x) => x.id !== z.id && x.asignaciones[d] === Number(recolectorId))
      if (otra) throw mockError(409, 'RECOLECTOR_OCUPADO', `${nombreCompleto(usuarioPorId(recolectorId))} ya recoge ese día en la zona ${otra.nombre}.`)
      z.asignaciones[d] = Number(recolectorId)
    } else delete z.asignaciones[d]
    reasignarPendientes(z, d)
    return zonaVista(z)
  },

  crearFranja(zonaId, data) {
    const z = buscar(zonas, zonaId, 'Zona no encontrada.')
    validarFranja(data)
    franjas.push({ id: nextIds.franja(), zonaId: z.id, ...data })
    return zonaVista(z)
  },

  editarFranja(franjaId, data) {
    const f = buscar(franjas, franjaId, 'Franja no encontrada.')
    validarFranja(data)
    // HU-07.01: las recogidas ya confirmadas conservan su fecha y hora (se copiaron al crearlas)
    Object.assign(f, data)
    return zonaVista(zonaPorId(f.zonaId))
  },

  borrarFranja(franjaId) {
    const f = buscar(franjas, franjaId, 'Franja no encontrada.')
    franjas.splice(franjas.indexOf(f), 1)
    return zonaVista(zonaPorId(f.zonaId))
  },

  /* Solicitudes de cambio de zona de los recolectores */
  solicitudesZona({ estado } = {}) {
    return solicitudesZona
      .filter((s) => !estado || s.estado === estado)
      .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
      .map((s) => ({ ...solicitudVista(s), recolector: recolectorRef(s.recolectorId) }))
  },

  /** Aprobar: cambia la zona preferida y, si se pide, mueve sus días a la zona nueva (si están libres) */
  resolverSolicitud(id, { aprobar, moverDias = true, respuesta }) {
    const s = buscar(solicitudesZona, id, 'Solicitud no encontrada.')
    if (s.estado !== 'PENDIENTE') throw mockError(409, 'YA_RESUELTA', 'Esta solicitud ya está resuelta.')
    if (!aprobar && !respuesta?.trim()) throw mockError(400, 'VALIDATION_ERROR', 'Explica al recolector por qué se rechaza.', { respuesta: 'Obligatorio' })
    const conflictos = []
    if (aprobar) {
      const r = usuarioPorId(s.recolectorId)
      r.zonaPreferidaId = s.zonaSolicitadaId
      if (moverDias) {
        const nueva = zonaPorId(s.zonaSolicitadaId)
        zonas
          .filter((z) => z.id !== nueva.id)
          .forEach((z) =>
            Object.entries(z.asignaciones)
              .filter(([, rid]) => rid === r.id)
              .forEach(([d]) => {
                if (nueva.asignaciones[d] && nueva.asignaciones[d] !== r.id) return conflictos.push(Number(d))
                delete z.asignaciones[d]
                nueva.asignaciones[d] = r.id
                reasignarPendientes(z, Number(d))
                reasignarPendientes(nueva, Number(d))
              }),
          )
      }
    }
    s.estado = aprobar ? 'APROBADA' : 'RECHAZADA'
    s.resueltaEn = new Date().toISOString()
    s.resueltaPor = yo()
    s.respuesta = respuesta?.trim() || null
    return { solicitud: { ...solicitudVista(s), recolector: recolectorRef(s.recolectorId) }, diasEnConflicto: conflictos }
  },

  /* HU-07.02 */
  usuarios({ q, rol, page = 0, size = 10 } = {}) {
    const t = q?.trim().toLowerCase()
    const lista = usuarios
      .filter((u) => !rol || u.roles.includes(rol))
      .filter((u) => !t || `${nombreCompleto(u)} ${u.email} ${u.dni}`.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(usuarioResumen)
    return mockPage(lista, { page, size })
  },

  usuario(id) {
    const u = buscar(usuarios, id, 'Usuario no encontrado.')
    const zona = u.direccion ? zonaDeCp(u.direccion.codigoPostal) : null
    return {
      ...usuarioResumen(u),
      nombrePila: u.nombre,
      apellidos: u.apellidos,
      dni: u.dni,
      telefono: u.telefono,
      direccion: u.direccion ?? null,
      zona: zona?.nombre ?? null,
      altaEn: u.altaEn,
      pedidos: pedidos.filter((p) => p.ciudadanoId === u.id).length,
      zonaPreferida: u.zonaPreferidaId ? zonaPorId(u.zonaPreferidaId)?.nombre : null,
      zonasAsignadas: zonas.filter((z) => Object.values(z.asignaciones).includes(u.id)).map((z) => z.nombre),
      co2EvitadoKg: u.roles.includes('CIUDADANO') ? impactoDe(pedidos.filter((p) => p.ciudadanoId === u.id)).co2EvitadoKg : null,
    }
  },

  /** HU-07.02: mantener actualizada la información de los usuarios */
  editarUsuario(id, { nombre, apellidos, email, telefono, direccion }) {
    const u = buscar(usuarios, id, 'Usuario no encontrado.')
    const fe = {}
    if (!nombre?.trim()) fe.nombre = 'Obligatorio'
    if (!apellidos?.trim()) fe.apellidos = 'Obligatorio'
    const mail = String(email ?? '').trim().toLowerCase()
    if (usuarios.some((x) => x.id !== u.id && x.email === mail)) fe.email = 'Este correo ya está registrado'
    if (u.roles.includes('CIUDADANO')) validarDireccionServidor(direccion, fe)
    if (Object.keys(fe).length) throw mockError(400, 'VALIDATION_ERROR', 'Revisa los campos marcados.', fe)
    Object.assign(u, { nombre: nombre.trim(), apellidos: apellidos.trim(), email: mail, telefono: String(telefono).replace(/\D/g, '').slice(-9) })
    if (u.roles.includes('CIUDADANO')) u.direccion = conGeo(direccion)
    return adminMock.usuario(id)
  },

  actualizarRoles(id, roles) {
    const u = buscar(usuarios, id, 'Usuario no encontrado.')
    const permitidos = ['CIUDADANO', 'RECOLECTOR', 'ADMIN']
    if (!Array.isArray(roles) || roles.length === 0)
      throw mockError(400, 'VALIDATION_ERROR', 'Asigna al menos un rol.', { roles: 'Asigna al menos un rol' })
    if (roles.some((role) => !permitidos.includes(role)) || new Set(roles).size !== roles.length)
      throw mockError(400, 'VALIDATION_ERROR', 'La lista de roles no es válida.', { roles: 'Selecciona roles válidos sin repetir' })

    const quitaAdmin = u.roles.includes('ADMIN') && !roles.includes('ADMIN')
    if (quitaAdmin && u.estado === 'ACTIVA') {
      const adminsActivos = usuarios.filter((usuario) => usuario.estado === 'ACTIVA' && usuario.roles.includes('ADMIN')).length
      if (adminsActivos <= 1)
        throw mockError(409, 'ULTIMO_ADMIN', 'No se puede quitar el rol al último administrador activo.')
    }
    if (quitaAdmin && u.id === loadSession()?.usuario?.id)
      throw mockError(409, 'NO_PERMITIDO', 'No puedes quitarte tu propio rol de administrador.')

    u.roles = [...roles]
    return adminMock.usuario(id)
  },

  cambiarEstadoUsuario(id, estado) {
    const u = buscar(usuarios, id, 'Usuario no encontrado.')
    if (u.id === loadSession()?.usuario?.id) throw mockError(409, 'NO_PERMITIDO', 'No puedes suspender tu propia cuenta.')
    u.estado = estado
    return adminMock.usuario(id)
  },

  crearRecolector({ nombre, apellidos, email, telefono, dni }) {
    const fe = {}
    if (usuarios.some((u) => u.email === email.trim().toLowerCase())) fe.email = 'Este correo ya está registrado'
    if (usuarios.some((u) => u.dni === dni.trim().toUpperCase())) fe.dni = 'Este DNI/NIE ya está registrado'
    if (Object.keys(fe).length) throw mockError(409, 'DUPLICATE_ACCOUNT', 'Ya existe una cuenta con esos datos.', fe)
    const u = {
      id: nextIds.usuario(),
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      email: email.trim().toLowerCase(),
      dni: dni.trim().toUpperCase(),
      telefono: telefono.replace(/\D/g, '').slice(-9),
      roles: ['RECOLECTOR'],
      zonaPreferidaId: null, // la elige él en su primer inicio de sesión
      password: passwordProvisional(),
      debeCambiarPassword: true,
      estado: 'ACTIVA',
      altaEn: new Date().toISOString().slice(0, 10),
    }
    usuarios.push(u)
    // La contraseña provisional solo se devuelve en esta respuesta
    return { ...usuarioResumen(u), passwordProvisional: u.password }
  },

  /** Genera una contraseña provisional nueva (si el usuario la olvidó o no le llegó); deberá cambiarla al entrar */
  restablecerPassword(id) {
    const u = buscar(usuarios, id, 'Usuario no encontrado.')
    u.password = passwordProvisional()
    u.debeCambiarPassword = true
    return { email: u.email, passwordProvisional: u.password }
  },
}
