/**
 * VISTA: Recogidas (todas)
 * Ruta: /admin/recogidas   Rol: ADMIN
 * HU: HU-04.04 (resultados por bolsa e incidencias de cada recogida), HU-03.03 (cancelación autorizada), HU-07.06 (recolector responsable)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Lista filtrable (fecha, estado, zona, texto) ... GET /api/admin/recogidas?fecha=&estado=&zonaId=&q=&page=
 *  [Z2] Detalle con bolsas, liquidación e incidencias .. GET /api/admin/recogidas/{id}
 *  [Z3] Zonas (filtro) y recolectores (reasignar) ...... GET /api/admin/zonas · GET /api/admin/recolectores
 *
 * ACCIONES
 *  [A1] Reasignar recolector ........................... PUT  /api/admin/recogidas/{id}/recolector
 *  [A2] Cancelar recogida .............................. POST /api/admin/recogidas/{id}/cancelar
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApi, useAction } from '../../hooks/useApi'
import { useTiposEnvase } from '../../hooks/useParametros'
import { adminService } from '../../api/adminService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import Paginacion from '../../components/ui/Paginacion'
import { useToast } from '../../components/ui/toastContext'
import { formatDireccion, formatEUR, formatFranja, formatRelativeDateTime, formatRelativeDay, toYmd } from '../../utils/format'

const ESTADOS = [
  ['', 'Todas'],
  ['PENDIENTE', 'Pendientes'],
  ['EN_CAMINO', 'En camino'],
  ['COMPLETADA', 'Completadas'],
  ['CANCELADA', 'Canceladas'],
  ['ATRASADAS', 'Atrasadas'],
  ['SIN_RECOLECTOR', 'Sin recolector'],
]

export default function RecogidasAdminPage() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? ''
  const [fecha, setFecha] = useState('')
  const [zonaId, setZonaId] = useState('')
  const [q, setQ] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(0)
  const [abierta, setAbierta] = useState(null)
  const zonas = useApi(() => adminService.getZonas(), [])
  const lista = useApi(
    () => adminService.getRecogidas({ estado: estado || undefined, fecha: fecha || undefined, zonaId: zonaId || undefined, q: busqueda || undefined, page, size: 12 }),
    [estado, fecha, zonaId, busqueda, page],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(q.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Recogidas</h1>

      <div className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline" />
          <input className="input !pl-10" placeholder="Código, ciudadano o calle" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <input type="date" className="input lg:!w-44" value={fecha} onChange={(e) => (setFecha(e.target.value), setPage(0))} />
        {/* ⚡ ZONA DINÁMICA Z3 — GET /api/admin/zonas */}
        <select data-dyn="Z3 · GET /admin/zonas" className="input lg:!w-56" value={zonaId} onChange={(e) => (setZonaId(e.target.value), setPage(0))}>
          <option value="">Todas las zonas</option>
          {zonas.data?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={() => (setFecha(toYmd(new Date())), setPage(0))}>
          Hoy
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {ESTADOS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            className={`chip shrink-0 ${estado === v ? 'chip-active' : ''}`}
            onClick={() => {
              setParams(v ? { estado: v } : {})
              setPage(0)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/recogidas */}
      <div data-dyn="Z1 · GET /admin/recogidas" className="card !p-0 overflow-hidden">
        <Async state={lista} fallback={<Skeleton className="h-96" />}>
          {(p) =>
            p.content.length ? (
              <>
                <div className="hidden lg:grid grid-cols-[110px_1fr_160px_170px_120px] gap-3 px-4 py-2 text-xs font-semibold text-on-surface-variant border-b border-surface-container">
                  <span>Fecha</span>
                  <span>Dirección y ciudadano</span>
                  <span>Zona</span>
                  <span>Recolector</span>
                  <span>Estado</span>
                </div>
                {p.content.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAbierta(r.id)}
                    className="w-full text-left px-4 py-3 grid grid-cols-[1fr_auto] lg:grid-cols-[110px_1fr_160px_170px_120px] gap-x-3 gap-y-1 items-center hover:bg-surface-container-low border-b border-surface-container last:border-0 text-sm"
                  >
                    <span className="order-2 lg:order-none text-on-surface-variant lg:text-on-surface">
                      {formatRelativeDay(r.fecha)}
                      <span className="block text-xs text-on-surface-variant">{formatFranja(r.horaInicio != null ? r.horaInicio.slice(0, 5) : "Sin hora" , r.horaFin != null ? r.horaFin.slice(0, 5) : "Sin hora")}</span>
                    </span>
                    <span className="min-w-0 col-span-2 lg:col-span-1 order-1 lg:order-none">
                      <span className="block font-semibold truncate">{formatDireccion(r.direccion, { conCiudad: false })}</span>
                      <span className="block text-xs text-on-surface-variant truncate">
                        {r.codigo} · {r.ciudadano} · {r.numBolsas} {r.numBolsas === 1 ? 'bolsa' : 'bolsas'}
                        {r.tieneIncidencias && <Icon name="report" className="text-[14px] text-error align-[-2px] ml-1" />}
                      </span>
                    </span>
                    <span className="hidden lg:block truncate">{r.zona}</span>
                    <span className={`hidden lg:block truncate ${r.recolector ? '' : 'text-error font-semibold'}`}>{r.recolector?.nombre ?? 'Sin asignar'}</span>
                    <span className="order-3 lg:order-none justify-self-end lg:justify-self-start">
                      <Estado estado={r.estado} />
                    </span>
                  </button>
                ))}
                <Paginacion page={p} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon="local_shipping" title="No hay recogidas con estos filtros" className="!rounded-none" />
            )
          }
        </Async>
      </div>

      {abierta && <DetalleRecogida id={abierta} onClose={() => setAbierta(null)} onChanged={lista.reload} />}
    </div>
  )
}

function DetalleRecogida({ id, onClose, onChanged }) {
  const toast = useToast()
  const r = useApi(() => adminService.getRecogida(id), [id])
  const recolectores = useApi(() => adminService.getRecolectores(), [])
  const tipos = useTiposEnvase()
  const [reasignar, reasignarState] = useAction(adminService.reasignarRecogida)
  const [cancelar, cancelarState] = useAction(adminService.cancelarRecogida)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const nombreTipo = (c) => tipos.data?.find((t) => t.codigo === c)?.nombre ?? c

  const accion = async (fn, msg) => {
    try {
      r.setData(await fn())
      toast(msg)
      onChanged()
    } catch {
      /* error debajo */
    }
  }

  return (
    <Modal open onClose={onClose} title={r.data ? `Recogida ${r.data.codigo}` : 'Recogida'} panelClassName="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl p-5 shadow-xl max-h-[92vh] overflow-y-auto">
      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/recogidas/{id} */}
      <div data-dyn="Z2 · GET /admin/recogidas/{id}">
        <Async state={r} fallback={<Skeleton className="h-96" />}>
          {(x) => {
            const abierta = x.estado === 'PENDIENTE' || x.estado === 'EN_CAMINO'
            const zona = typeof x.zona === 'string' ? x.zona : x.zona?.nombre ?? 'sin asignar'
            const ciudadano = typeof x.ciudadano === 'string' ? x.ciudadano : x.ciudadano?.nombre ?? '—'
            return (
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">
                      {formatRelativeDay(x.fecha)}, {formatFranja(x.horaInicio.slice(0, 5), x.horaFin.slice(0, 5))}
                    </p>
                    <p>{formatDireccion(x.direccion)}</p>
                    <p className="text-on-surface-variant">
                      Zona {zona} · ciudadano {ciudadano}
                    </p>
                  </div>
                  <Estado estado={x.estado} />
                </div>

                <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    ['Pedido', x.creadoEn],
                    ['Iniciada', x.iniciadoEn],
                    ['Completada', x.completadoEn],
                    ['Cancelada', x.canceladoEn],
                  ].map(([l, f]) => (
                    <li key={l} className={`rounded-xl p-2 ${f ? 'bg-surface-container-low' : 'bg-surface-container-low/40 text-outline'}`}>
                      <span className="block font-semibold">{l}</span>
                      {f ? formatRelativeDateTime(f) : '—'}
                    </li>
                  ))}
                </ol>

                {/* ⚡ ACCIÓN A1 — PUT /api/admin/recogidas/{id}/recolector */}
                <label className="flex flex-col gap-1">
                  <span className="label">Recolector</span>
                  <select
                    className="input"
                    disabled={!abierta || reasignarState.loading}
                    value={x.recolector?.id ?? ''}
                    onChange={(e) => accion(() => reasignar(x.id, e.target.value ? Number(e.target.value) : null), 'Recogida reasignada')}
                  >
                    <option value="">— Sin asignar —</option>
                    {recolectores.data?.map((rc) => (
                      <option key={rc.id} value={rc.id}>
                        {rc.nombre}
                      </option>
                    ))}
                  </select>
                  {reasignarState.error && <Alert>{reasignarState.error.message}</Alert>}
                </label>

                <section className="flex flex-col gap-1">
                  <h3 className="font-bold">Bolsas</h3>
                  {x.bolsas.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 bg-surface-container-low">
                      <span>
                        <span className="font-mono font-semibold">{b.codigo}</span> · {nombreTipo(b.tipoEnvase)} · {b.cantidad} declarados
                        {b.resultado && ` · ${b.envasesValidos} válidos`}
                        {b.nota && <span className="block text-xs text-on-surface-variant">{b.nota}</span>}
                      </span>
                      {b.resultado && <Estado estado={b.resultado} />}
                    </div>
                  ))}
                </section>

                {x.liquidacion && (
                  <p className="rounded-xl bg-secondary-container/40 p-3">
                    {x.liquidacion.envasesValidos} envases válidos · {formatEUR(x.liquidacion.importeTotal)} ({formatEUR(x.liquidacion.parteCiudadano)} ciudadano ·{' '}
                    {formatEUR(x.liquidacion.parteEmpresa)} empresa)
                  </p>
                )}

                {x.incidencias.length > 0 && (
                  <section className="flex flex-col gap-1">
                    <h3 className="font-bold">Incidencias</h3>
                    {x.incidencias.map((i) => (
                      <Link key={i.id} to={`/admin/incidencias?abrir=${i.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 bg-surface-container-low hover:bg-surface-container">
                        <span>
                          {i.codigo} · {i.tipoNombre}
                        </span>
                        <Estado estado={i.estado} />
                      </Link>
                    ))}
                  </section>
                )}

                {abierta &&
                  (confirmarCancelar ? (
                    // ⚡ ACCIÓN A2 — POST /api/admin/recogidas/{id}/cancelar
                    <div className="rounded-2xl bg-error-container/40 p-3 flex flex-col gap-2">
                      <p>¿Cancelar esta recogida? El ciudadano la verá como cancelada.</p>
                      {cancelarState.error && <Alert>{cancelarState.error.message}</Alert>}
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmarCancelar(false)}>
                          Volver
                        </button>
                        <button type="button" className="btn btn-danger flex-1" disabled={cancelarState.loading} onClick={() => accion(() => cancelar(x.id), 'Recogida cancelada')}>
                          {cancelarState.loading && <Spinner />} Cancelar recogida
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-danger self-start" onClick={() => setConfirmarCancelar(true)}>
                      <Icon name="cancel" className="text-[18px]" /> Cancelar recogida
                    </button>
                  ))}
              </div>
            )
          }}
        </Async>
      </div>
    </Modal>
  )
}
