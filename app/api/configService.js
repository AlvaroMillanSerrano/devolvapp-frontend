import api from './client'
import { mockable, unwrap } from './mock'
import { CODIGOS_POSTALES_MALAGA, PARAMETROS, TIPOS_ENVASE, TIPOS_INCIDENCIA, zonaDeCp } from '../mocks/db'

/** Configuración y catálogos compartidos por varias vistas (cacheables). */
export const configService = {
  /**
   * HU-05.02 · GET /api/config/parametros
   * { economia: { importePorEnvase, porcentajeCiudadano, porcentajeEmpresa, provisional }, pedidos: { maxBolsas },
   * impacto: { kgCo2PorEnvase: { PET, LATA, ... }, kgCo2PorKmCoche, kgCo2PorArbolAnio } }
   */
  getParametros: mockable(() => api.get('/config/parametros').then(unwrap), () => PARAMETROS),

  /**
   * HU-02.01 · GET /api/catalogo/tipos-envase
   * [{ codigo: 'PET'|'LATA'|'BRIK'|'VIDRIO'|'MEZCLADO', nombre, icono, capacidadMaximaBolsa }]
   */
  getTiposEnvase: mockable(() => api.get('/catalogo/tipos-envase').then(unwrap), () => TIPOS_ENVASE),

  /** HU-06.01 · GET /api/catalogo/tipos-incidencia  [{ codigo, nombre }] */
  getTiposIncidencia: mockable(() => api.get('/catalogo/tipos-incidencia').then(unwrap), () => TIPOS_INCIDENCIA),

  /** HU-07.06 · GET /api/catalogo/codigos-postales · CP del municipio de Málaga [{ cp, barrio, lat, lng, conServicio }] */
  getCodigosPostales: mockable(() => api.get('/catalogo/codigos-postales').then(unwrap), () => CODIGOS_POSTALES_MALAGA.map((c) => ({ ...c, conServicio: !!zonaDeCp(c.cp) }))),
}
