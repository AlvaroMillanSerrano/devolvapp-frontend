export function usuarioAForm(usuario, fallback = {}) {
  return {
    nombre: usuario?.nombrePila ?? fallback.nombre ?? '',
    apellidos: usuario?.apellidos ?? fallback.apellidos ?? '',
    email: usuario?.email ?? fallback.email ?? '',
    telefono: usuario?.telefono ?? fallback.telefono ?? '',
  }
}

export function combinarUsuario(actual, actualizado) {
  if (!actualizado || typeof actualizado !== 'object' || Array.isArray(actualizado)) return actual

  return {
    ...actual,
    ...actualizado,
    direccion: actual.direccion || actualizado.direccion
      ? { ...actual.direccion, ...actualizado.direccion }
      : actualizado.direccion,
  }
}
