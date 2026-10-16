import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Carga datos del servidor para una ZONA DINÁMICA.
 *
 *   const resumen = useApi(() => ciudadanoService.getResumen(), [])
 *   resumen.data | resumen.loading | resumen.error | resumen.reload() | resumen.setData(fn)
 *
 * `deps` funciona como en useEffect: cuando cambian (filtros, página, periodo…) se recarga.
 * Si llegan respuestas fuera de orden, solo se aplica la última.
 */
export function useApi(fetcher, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: immediate, error: null })
  const fetcherRef = useRef(fetcher)
  const requestId = useRef(0)

  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const reload = useCallback(async () => {
    const id = ++requestId.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetcherRef.current()
      if (id === requestId.current) setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error }))
      return undefined
    }
  }, [])

  useEffect(() => {
    if (immediate) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  )

  return { ...state, reload, setData }
}

/**
 * Ejecuta una ACCIÓN contra el servidor (POST/PUT/PATCH/DELETE) con estado de carga/error.
 *
 *   const [solicitar, { loading, error }] = useAction(monederoService.solicitarRetirada)
 *   await solicitar({ importe, iban })
 */
export function useAction(action) {
  const [state, setState] = useState({ loading: false, error: null })
  const actionRef = useRef(action)

  useEffect(() => {
    actionRef.current = action
  })

  const run = useCallback(async (...args) => {
    setState({ loading: true, error: null })
    try {
      const result = await actionRef.current(...args)
      setState({ loading: false, error: null })
      return result
    } catch (error) {
      setState({ loading: false, error })
      throw error
    }
  }, [])

  const reset = useCallback(() => setState({ loading: false, error: null }), [])

  return [run, { ...state, reset }]
}
