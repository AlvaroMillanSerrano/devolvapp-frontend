/** Fecha ISO relativa a hoy: at(-1, 18, 20) = ayer a las 18:20 */
export function at(dayOffset = 0, hours = 0, minutes = 0, seconds = 0) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hours, minutes, seconds, 0)
  return d.toISOString()
}

/** Fecha ISO relativa a ahora en minutos: minutesAgo(192) */
export const minutesAgo = (mins) => new Date(Date.now() - mins * 60000).toISOString()

/** "2025-10-02" para una fecha local */
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const round2 = (n) => Math.round(n * 100) / 100
