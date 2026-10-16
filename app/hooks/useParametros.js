import { useApi } from './useApi'
import { configService } from '../api/configService'

/** Pide un catálogo una sola vez por sesión de navegador (caché a nivel de módulo). */
function cached(fetcher) {
  let cache = null
  return () =>
    (cache ??= fetcher().catch((e) => {
      cache = null
      throw e
    }))
}

const loadParametros = cached(configService.getParametros)
const loadTiposEnvase = cached(configService.getTiposEnvase)
const loadTiposIncidencia = cached(configService.getTiposIncidencia)

/** GET /api/config/parametros · modelo económico y límites de pedido */
export const useParametros = () => useApi(loadParametros, [])

/** GET /api/catalogo/tipos-envase */
export const useTiposEnvase = () => useApi(loadTiposEnvase, [])

/** GET /api/catalogo/tipos-incidencia */
export const useTiposIncidencia = () => useApi(loadTiposIncidencia, [])
