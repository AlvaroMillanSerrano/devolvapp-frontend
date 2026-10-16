/**
 * "Base de datos" en memoria para el modo mock.
 *
 * Todos los mocks (ciudadano, recolector, admin) leen y escriben aquí, así la demo es coherente:
 * un pedido creado por el ciudadano aparece en la lista del recolector asignado a su zona ese día,
 * una incidencia registrada por el recolector aparece en administración, etc. Se reinicia al recargar.
 */
import { round2, ymd } from './helpers'
import { CODIGOS_POSTALES_MALAGA, geocodificar } from './malaga'

/* ───────────── Parámetros y catálogos ───────────── */

export const PARAMETROS = {
  /** HU-05.02 · modelo económico PROVISIONAL del documento de historias */
  economia: { importePorEnvase: 0.1, porcentajeCiudadano: 0.4, porcentajeEmpresa: 0.6, provisional: true },
  pedidos: { maxBolsas: 5 },
  /** Impacto ambiental: kg de CO2e evitados por envase reciclado (valores ORIENTATIVOS, a validar) */
  impacto: {
    kgCo2PorEnvase: { PET: 0.03, LATA: 0.09, BRIK: 0.02, VIDRIO: 0.04, MEZCLADO: 0.04 },
    kgCo2PorKmCoche: 0.12,
    kgCo2PorArbolAnio: 21,
    orientativo: true,
  },
}

/** HU-02.01 · tipos de envase y capacidad máxima de cada bolsa */
export const TIPOS_ENVASE = [
  { codigo: 'PET', nombre: 'Plástico PET', icono: 'water_bottle', capacidadMaximaBolsa: 100 },
  { codigo: 'LATA', nombre: 'Latas', icono: 'sports_bar', capacidadMaximaBolsa: 120 },
  { codigo: 'BRIK', nombre: 'Briks', icono: 'crop_portrait', capacidadMaximaBolsa: 80 },
  { codigo: 'VIDRIO', nombre: 'Vidrio', icono: 'wine_bar', capacidadMaximaBolsa: 40 },
  { codigo: 'MEZCLADO', nombre: 'Mezclado', icono: 'shopping_bag', capacidadMaximaBolsa: 100 },
]

/** HU-06.01 · tipos de incidencia */
export const TIPOS_INCIDENCIA = [
  { codigo: 'AUSENTE', nombre: 'No hay nadie en el domicilio' },
  { codigo: 'BOLSA_NO_ENCONTRADA', nombre: 'Bolsa no encontrada' },
  { codigo: 'CONTENIDO_NO_COINCIDE', nombre: 'El contenido no coincide' },
  { codigo: 'BOLSA_DANADA', nombre: 'Bolsa rota o en mal estado' },
  { codigo: 'DIRECCION_INCORRECTA', nombre: 'Dirección incorrecta o sin acceso' },
  { codigo: 'OTRO', nombre: 'Otro problema' },
]

export const TIPOS_VIA = ['Calle', 'Avenida', 'Plaza', 'Paseo', 'Camino', 'Carretera', 'Callejón', 'Pasaje', 'Ronda', 'Urbanización', 'Otro']

export { CODIGOS_POSTALES_MALAGA }

/* ───────────── Utilidades ───────────── */

// Aleatorio con semilla: los datos generados son siempre los mismos
let seed = 20251015
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (list) => list[Math.floor(rand() * list.length)]
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1))

/** Fecha "YYYY-MM-DD" a `offset` días de hoy */
export const dia = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return ymd(d)
}
/** ISO de una fecha "YYYY-MM-DD" a una hora concreta */
export const iso = (fecha, hora = '10:00') => new Date(`${fecha}T${hora}:00`).toISOString()
/** 1 = lunes … 7 = domingo */
export const diaSemana = (fecha) => ((new Date(`${fecha}T00:00:00`).getDay() + 6) % 7) + 1

const usados = new Set()
export function codigoBolsa() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do code = `B-${Array.from({ length: 5 }, () => abc[Math.floor(Math.random() * abc.length)]).join('')}`
  while (usados.has(code))
  usados.add(code)
  return code
}

export function calcularLiquidacion(envasesValidos) {
  const { importePorEnvase, porcentajeCiudadano, porcentajeEmpresa } = PARAMETROS.economia
  return {
    envasesValidos,
    importeTotal: round2(envasesValidos * importePorEnvase),
    parteCiudadano: round2(envasesValidos * importePorEnvase * porcentajeCiudadano),
    parteEmpresa: round2(envasesValidos * importePorEnvase * porcentajeEmpresa),
  }
}

/** kg de CO2e evitados por las bolsas verificadas de un pedido */
export const co2DePedido = (p) =>
  p.estado === 'COMPLETADA' ? p.bolsas.reduce((s, b) => s + (b.envasesValidos ?? 0) * PARAMETROS.impacto.kgCo2PorEnvase[b.tipoEnvase], 0) : 0

/** Dirección con coordenadas (el backend las calcula al guardar la dirección) */
export const conGeo = (d) => ({ ...d, ciudad: d.ciudad || 'Málaga', ...geocodificar(d) })

/* ───────────── Usuarios ───────────── */

export const DEMO_PASSWORD = 'demo1234'

/** Contraseña de un usuario en el modo mock (las cuentas demo usan demo1234) */
export const passwordDe = (u) => u.password ?? DEMO_PASSWORD

/** Contraseña provisional legible: 3 letras + 4 números (p. ej. "Kpr-4821") */
export function passwordProvisional() {
  const letras = 'abcdefghjkmnpqrstuvwxyz'
  const l = Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join('')
  return `${l.charAt(0).toUpperCase()}${l.slice(1)}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

const dir = (tipoVia, nombreVia, numero, piso, letra, codigoPostal) => conGeo({ tipoVia, nombreVia, numero, piso, letra, codigoPostal, ciudad: 'Málaga' })

/** `demo: true` → aparece en la lista de cuentas de prueba del login */
export const usuarios = [
  { id: 101, demo: true, nombre: 'Elena', apellidos: 'Gómez Fernández', email: 'ciudadano@devolvup.es', dni: '50123123K', telefono: '644123456', roles: ['CIUDADANO'], direccion: dir('Calle', 'Granada', '12', '3º', 'B', '29005'), estado: 'ACTIVA', altaEn: dia(-200) },
  { id: 419, demo: true, nombre: 'Carlos', apellidos: 'Méndez Rubio', email: 'recolector@devolvup.es', dni: '02889412J', telefono: '611220419', roles: ['RECOLECTOR'], zonaPreferidaId: 1, estado: 'ACTIVA', altaEn: dia(-300) },
  { id: 420, demo: true, nombre: 'Ana', apellidos: 'Torres Vela', email: 'nuevo@devolvup.es', dni: '55667788D', telefono: '611220420', roles: ['RECOLECTOR'], zonaPreferidaId: null, estado: 'ACTIVA', altaEn: dia(-1) },
  { id: 1, demo: true, nombre: 'Marcos', apellidos: 'Valiente', email: 'admin@devolvup.es', dni: '71998210V', telefono: '600000001', roles: ['ADMIN'], estado: 'ACTIVA', altaEn: dia(-400) },
  { id: 7, demo: true, nombre: 'Laura', apellidos: 'Martín Soria', email: 'multirol@devolvup.es', dni: '47555890Q', telefono: '622330007', roles: ['CIUDADANO', 'RECOLECTOR', 'ADMIN'], direccion: dir('Avenida', 'de Andalucía', '22', '5º', 'A', '29002'), zonaPreferidaId: 2, estado: 'ACTIVA', altaEn: dia(-350) },
  { id: 99, demo: true, nombre: 'Sofía', apellidos: 'Alarcón', email: 'suspendida@devolvup.es', dni: '52111304Z', telefono: '633445599', roles: ['CIUDADANO'], direccion: dir('Calle', 'Cuarteles', '5', '1º', '', '29002'), estado: 'SUSPENDIDA', altaEn: dia(-90) },
  { id: 102, nombre: 'Javier', apellidos: 'Ruiz Pardo', email: 'javier.ruiz@correo.es', dni: '11223344B', telefono: '655001102', roles: ['CIUDADANO'], direccion: dir('Calle', 'Victoria', '40', '4º', 'D', '29012'), estado: 'ACTIVA', altaEn: dia(-180) },
  { id: 103, nombre: 'Marta', apellidos: 'López Gil', email: 'marta.lopez@correo.es', dni: '22334455Y', telefono: '655001103', roles: ['CIUDADANO'], direccion: dir('Calle', 'Carretería', '8', '2º', '', '29008'), estado: 'ACTIVA', altaEn: dia(-160) },
  { id: 104, nombre: 'Pablo', apellidos: 'Sanz Ortega', email: 'pablo.sanz@correo.es', dni: '33445566F', telefono: '655001104', roles: ['CIUDADANO'], direccion: dir('Avenida', 'Juan Sebastián Elcano', '100', '3º', 'C', '29017'), estado: 'ACTIVA', altaEn: dia(-150) },
  { id: 105, nombre: 'Lucía', apellidos: 'Navarro Díaz', email: 'lucia.navarro@correo.es', dni: '44556677A', telefono: '655001105', roles: ['CIUDADANO'], direccion: dir('Calle', 'Héroe de Sostoa', '45', '6º', 'B', '29002'), estado: 'ACTIVA', altaEn: dia(-140) },
  { id: 106, nombre: 'Andrés', apellidos: 'Moreno Vidal', email: 'andres.moreno@correo.es', dni: '77889900X', telefono: '655001106', roles: ['CIUDADANO'], direccion: dir('Calle', 'Alcazabilla', '3', '1º', 'A', '29015'), estado: 'ACTIVA', altaEn: dia(-120) },
  { id: 107, nombre: 'Carmen', apellidos: 'Ortiz Ramos', email: 'carmen.ortiz@correo.es', dni: '88990011B', telefono: '655001107', roles: ['CIUDADANO'], direccion: dir('Plaza', 'de la Merced', '9', '2º', 'C', '29012'), estado: 'ACTIVA', altaEn: dia(-110) },
  { id: 421, nombre: 'Diego', apellidos: 'Ramos León', email: 'diego.ramos@devolvup.es', dni: '66778899S', telefono: '611220421', roles: ['RECOLECTOR'], zonaPreferidaId: 3, estado: 'ACTIVA', altaEn: dia(-250) },
]

export const usuarioPorId = (id) => usuarios.find((u) => u.id === Number(id))
export const nombreCompleto = (u) => (u ? `${u.nombre} ${u.apellidos}` : null)

/* ───────────── Zonas, días y franjas (HU-03.01, HU-07.01, HU-07.06) ───────────── */

/** asignaciones: día de la semana (1 = lunes) → id del recolector que recoge ese día en la zona */
export const zonas = [
  { id: 1, nombre: 'Centro', codigosPostales: ['29001', '29005', '29008', '29012', '29015'], asignaciones: { 1: 419, 2: 419, 3: 419, 4: 419, 5: 419, 6: 421 } },
  { id: 2, nombre: 'Este (Malagueta – El Palo)', codigosPostales: ['29016', '29017', '29018'], asignaciones: { 1: 7, 3: 7, 5: 7, 2: 421, 4: 421 } },
  { id: 3, nombre: 'Oeste (Perchel – Huelin)', codigosPostales: ['29002', '29003', '29004', '29006'], asignaciones: { 1: 421, 3: 421, 5: 421, 2: 7, 4: 7 } },
  { id: 4, nombre: 'Norte', codigosPostales: ['29007', '29009', '29011', '29013', '29014'], asignaciones: { 2: 419, 4: 419 } },
  { id: 5, nombre: 'Teatinos', codigosPostales: ['29010'], asignaciones: {} },
]

export const zonaDeCp = (cp) => zonas.find((z) => z.codigosPostales.includes(cp)) ?? null
/**
 * Validación de dirección (lo mismo que hará el backend en PUT /api/perfil y PUT /api/admin/usuarios/{id}).
 * - CP obligatoriamente del catálogo codigo_postal (FK). Si no tiene zona se acepta igual (opción A: se avisa).
 * - Geocodificación: en real, CartoCiudad; si no encuentra la vía o el CP no coincide → "Revisa la calle y el número".
 *   En el mock solo se comprueba el formato del número.
 */
export function validarDireccionServidor(direccion, fe) {
  for (const k of ['tipoVia', 'nombreVia', 'numero', 'codigoPostal', 'ciudad']) if (!String(direccion?.[k] ?? '').trim()) fe[`direccion.${k}`] = 'Obligatorio'
  const cp = String(direccion?.codigoPostal ?? '').trim()
  if (cp && !CODIGOS_POSTALES_MALAGA.some((c) => c.cp === cp)) fe['direccion.codigoPostal'] = 'Elige un código postal de Málaga de la lista'
  const num = String(direccion?.numero ?? '').trim()
  if (num && !/^(\d{1,4}[A-Za-z]?|s\/n)$/i.test(num)) fe['direccion.numero'] = 'Revisa la calle y el número'
  return fe
}

export const zonaPorId = (id) => zonas.find((z) => z.id === Number(id)) ?? null

/** HU-07.06: recolector responsable de una zona en una fecha concreta */
export const recolectorPara = (zona, fecha) => zona?.asignaciones[diaSemana(fecha)] ?? null

let franjaSeq = 1
const franja = (zonaId, dias, horaInicio, horaFin, capacidad) =>
  dias.map((d) => ({ id: franjaSeq++, zonaId, diaSemana: d, horaInicio, horaFin, capacidad }))

export const franjas = [
  ...franja(1, [1, 2, 3, 4, 5, 6], '10:00', '12:00', 6),
  ...franja(1, [1, 2, 3, 4, 5], '12:00', '14:00', 6),
  ...franja(1, [1, 2, 3, 4, 5], '17:00', '19:00', 2),
  ...franja(2, [1, 2, 3, 4, 5], '10:00', '13:00', 5),
  ...franja(2, [2, 4], '17:00', '20:00', 4),
  ...franja(3, [1, 2, 3, 4, 5], '10:00', '12:00', 5),
  ...franja(3, [1, 3, 5], '17:00', '19:00', 4),
  ...franja(4, [2, 4], '10:00', '13:00', 5),
  ...franja(5, [1], '10:00', '12:00', 4),
]

let pedidoSeq = 1001
let bolsaSeq = 1
let incidenciaSeq = 2001
let retiradaSeq = 501
let solicitudSeq = 301

export const nextIds = {
  franja: () => franjaSeq++,
  pedido: () => pedidoSeq++,
  bolsa: () => bolsaSeq++,
  incidencia: () => incidenciaSeq++,
  retirada: () => retiradaSeq++,
  solicitud: () => solicitudSeq++,
  zona: () => Math.max(...zonas.map((z) => z.id)) + 1,
  usuario: () => Math.max(...usuarios.map((u) => u.id)) + 1,
}

/** Franja de la zona para la fecha (o la primera de la zona si ese día no tiene: solo para datos de ejemplo) */
const franjaDe = (zonaId, fecha, hora) => {
  const delDia = franjas.filter((f) => f.zonaId === zonaId && f.diaSemana === diaSemana(fecha))
  const lista = delDia.length ? delDia : franjas.filter((f) => f.zonaId === zonaId)
  return lista.find((f) => f.horaInicio === hora) ?? lista[0]
}

/** Primer día desde `desde` en que la zona tiene franja a esa hora y recolector asignado */
const proximoDia = (zonaId, hora, desde = 1) => {
  const z = zonaPorId(zonaId)
  for (let i = desde; i <= desde + 14; i++) {
    const f = dia(i)
    if (recolectorPara(z, f) && franjas.some((x) => x.zonaId === zonaId && x.horaInicio === hora && x.diaSemana === diaSemana(f))) return f
  }
  return dia(desde)
}
/** Hoy si la zona trabaja hoy; si no, el siguiente día laborable de la zona */
const hoyOProximo = (zonaId, hora) => proximoDia(zonaId, hora, 0)

/* ───────────── Pedidos / recogidas (EP-02, EP-03, EP-04) ───────────── */

export const pedidos = []

/**
 * Un pedido agrupa las bolsas del ciudadano y su recogida (1 pedido = 1 recogida).
 * estado: PENDIENTE → EN_CAMINO → COMPLETADA  |  PENDIENTE → CANCELADA
 */
export function nuevoPedido({ ciudadanoId, fecha, hora, estado = 'PENDIENTE', bolsas, creadoHaceDias = 2 }) {
  const ciudadano = usuarioPorId(ciudadanoId)
  const zona = zonaDeCp(ciudadano.direccion.codigoPostal)
  const fr = franjaDe(zona.id, fecha, hora)
  const id = pedidoSeq++
  const recolectorId = recolectorPara(zona, fecha) ?? Object.values(zona.asignaciones)[0] ?? null
  const p = {
    id,
    codigo: `P-${id}`,
    ciudadanoId,
    zonaId: zona.id,
    recolectorId,
    direccion: { ...ciudadano.direccion },
    fecha,
    franjaId: fr.id,
    horaInicio: fr.horaInicio,
    horaFin: fr.horaFin,
    estado: 'PENDIENTE',
    creadoEn: new Date(new Date(`${fecha}T09:00:00`).getTime() - creadoHaceDias * 86400000).toISOString(),
    iniciadoEn: null,
    completadoEn: null,
    canceladoEn: null,
    bolsas: bolsas.map(([tipoEnvase, cantidad, resultado = null, envasesValidos = null, nota = null]) => ({
      id: bolsaSeq++,
      codigo: codigoBolsa(),
      tipoEnvase,
      cantidad,
      capacidadMaxima: TIPOS_ENVASE.find((t) => t.codigo === tipoEnvase).capacidadMaximaBolsa,
      resultado,
      envasesValidos: resultado === 'ACEPTADA' ? cantidad : envasesValidos,
      nota,
    })),
    liquidacion: null,
  }
  if (estado !== 'PENDIENTE') {
    p.estado = estado
    if (estado === 'CANCELADA') p.canceladoEn = iso(fecha, '08:30')
    if (estado === 'EN_CAMINO' || estado === 'COMPLETADA') p.iniciadoEn = iso(fecha, fr.horaInicio)
    if (estado === 'COMPLETADA') {
      p.completadoEn = iso(fecha, fr.horaInicio.replace(/^(\d+)/, (h) => String(Number(h) + 1).padStart(2, '0')))
      p.bolsas.forEach((b) => {
        if (!b.resultado) {
          b.resultado = 'ACEPTADA'
          b.envasesValidos = b.cantidad
        }
      })
      p.liquidacion = calcularLiquidacion(p.bolsas.reduce((s, b) => s + (b.envasesValidos ?? 0), 0))
    }
  }
  pedidos.push(p)
  return p
}

// Elena (ciudadano demo, zona Centro): un pedido completado al mes durante medio año
;[170, 140, 112, 80, 52, 30].forEach((d, i) =>
  nuevoPedido({ ciudadanoId: 101, fecha: dia(-d), hora: '10:00', estado: 'COMPLETADA', bolsas: [['PET', 60 + i * 5], ['LATA', 40 + i * 4]] }),
)
const pElena1 = nuevoPedido({ ciudadanoId: 101, fecha: dia(-12), hora: '12:00', estado: 'COMPLETADA', bolsas: [['PET', 40], ['LATA', 30]] })
const pElena2 = nuevoPedido({
  ciudadanoId: 101,
  fecha: dia(-5),
  hora: '10:00',
  estado: 'COMPLETADA',
  bolsas: [['PET', 50], ['MEZCLADO', 60, 'DISCREPANCIA', 45, 'Había 15 envases de vidrio no retornable']],
})
nuevoPedido({ ciudadanoId: 101, fecha: dia(-3), hora: '10:00', estado: 'CANCELADA', bolsas: [['BRIK', 25]] })
nuevoPedido({ ciudadanoId: 101, fecha: hoyOProximo(1, '12:00'), hora: '12:00', estado: 'EN_CAMINO', bolsas: [['PET', 35], ['BRIK', 20]] })
nuevoPedido({ ciudadanoId: 101, fecha: proximoDia(1, '17:00'), hora: '17:00', bolsas: [['LATA', 50]], creadoHaceDias: 1 })

// Laura (multirol, zona Oeste)
nuevoPedido({ ciudadanoId: 7, fecha: dia(-10), hora: '10:00', estado: 'COMPLETADA', bolsas: [['PET', 80]] })
nuevoPedido({ ciudadanoId: 7, fecha: proximoDia(3, '10:00', 2), hora: '10:00', bolsas: [['VIDRIO', 30], ['PET', 45]], creadoHaceDias: 1 })

// Recogidas del día en la zona Centro (recolector demo)
const hoyCentro = hoyOProximo(1, '10:00')
nuevoPedido({ ciudadanoId: 102, fecha: hoyCentro, hora: '10:00', bolsas: [['LATA', 80], ['PET', 60]], creadoHaceDias: 2 })
nuevoPedido({ ciudadanoId: 106, fecha: hoyCentro, hora: '10:00', bolsas: [['BRIK', 40]], creadoHaceDias: 2 })
nuevoPedido({ ciudadanoId: 107, fecha: hoyCentro, hora: '12:00', bolsas: [['VIDRIO', 25], ['PET', 30]], creadoHaceDias: 1 })
nuevoPedido({ ciudadanoId: 103, fecha: hoyCentro, hora: '17:00', bolsas: [['MEZCLADO', 70]], creadoHaceDias: 1 })
nuevoPedido({ ciudadanoId: 102, fecha: hoyCentro, hora: '12:00', estado: 'CANCELADA', bolsas: [['BRIK', 30]], creadoHaceDias: 3 })
const pMartaAyer = nuevoPedido({ ciudadanoId: 103, fecha: dia(-1), hora: '17:00', estado: 'EN_CAMINO', bolsas: [['PET', 40]] })
nuevoPedido({ ciudadanoId: 103, fecha: proximoDia(1, '17:00'), hora: '17:00', bolsas: [['PET', 25]], creadoHaceDias: 1 }) // llena la franja 17-19
nuevoPedido({ ciudadanoId: 106, fecha: proximoDia(1, '10:00'), hora: '10:00', bolsas: [['LATA', 40]], creadoHaceDias: 1 })

// Otras zonas
nuevoPedido({ ciudadanoId: 104, fecha: hoyOProximo(2, '10:00'), hora: '10:00', bolsas: [['PET', 55]], creadoHaceDias: 1 })
nuevoPedido({ ciudadanoId: 105, fecha: hoyOProximo(3, '10:00'), hora: '10:00', bolsas: [['LATA', 45], ['BRIK', 30]], creadoHaceDias: 2 })

// Histórico para indicadores e impacto (últimos 6 meses)
const historicos = []
for (let i = 0; i < 110; i++) {
  const estado = rand() < 0.8 ? 'COMPLETADA' : 'CANCELADA'
  const bolsas = Array.from({ length: randInt(1, 3) }, () => {
    const t = pick(TIPOS_ENVASE)
    return [t.codigo, randInt(15, t.capacidadMaximaBolsa)]
  })
  historicos.push(
    nuevoPedido({ ciudadanoId: pick([102, 103, 104, 105, 106, 107]), fecha: dia(-randInt(1, 180)), hora: pick(['10:00', '12:00', '17:00']), estado, bolsas }),
  )
}

/* ───────────── Incidencias (EP-06) ───────────── */

export const incidencias = []

/** estado: ABIERTA → EN_REVISION → RESUELTA */
export function nuevaIncidencia({ pedido, tipo, descripcion, estado = 'ABIERTA', autorId, creadaEn, resolucion = null, bolsaId = null }) {
  const id = incidenciaSeq++
  const fecha = creadaEn ?? new Date().toISOString()
  const autor = nombreCompleto(usuarioPorId(autorId)) ?? 'Recolector'
  const inc = { id, codigo: `INC-${id}`, pedidoId: pedido.id, bolsaId, tipo, descripcion, estado, creadaEn: fecha, resolucion, resueltaEn: null, historial: [{ fecha, autor, accion: 'Incidencia registrada' }] }
  if (estado !== 'ABIERTA') inc.historial.push({ fecha: new Date(new Date(fecha).getTime() + 3 * 3600000).toISOString(), autor: 'Marcos Valiente', accion: 'Estado: En revisión' })
  if (estado === 'RESUELTA') {
    inc.resueltaEn = new Date(new Date(fecha).getTime() + 26 * 3600000).toISOString()
    inc.historial.push({ fecha: inc.resueltaEn, autor: 'Marcos Valiente', accion: 'Resuelta' })
  }
  incidencias.push(inc)
  return inc
}

nuevaIncidencia({
  pedido: pElena2,
  bolsaId: pElena2.bolsas[1].id,
  tipo: 'CONTENIDO_NO_COINCIDE',
  descripcion: 'Bolsa mezclada con 15 envases de vidrio no retornable. Se aceptan 45 de 60.',
  estado: 'RESUELTA',
  autorId: 419,
  creadaEn: pElena2.completadoEn,
  resolucion: 'Revisado: se abonan los 45 envases válidos. El resto se ha descartado.',
})
nuevaIncidencia({ pedido: pMartaAyer, tipo: 'AUSENTE', descripcion: 'Llamé al telefonillo y al teléfono dos veces. Nadie responde.', autorId: 419, creadaEn: iso(dia(-1), '17:25') })
nuevaIncidencia({ pedido: pElena1, tipo: 'BOLSA_DANADA', descripcion: 'La bolsa de latas estaba rota por abajo, se recogió todo igualmente.', estado: 'EN_REVISION', autorId: 419, creadaEn: pElena1.completadoEn })
historicos
  .filter((p) => p.estado === 'COMPLETADA')
  .filter(() => rand() < 0.12)
  .forEach((p) =>
    nuevaIncidencia({
      pedido: p,
      tipo: pick(['BOLSA_DANADA', 'CONTENIDO_NO_COINCIDE', 'DIRECCION_INCORRECTA', 'OTRO']),
      descripcion: 'Incidencia registrada durante la recogida.',
      estado: rand() < 0.85 ? 'RESUELTA' : 'EN_REVISION',
      autorId: p.recolectorId ?? 419,
      creadaEn: p.completadoEn,
      resolucion: 'Revisada y cerrada sin coste para el ciudadano.',
    }),
  )

/* ───────────── Retiradas / transferencias (EP-05) ───────────── */

export const retiradas = []

/** estado: PENDIENTE (por aceptar) → COMPLETADA (pagada) | FALLIDA (rechazada o devuelta por el banco) */
export function nuevaRetirada({ ciudadanoId, importe, iban, estado = 'PENDIENTE', solicitadaEn, referenciaBancaria = null, motivoFallo = null }) {
  const id = retiradaSeq++
  const fecha = solicitadaEn ?? new Date().toISOString()
  const r = { id, codigo: `R-${id}`, ciudadanoId, importe, iban, estado, solicitadaEn: fecha, procesadaEn: null, procesadaPor: null, referenciaBancaria, motivoFallo, historial: [{ fecha, estado: 'PENDIENTE', autor: 'Ciudadano' }] }
  if (estado !== 'PENDIENTE') {
    r.procesadaEn = new Date(new Date(fecha).getTime() + 30 * 3600000).toISOString()
    r.procesadaPor = 'Marcos Valiente'
    r.historial.push({ fecha: r.procesadaEn, estado, autor: r.procesadaPor })
  }
  retiradas.push(r)
  return r
}

nuevaRetirada({ ciudadanoId: 101, importe: 10, iban: 'ES9121000418450200051332', estado: 'COMPLETADA', solicitadaEn: iso(dia(-100), '20:10'), referenciaBancaria: 'TRF-88210012' })
nuevaRetirada({ ciudadanoId: 101, importe: 8, iban: 'ES9121000418450200051332', estado: 'COMPLETADA', solicitadaEn: iso(dia(-25), '20:10'), referenciaBancaria: 'TRF-88213045' })
nuevaRetirada({ ciudadanoId: 101, importe: 2, iban: 'ES0000000000000000000000', estado: 'FALLIDA', solicitadaEn: iso(dia(-8), '11:40'), motivoFallo: 'El banco ha rechazado la cuenta indicada.' })
nuevaRetirada({ ciudadanoId: 7, importe: 3.2, iban: 'ES7620770024003102575766', solicitadaEn: iso(dia(-1), '19:05') })
nuevaRetirada({ ciudadanoId: 102, importe: 12.5, iban: 'ES6000491500051234567892', solicitadaEn: iso(dia(-2), '09:30') })
nuevaRetirada({ ciudadanoId: 103, importe: 8.4, iban: 'ES1720852066623456789011', estado: 'COMPLETADA', solicitadaEn: iso(dia(-6), '18:00'), referenciaBancaria: 'TRF-88213311' })
nuevaRetirada({ ciudadanoId: 104, importe: 5, iban: 'ES1000492352082414205416', estado: 'FALLIDA', solicitadaEn: iso(dia(-4), '13:15'), motivoFallo: 'IBAN no válido en el banco de destino.' })
nuevaRetirada({ ciudadanoId: 105, importe: 4.6, iban: 'ES4814650100722030876293', solicitadaEn: iso(dia(0), '08:45') })
nuevaRetirada({ ciudadanoId: 106, importe: 6.75, iban: 'ES9000246912501234567891', solicitadaEn: iso(dia(-1), '22:10') })

/** Saldo disponible = abonos de pedidos completados − retiradas no fallidas (HU-05.01) */
export function saldoDe(ciudadanoId) {
  const abonos = pedidos.filter((p) => p.ciudadanoId === ciudadanoId && p.liquidacion).reduce((s, p) => s + p.liquidacion.parteCiudadano, 0)
  const retirado = retiradas.filter((r) => r.ciudadanoId === ciudadanoId && r.estado !== 'FALLIDA').reduce((s, r) => s + r.importe, 0)
  return round2(abonos - retirado)
}

/* ───────────── Solicitudes de cambio de zona del recolector ───────────── */

export const solicitudesZona = []

/** estado: PENDIENTE → APROBADA | RECHAZADA */
export function nuevaSolicitudZona({ recolectorId, zonaSolicitadaId, motivo, creadaEn }) {
  const r = usuarioPorId(recolectorId)
  const s = {
    id: solicitudSeq++,
    recolectorId,
    zonaActualId: r.zonaPreferidaId,
    zonaSolicitadaId,
    motivo,
    estado: 'PENDIENTE',
    creadaEn: creadaEn ?? new Date().toISOString(),
    resueltaEn: null,
    resueltaPor: null,
    respuesta: null,
  }
  solicitudesZona.push(s)
  return s
}

nuevaSolicitudZona({ recolectorId: 421, zonaSolicitadaId: 5, motivo: 'Me he mudado a Teatinos y me pilla mucho más cerca.', creadaEn: iso(dia(-2), '18:30') })

/* ───────────── Impacto ambiental ───────────── */

/** Resumen de CO2 de un conjunto de pedidos: total, por tipo de envase y por mes (últimos 6) */
export function impactoDe(lista) {
  const completados = lista.filter((p) => p.estado === 'COMPLETADA')
  const porTipo = Object.fromEntries(TIPOS_ENVASE.map((t) => [t.codigo, { tipoEnvase: t.codigo, envases: 0, co2Kg: 0 }]))
  completados.forEach((p) =>
    p.bolsas.forEach((b) => {
      porTipo[b.tipoEnvase].envases += b.envasesValidos ?? 0
      porTipo[b.tipoEnvase].co2Kg += (b.envasesValidos ?? 0) * PARAMETROS.impacto.kgCo2PorEnvase[b.tipoEnvase]
    }),
  )
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    return ymd(d).slice(0, 7)
  })
  const porMes = meses.map((mes) => ({
    mes,
    co2Kg: round2(completados.filter((p) => p.completadoEn.slice(0, 7) === mes).reduce((s, p) => s + co2DePedido(p), 0)),
  }))
  return {
    co2EvitadoKg: round2(completados.reduce((s, p) => s + co2DePedido(p), 0)),
    envasesReciclados: completados.reduce((s, p) => s + p.bolsas.reduce((t, b) => t + (b.envasesValidos ?? 0), 0), 0),
    recogidas: completados.length,
    porTipo: Object.values(porTipo).map((t) => ({ ...t, co2Kg: round2(t.co2Kg) })),
    porMes,
  }
}

/* ───────────── Persistencia del modo mock ─────────────
 * Los cambios se guardan en localStorage para que sobrevivan a una recarga (p. ej. un recolector dado de alta
 * puede iniciar sesión después). «Reiniciar datos» en el aviso de modo mock vuelve a los datos de ejemplo.
 */
const STORAGE_KEY = 'devolvup.mockdb.v2'
const COLECCIONES = { usuarios, zonas, franjas, pedidos, incidencias, retiradas, solicitudesZona }

export function guardarEstado() {
  try {
    const seqs = { franjaSeq, pedidoSeq, bolsaSeq, incidenciaSeq, retiradaSeq, solicitudSeq }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ colecciones: COLECCIONES, seqs }))
  } catch {
    /* sin almacenamiento: los cambios duran hasta recargar */
  }
}

export function reiniciarDatos() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nada que borrar */
  }
}

;(function restaurar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const { colecciones, seqs } = JSON.parse(raw)
    for (const [k, lista] of Object.entries(COLECCIONES)) if (Array.isArray(colecciones?.[k])) lista.splice(0, lista.length, ...colecciones[k])
    ;({ franjaSeq, pedidoSeq, bolsaSeq, incidenciaSeq, retiradaSeq, solicitudSeq } = seqs)
    pedidos.forEach((p) => p.bolsas.forEach((b) => usados.add(b.codigo)))
  } catch {
    /* datos guardados corruptos: se usan los de ejemplo */
  }
})()
