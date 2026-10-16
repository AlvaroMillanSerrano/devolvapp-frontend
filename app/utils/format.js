const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const num = new Intl.NumberFormat('es-ES')

/** 38.4 -> "38,40 €" */
export const formatEUR = (value) => (value == null || Number.isNaN(Number(value)) ? '—' : eur.format(Number(value)))

/** 2.75 -> "+2,75 €" (los negativos ya llevan su signo) */
export const formatSignedEUR = (value) => (Number(value) > 0 ? `+${formatEUR(value)}` : formatEUR(value))

/** 1482910 -> "1.482.910" */
export const formatNumber = (value, options) =>
  value == null ? '—' : options ? new Intl.NumberFormat('es-ES', options).format(value) : num.format(value)

/** 0.25 -> "25%" · 0.982 -> "98,2%" */
export const formatPct = (ratio, decimals = 0) =>
  ratio == null
    ? '—'
    : new Intl.NumberFormat('es-ES', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
        .format(ratio)
        .replace(/\s%/, '%') // "25 %" -> "25%"

/** Acepta Date, ISO con hora o "YYYY-MM-DD" (este último como fecha LOCAL, no UTC). */
export const parseLocalDate = (value) =>
  value instanceof Date ? value : typeof value === 'string' && value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value)

const toDate = parseLocalDate

/** Date -> "2025-10-02" (fecha local) */
export const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Mes abreviado: "oct", "sep" (es-ES devuelve "sept") */
const shortMonth = (d) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').replace(/^sept$/, 'sep')

/** "18 Oct 2024" */
export const formatDate = (value) => {
  if (!value) return '—'
  const d = toDate(value)
  const month = shortMonth(d)
  return `${String(d.getDate()).padStart(2, '0')} ${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.getFullYear()}`
}

/** "14:32" */
export const formatTime = (value) =>
  value ? toDate(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'

/** "14:32:10" */
export const formatTimeSeconds = (value) =>
  value ? toDate(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'

/** "15/10 14:02:18" */
export const formatShortDateTime = (value) => {
  if (!value) return '—'
  const d = toDate(value)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${formatTimeSeconds(d)}`
}

/** "jueves" */
export const weekday = (value) => toDate(value).toLocaleDateString('es-ES', { weekday: 'long' })

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Diferencia en días naturales respecto a hoy (0 = hoy, -1 = ayer, 1 = mañana). */
export const dayDiff = (value) => Math.round((startOfDay(toDate(value)) - startOfDay(new Date())) / 86400000)

/** "Hoy", "Ayer", "Mañana" o "Jueves 24 Oct" */
export const formatRelativeDay = (value) => {
  if (!value) return '—'
  const diff = dayDiff(value)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  const d = toDate(value)
  return `${capitalize(weekday(d))} ${d.getDate()} ${capitalize(shortMonth(d))}`
}

/** "Ayer 18:20" */
export const formatRelativeDateTime = (value) => (value ? `${formatRelativeDay(value)} ${formatTime(value)}` : '—')

/** "24 de Octubre, 2025" */
export const formatLongDate = (value) => {
  if (!value) return '—'
  const d = toDate(value)
  return `${d.getDate()} de ${capitalize(d.toLocaleDateString('es-ES', { month: 'long' }))}, ${d.getFullYear()}`
}

/** "Octubre 2025" */
export const formatMonthYear = (year, monthIndex) =>
  capitalize(new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(' de ', ' '))

/** "hace 3h 12m" a partir de una fecha ISO */
export const formatAgo = (value) => {
  if (!value) return '—'
  const mins = Math.max(0, Math.round((Date.now() - toDate(value).getTime()) / 60000))
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 48) return `hace ${h}h ${String(mins % 60).padStart(2, '0')}m`
  return `hace ${Math.floor(h / 24)} días`
}

/** "ES91 2100 0418 4502 0005 1332" -> "ES91 2100 **** **** 1332" */
export const maskIban = (iban) => {
  const clean = String(iban ?? '').replace(/\s/g, '')
  if (clean.length < 12) return iban
  return `${clean.slice(0, 4)} ${clean.slice(4, 8)} **** **** ${clean.slice(-4)}`
}

/** Iniciales para avatares: "Carlos Méndez" -> "CM" */
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

/** Duración mm:ss desde una fecha ISO hasta ahora */
export const elapsedMMSS = (fromIso) => {
  const secs = Math.max(0, Math.floor((Date.now() - toDate(fromIso).getTime()) / 1000))
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
}

/**
 * { tipoVia, nombreVia, numero, piso, letra, codigoPostal, ciudad } -> "Calle Granada, 12, 3º B · 29005 Málaga"
 * (acepta también el formato antiguo { calle, numero, ... })
 */
export const formatDireccion = (d, { conCiudad = true } = {}) => {
  if (!d) return '—'
  const via = d.nombreVia ? `${d.tipoVia ?? ''} ${d.nombreVia}`.trim() : d.calle
  const piso = [d.piso, d.letra].filter(Boolean).join(' ')
  const linea = [via, d.numero, piso].filter(Boolean).join(', ')
  return conCiudad ? `${linea} · ${d.codigoPostal ?? ''} ${d.ciudad ?? ''}`.trim() : linea
}

/** 12.345 kg -> "12,3 kg" · 1534 kg -> "1,53 t" */
export const formatCo2 = (kg) => {
  if (kg == null) return '—'
  if (kg >= 1000) return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(kg / 1000)} t`
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: kg < 10 ? 2 : 1 }).format(kg)} kg`
}

/** "2026-05" -> "may" */
export const formatMesCorto = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').replace(/^sept$/, 'sep')

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** "10:00 – 12:00" */
export const formatFranja = (inicio, fin) => `${inicio} – ${fin}`
