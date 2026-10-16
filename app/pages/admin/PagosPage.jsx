/**
 * VISTA: Pagos a ciudadanos (aceptar o rechazar transferencias)
 * Ruta: /admin/pagos   Rol: ADMIN
 * HU: HU-07.03 (estado de las transferencias), HU-05.04 (registrar el resultado sin pagos duplicados)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Totales por estado ................. GET /api/admin/transferencias → totales
 *  [Z2] Lista de transferencias ............ GET /api/admin/transferencias?estado=&page=
 *  [Z3] Detalle e historial ................ GET /api/admin/transferencias/{id}
 *
 * ACCIONES
 *  [A1] Aceptar y pagar / rechazar una ..... POST /api/admin/transferencias/{id}/resultado  (la referencia la genera el servidor)
 *  [A2] Aceptar y pagar varias a la vez .... POST /api/admin/transferencias/pagar-lote       (genera la remesa y las referencias)
 */
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi, useAction } from '../../hooks/useApi'
import { adminService } from '../../api/adminService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import Paginacion from '../../components/ui/Paginacion'
import { useToast } from '../../components/ui/toastContext'
import { formatEUR, formatRelativeDateTime } from '../../utils/format'

const FILTROS = [
  ['PENDIENTE', 'Por aceptar'],
  ['COMPLETADA', 'Pagadas'],
  ['FALLIDA', 'Rechazadas o fallidas'],
  ['', 'Todas'],
]

export default function PagosPage() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? 'PENDIENTE'
  const [page, setPage] = useState(0)
  const lista = useApi(() => adminService.getTransferencias({ estado: estado || undefined, page, size: 10 }), [estado, page])
  const [abierta, setAbierta] = useState(null)
  const [seleccion, setSeleccion] = useState([])
  const [lote, setLote] = useState(false)

  const cambiarEstado = (v) => {
    setParams({ estado: v })
    setPage(0)
    setSeleccion([])
  }
  const pendientesPagina = lista.data?.content.filter((t) => t.estado === 'PENDIENTE') ?? []
  const totalSeleccion = pendientesPagina.filter((t) => seleccion.includes(t.id)).reduce((s, t) => s + t.importe, 0)
  const toggle = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Pagos a ciudadanos</h1>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/transferencias (totales) */}
      <div data-dyn="Z1 · totales" className="grid grid-cols-3 gap-3">
        {FILTROS.slice(0, 3).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => cambiarEstado(value)}
            className={`card text-left transition-colors ${estado === value ? 'ring-2 ring-primary' : 'hover:bg-surface-container-low'}`}
          >
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${value === 'FALLIDA' ? 'text-error' : ''}`}>{lista.data ? formatEUR(lista.data.totales[value]) : '—'}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {FILTROS.map(([value, label]) => (
          <button key={value} type="button" className={`chip shrink-0 ${estado === value ? 'chip-active' : ''}`} onClick={() => cambiarEstado(value)}>
            {label}
          </button>
        ))}
      </div>

      {seleccion.length > 0 && (
        <div className="card !py-3 flex items-center gap-3 flex-wrap bg-primary/5 ring-2 ring-primary/30">
          <span className="flex-1 text-sm">
            <strong>{seleccion.length}</strong> seleccionadas · {formatEUR(totalSeleccion)}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeleccion([])}>
            Quitar selección
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setLote(true)}>
            <Icon name="done_all" className="text-[18px]" /> Aceptar y pagar
          </button>
        </div>
      )}

      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/transferencias */}
      <div data-dyn="Z2 · GET /admin/transferencias" className="card !p-0 overflow-hidden">
        <Async state={lista} fallback={<Skeleton className="h-72" />}>
          {(p) =>
            p.content.length ? (
              <>
                {estado === 'PENDIENTE' && (
                  <label className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-on-surface-variant border-b border-surface-container cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-primary w-4 h-4"
                      checked={pendientesPagina.length > 0 && pendientesPagina.every((t) => seleccion.includes(t.id))}
                      onChange={(e) => setSeleccion(e.target.checked ? pendientesPagina.map((t) => t.id) : [])}
                    />
                    Seleccionar todas las de esta página
                  </label>
                )}
                {p.content.map((t) => (
                  <div key={t.id} className="flex items-center border-b border-surface-container last:border-0">
                    {t.estado === 'PENDIENTE' && (
                      <input type="checkbox" aria-label={`Seleccionar ${t.codigo}`} className="accent-primary w-4 h-4 ml-4" checked={seleccion.includes(t.id)} onChange={() => toggle(t.id)} />
                    )}
                    <button type="button" onClick={() => setAbierta(t.id)} className="flex-1 px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-container-low">
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold truncate">{t.ciudadano}</span>
                        <span className="block text-sm text-on-surface-variant">
                          {t.codigo} · solicitada {formatRelativeDateTime(t.solicitadaEn).toLowerCase()}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="font-bold tabular-nums">{formatEUR(t.importe)}</span>
                        <Estado estado={t.estado} transferencia />
                      </span>
                    </button>
                  </div>
                ))}
                <Paginacion page={p} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon="payments" title={estado === 'PENDIENTE' ? 'No hay transferencias por aceptar' : 'No hay transferencias'} className="!rounded-none" />
            )
          }
        </Async>
      </div>

      {abierta && <DetallePago id={abierta} onClose={() => setAbierta(null)} onChanged={lista.reload} />}
      {lote && (
        <PagoLote
          ids={seleccion}
          total={totalSeleccion}
          onClose={() => setLote(false)}
          onDone={() => {
            setLote(false)
            setSeleccion([])
            lista.reload()
          }}
        />
      )}
    </div>
  )
}

function PagoLote({ ids, total, onClose, onDone }) {
  const toast = useToast()
  const [pagar, state] = useAction(adminService.pagarTransferencias)
  return (
    <Modal open onClose={onClose} title="Aceptar y pagar">
      {/* ⚡ ACCIÓN A2 — POST /api/admin/transferencias/pagar-lote */}
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            const r = await pagar({ ids })
            toast(`${r.procesadas} transferencias pagadas · remesa ${r.remesa}`)
            onDone()
          } catch {
            /* error debajo */
          }
        }}
      >
        <p className="text-sm">
          Vas a marcar como pagadas <strong>{ids.length}</strong> transferencias por un total de <strong>{formatEUR(total)}</strong>.
        </p>
        <p className="text-sm text-on-surface-variant">Las referencias de cada transferencia y de la remesa se generan automáticamente.</p>
        {state.error && <Alert>{state.error.message}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={state.loading}>
          {state.loading && <Spinner />} Confirmar pago
        </button>
      </form>
    </Modal>
  )
}

function DetallePago({ id, onClose, onChanged }) {
  const toast = useToast()
  const pago = useApi(() => adminService.getTransferencia(id), [id])
  const [modo, setModo] = useState(null) // 'COMPLETADA' | 'FALLIDA'
  const [texto, setTexto] = useState('')
  const [registrar, state] = useAction(adminService.registrarResultadoTransferencia)

  const submit = async (e) => {
    e.preventDefault()
    try {
      const data = modo === 'COMPLETADA' ? { estado: modo } : { estado: modo, motivoFallo: texto }
      const t = await registrar(id, data)
      pago.setData(t)
      toast(modo === 'COMPLETADA' ? `Pagada · referencia ${t.referenciaBancaria}` : 'Transferencia rechazada: el importe vuelve al monedero')
      setModo(null)
      onChanged()
    } catch {
      /* error debajo */
    }
  }

  return (
    <Modal open onClose={onClose} title="Transferencia">
      {/* ⚡ ZONA DINÁMICA Z3 — GET /api/admin/transferencias/{id} */}
      <div data-dyn="Z3 · GET /admin/transferencias/{id}">
        <Async state={pago} fallback={<Skeleton className="h-64" />}>
          {(t) => (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold tabular-nums">{formatEUR(t.importe)}</span>
                <Estado estado={t.estado} transferencia />
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                <Fila label="Ciudadano" value={t.ciudadano} />
                <Fila label="Referencia" value={t.codigo} />
                <Fila label="IBAN" value={<span className="font-mono">{t.iban.replace(/(.{4})/g, '$1 ').trim()}</span>} />
                <Fila label="Solicitada" value={formatRelativeDateTime(t.solicitadaEn)} />
                {t.procesadaEn && <Fila label="Procesada" value={`${formatRelativeDateTime(t.procesadaEn)} · ${t.procesadaPor ?? ''}`} />}
                {t.referenciaBancaria && <Fila label="Ref. bancaria" value={<span className="font-mono">{t.referenciaBancaria}</span>} />}
                {t.remesa && <Fila label="Remesa" value={<span className="font-mono">{t.remesa}</span>} />}
              </dl>
              {t.motivoFallo && <Alert>{t.motivoFallo} El importe ha vuelto al monedero del ciudadano.</Alert>}

              <section className="flex flex-col gap-1.5">
                <h3 className="font-bold text-sm">Historial</h3>
                {t.historial.map((h, k) => (
                  <div key={k} className="flex items-center justify-between gap-2 text-sm">
                    <Estado estado={h.estado} transferencia />
                    <span className="text-on-surface-variant text-right">
                      {formatRelativeDateTime(h.fecha)}
                      {h.autor && ` · ${h.autor}`}
                    </span>
                  </div>
                ))}
              </section>

              {t.estado === 'PENDIENTE' &&
                (modo ? (
                  // ⚡ ACCIÓN A1 — POST /api/admin/transferencias/{id}/resultado
                  <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-surface-container-low p-4">
                    {modo === 'COMPLETADA' ? (
                      <p className="text-sm">
                        ¿Pagar <strong>{formatEUR(t.importe)}</strong> a {t.ciudadano}? La referencia de la transferencia se genera automáticamente.
                      </p>
                    ) : (
                      <FormField
                        label="Motivo del rechazo (lo verá el ciudadano)"
                        placeholder="Ej. el IBAN no pertenece al titular"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        autoFocus
                      />
                    )}
                    {state.error && <Alert>{state.error.message}</Alert>}
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-secondary flex-1" onClick={() => setModo(null)}>
                        Volver
                      </button>
                      <button type="submit" className={`btn flex-1 ${modo === 'COMPLETADA' ? 'btn-primary' : 'btn-danger'}`} disabled={(modo === 'FALLIDA' && !texto.trim()) || state.loading}>
                        {state.loading && <Spinner />} Confirmar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-danger flex-1"
                      onClick={() => {
                        setTexto('')
                        setModo('FALLIDA')
                      }}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary flex-1"
                      onClick={() => {
                        setTexto('')
                        setModo('COMPLETADA')
                      }}
                    >
                      Aceptar y pagar
                    </button>
                  </div>
                ))}
            </div>
          )}
        </Async>
      </div>
    </Modal>
  )
}

const Fila = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-on-surface-variant">{label}</dt>
    <dd className="text-right">{value}</dd>
  </div>
)
