export function contarBolsasSinVerificar(bolsas) {
  if (!Array.isArray(bolsas)) {
    throw new TypeError('La respuesta de recogida debe incluir bolsas como una lista')
  }

  return bolsas.filter((bolsa) => !bolsa.resultado).length
}

export function obtenerNombreCiudadano(ciudadano) {
  if (typeof ciudadano === 'string') return ciudadano
  if (ciudadano && typeof ciudadano.nombre === 'string') return ciudadano.nombre
  return '—'
}
