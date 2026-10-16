/**
 * Roles de la aplicación. En Spring Security llegan como authorities con prefijo "ROLE_"
 * (ROLE_CIUDADANO, ROLE_RECOLECTOR, ROLE_ADMIN); en el front se normalizan sin prefijo.
 */
export const ROLES = Object.freeze({
  CIUDADANO: 'CIUDADANO',
  RECOLECTOR: 'RECOLECTOR',
  ADMIN: 'ADMIN',
})

export const ROLE_META = {
  [ROLES.CIUDADANO]: {
    label: 'Ciudadano',
    descripcion: 'Pide que recojan tus envases en casa y cobra por ellos.',
    icon: 'person',
    home: '/ciudadano',
  },
  [ROLES.RECOLECTOR]: {
    label: 'Recolector',
    descripcion: 'Tus recogidas del día: ve, verifica las bolsas y listo.',
    icon: 'two_wheeler',
    home: '/recolector',
  },
  [ROLES.ADMIN]: {
    label: 'Administración',
    descripcion: 'Zonas, franjas horarias, usuarios, pagos, incidencias e indicadores.',
    icon: 'admin_panel_settings',
    home: '/admin',
  },
}

/** Orden de preferencia cuando hay que elegir un rol por defecto. */
export const ROLE_PRIORITY = [ROLES.ADMIN, ROLES.RECOLECTOR, ROLES.CIUDADANO]

export const normalizeRole = (role) => String(role).replace(/^ROLE_/, '').toUpperCase()

export const normalizeRoles = (roles = []) =>
  [...new Set(roles.map(normalizeRole))].filter((r) => Object.values(ROLES).includes(r))

export const homeForRole = (role) => ROLE_META[role]?.home ?? '/login'
