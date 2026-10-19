export const TIPOS_VIA = ['Calle', 'Avenida', 'Plaza', 'Paseo', 'Camino', 'Carretera', 'Callejón', 'Pasaje', 'Ronda', 'Urbanización', 'Otro']

export const DIRECCION_VACIA = { tipoVia: 'Calle', nombreVia: '', numero: '', piso: '', letra: '', codigoPostal: '', ciudad: 'Málaga' }

/** Dirección del servidor → valores del formulario (sin lat/lng y sin nulos) */
export const direccionAForm = (d) =>
  d ? Object.fromEntries(Object.keys(DIRECCION_VACIA).map((k) => [k, d[k] ?? DIRECCION_VACIA[k] ?? ''])) : { ...DIRECCION_VACIA }

/** Validación de cliente (solo UX: el backend la repite) */
export function validarDireccion(d, { codigoPostalOpcional = false } = {}) {
  const e = {}
  if (!d.tipoVia) e.tipoVia = 'Obligatorio'
  if (!d.nombreVia.trim()) e.nombreVia = 'Falta el nombre de la vía'
  if (!d.numero.trim()) e.numero = 'Falta el número'
  if ((!codigoPostalOpcional || d.codigoPostal.trim()) && !/^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(d.codigoPostal.trim())) e.codigoPostal = 'Código postal no válido'
  if (!d.ciudad.trim()) e.ciudad = 'Falta la ciudad'
  return e
}

/** fieldErrors del backend con prefijo "direccion." → claves del formulario de dirección */
export const erroresDireccion = (fe = {}) =>
  Object.fromEntries(Object.entries(fe).filter(([k]) => k.startsWith('direccion.')).map(([k, v]) => [k.slice(10), v]))

/** Limpia espacios antes de enviar */
export const limpiarDireccion = (d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v ?? '').trim()]))
