/**
 * VISTA: Incidencias
 * Ruta: /admin/incidencias   Rol: ADMIN
 * HU: HU-06.02 (consultar y filtrar), HU-06.03 (resolver con trazabilidad), HU-04.04 (resultados por bolsa de la recogida), HU-03.03 (cancelación autorizada de la recogida)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Lista de incidencias (filtro por tipo y estado) ... GET /api/admin/incidencias?tipo=&estado=&page=
 *  [Z2] Detalle, recogida asociada e historial ............ GET /api/admin/incidencias/{id}
 *  [Z3] Tipos de incidencia (filtro) ...................... GET /api/catalogo/tipos-incidencia
 *
 * ACCIONES
 *  [A1] Cambiar estado / registrar resolución ............. PATCH /api/admin/incidencias/{id}
 *  [A2] Cancelar la recogida asociada ..................... POST  /api/admin/recogidas/{id}/cancelar
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi, useAction } from '../../hooks/useApi'
import { useTiposEnvase, useTiposIncidencia } from '../../hooks/useParametros'
import { adminService } from '../../api/adminService'
import Async, { EmptyState, ErrorState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { estadoLabel } from '../../components/ui/estados'
import { Alert, Spinner } from '../../components/ui/FormField'
import Modal from '../../components/ui/Modal'
import Paginacion from '../../components/ui/Paginacion'
import { useToast } from '../../components/ui/toastContext'
import { formatDireccion, formatFranja, formatRelativeDateTime, formatRelativeDay } from '../../utils/format'
import { obtenerNombreCiudadano } from '../../utils/recogida'

const ESTADOS = [
  ['', 'Todas'],
  ['ABIERTA', 'Abiertas'],
  ['EN_REVISION', 'En revisión'],
  ['RESUELTA', 'Resueltas'],
]

export default function IncidenciasPage() {
  const [params] = useSearchParams()
  const [filtro, setFiltro] = useState({ estado: params.get('estado') ?? '', tipo: '', page: 0 })
  const lista = useApi(
    () => adminService.getIncidencias({ estado: filtro.estado || undefined, tipo: filtro.tipo || undefined, page: filtro.page, size: 10 }),
    [filtro.estado, filtro.tipo, filtro.page],
  )
  const tipos = useTiposIncidencia()
  const [abierta, setAbierta] = useState(() => (params.get('abrir') ? Number(params.get('abrir')) : null))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Incidencias</h1>

      <div className="flex flex-wrap items-center gap-2">
        {ESTADOS.map(([value, label]) => (
          <button key={value} type="button" className={`chip ${filtro.estado === value ? 'chip-active' : ''}`} onClick={() => setFiltro((f) => ({ ...f, estado: value, page: 0 }))}>
            {label}
          </button>
        ))}
        {/* ⚡ ZONA DINÁMICA Z3 — GET /api/catalogo/tipos-incidencia */}
        <select
          data-dyn="Z3 · GET /catalogo/tipos-incidencia"
          className="input !h-9 !w-auto !rounded-full text-sm"
          value={filtro.tipo}
          onChange={(e) => setFiltro((f) => ({ ...f, tipo: e.target.value, page: 0 }))}
        >
          <option value="">Todos los tipos</option>
          {tipos.data?.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/incidencias */}
      <div data-dyn="Z1 · GET /admin/incidencias" className="card !p-0 overflow-hidden">
        <Async state={lista} fallback={<Skeleton className="h-72" />}>
          {(p) =>
            p.content.length ? (
              <>
                {p.content.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setAbierta(i.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-container-low border-b border-surface-container last:border-0"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{i.tipoNombre}</span>
                      <span className="block text-sm text-on-surface-variant">
                        {i.codigo} · pedido {i.pedido.codigo} · {formatRelativeDateTime(i.creadaEn)}
                      </span>
                    </span>
                    <Estado estado={i.estado} />
                  </button>
                ))}
                <Paginacion page={p} onChange={(page) => setFiltro((f) => ({ ...f, page }))} />
              </>
            ) : (
              <EmptyState icon="task_alt" title="No hay incidencias con estos filtros" className="!rounded-none" />
            )
          }
        </Async>
      </div>

      {abierta && <DetalleIncidencia id={abierta} onClose={() => setAbierta(null)} onChanged={lista.reload} />}
    </div>
  )
}

function DetalleIncidencia({ id, onClose, onChanged }) {
  const toast = useToast()
  const inc = useApi(() => adminService.getIncidencia(id), [id])
  const tiposEnvase = useTiposEnvase()
  const [form, setForm] = useState(null)
  const [guardar, guardarState] = useAction(adminService.actualizarIncidencia)
  const [cancelar, cancelarState] = useAction(adminService.cancelarRecogida)

  const actual = form ?? { estado: inc.data?.estado ?? 'ABIERTA', resolucion: inc.data?.resolucion ?? '' }
  const nombreEnvase = (c) => tiposEnvase.data?.find((t) => t.codigo === c)?.nombre ?? c

  const submit = async (e) => {
    e.preventDefault()
    try {
      inc.setData(await guardar(id, actual))
      setForm(null)
      toast('Incidencia actualizada')
      onChanged()
    } catch {
      /* error debajo */
    }
  }

  const cancelarRecogida = async () => {
    try {
      const recogida = await cancelar(inc.data.recogida.id)
      inc.setData((d) => ({ ...d, recogida }))
      toast('Recogida cancelada')
    } catch {
      /* error debajo */
    }
  }

  return (
    <Modal open onClose={onClose} title={inc.data ? `Incidencia ${inc.data.codigo}` : 'Incidencia'} panelClassName="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl p-5 shadow-xl max-h-[92vh] overflow-y-auto">
      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/incidencias/{id} */}
      <div data-dyn="Z2 · GET /admin/incidencias/{id}">
        <Async state={inc} fallback={<Skeleton className="h-96" />}>
          {(i) =>
            !Array.isArray(i?.recogida?.bolsas) || !Array.isArray(i?.historial) ? (
              <ErrorState
                error={{ message: 'El servidor devolvió un detalle de incidencia incompleto.' }}
                onRetry={inc.reload}
              />
            ) : (
              <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-lg">{i.tipoNombre}</span>
                  <Estado estado={i.estado} />
                </div>
                <p className="text-sm text-on-surface-variant">Registrada {formatRelativeDateTime(i.creadaEn).toLowerCase()}</p>
                <p className="mt-1">{i.descripcion}</p>
              </div>

              <section className="rounded-2xl bg-surface-container-low p-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">Recogida {i.recogida.codigo}</span>
                  <Estado estado={i.recogida.estado} />
                </div>
                <p>
                  {formatRelativeDay(i.recogida.fecha)}, {formatFranja(i.recogida.horaInicio.slice(0, 5), i.recogida.horaFin.slice(0, 5))} · {formatDireccion(i.recogida.direccion)}
                </p>
                <p className="text-on-surface-variant">
                  Ciudadano: {obtenerNombreCiudadano(i.recogida.ciudadano)} · Recolector: {i.recogida.recolector?.nombre ?? 'sin asignar'}
                </p>
                <ul className="flex flex-col gap-1 mt-1">
                  {i.recogida.bolsas.map((b) => (
                    <li key={b.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${b.id === i.bolsaId ? 'bg-amber-50 ring-1 ring-amber-300' : ''}`}>
                      <span>
                        <span className="font-mono font-semibold">{b.codigo}</span> · {nombreEnvase(b.tipoEnvase)} · {b.cantidad} declarados
                        {b.resultado && b.resultado !== 'ACEPTADA' && ` · ${b.envasesValidos} válidos`}
                        {b.nota && <span className="block text-xs text-on-surface-variant">{b.nota}</span>}
                      </span>
                      {b.resultado && <Estado estado={b.resultado} />}
                    </li>
                  ))}
                </ul>
                {(i.recogida.estado === 'PENDIENTE' || i.recogida.estado === 'EN_CAMINO') && (
                  // ⚡ ACCIÓN A2 — POST /api/admin/recogidas/{id}/cancelar
                  <button type="button" className="btn btn-danger btn-sm self-start mt-1" disabled={cancelarState.loading} onClick={cancelarRecogida}>
                    {cancelarState.loading && <Spinner />} Cancelar esta recogida
                  </button>
                )}
                {cancelarState.error && <Alert>{cancelarState.error.message}</Alert>}
              </section>

              {/* ⚡ ACCIÓN A1 — PATCH /api/admin/incidencias/{id} */}
              <form onSubmit={submit} className="flex flex-col gap-3">
                <span className="label">Estado</span>
                <div className="grid grid-cols-3 gap-2">
                  {ESTADOS.slice(1).map(([value]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...actual, estado: value })}
                      className={`h-10 rounded-xl text-sm font-semibold ${actual.estado === value ? 'bg-on-surface text-surface-container-lowest' : 'bg-surface-container-low hover:bg-surface-container'}`}
                    >
                      {estadoLabel(value)}
                    </button>
                  ))}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="label">Resolución {actual.estado === 'RESUELTA' && <span className="text-error">*</span>}</span>
                  <textarea
                    className="input !h-20 py-2 resize-none"
                    placeholder="Qué se ha hecho (lo verá el ciudadano)"
                    value={actual.resolucion}
                    onChange={(e) => setForm({ ...actual, resolucion: e.target.value })}
                  />
                </label>
                {guardarState.error && <Alert>{guardarState.error.message}</Alert>}
                <button type="submit" className="btn btn-primary self-end" disabled={!form || guardarState.loading}>
                  {guardarState.loading && <Spinner />} Guardar cambios
                </button>
              </form>

              <section className="flex flex-col gap-2">
                <h3 className="font-bold text-sm">Historial</h3>
                <ol className="flex flex-col gap-1.5 text-sm">
                  {i.historial.map((h, k) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span>
                        {h.accion} <span className="text-on-surface-variant">· {h.autor}</span>
                      </span>
                      <span className="text-on-surface-variant shrink-0">{formatRelativeDateTime(h.fecha)}</span>
                    </li>
                  ))}
                </ol>
              </section>
              </div>
            )
          }
        </Async>
      </div>
    </Modal>
  )
}
