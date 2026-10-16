/**
 * VISTA: Monedero
 * Ruta: /ciudadano/monedero   Rol: CIUDADANO
 * HU: HU-05.01 (saldo), HU-05.03 (retirar a mi cuenta), HU-05.05 (movimientos)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Saldo disponible ........... GET /api/ciudadano/monedero
 *  [Z2] Movimientos ................ GET /api/ciudadano/monedero/movimientos?page=
 *  [Z3] Cómo se calcula ............ GET /api/config/parametros → economia
 *
 * ACCIONES
 *  [A1] Retirar dinero ............. POST /api/ciudadano/monedero/retiradas
 */
import { useState } from 'react'
import { useApi, useAction } from '../../hooks/useApi'
import { useParametros } from '../../hooks/useParametros'
import { ciudadanoService } from '../../api/ciudadanoService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatDate, formatEUR, formatPct, formatRelativeDateTime, formatSignedEUR } from '../../utils/format'
import { formatIbanInput, isValidIban } from '../../utils/validators'

export default function MonederoPage() {
  const monedero = useApi(() => ciudadanoService.getMonedero(), [])
  const [page, setPage] = useState(0)
  const movimientos = useApi(() => ciudadanoService.getMovimientos({ page, size: 10 }), [page])
  const parametros = useParametros()
  const [retirarOpen, setRetirarOpen] = useState(false)
  const [detalle, setDetalle] = useState(null)

  const saldo = monedero.data?.saldoDisponible ?? 0

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Monedero</h1>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/ciudadano/monedero */}
      <section data-dyn="Z1 · GET /ciudadano/monedero" className="rounded-3xl bg-gradient-to-br from-primary to-primary-container text-on-primary p-6 flex flex-col gap-4 shadow-md">
        <div>
          <p className="text-sm text-white/80">Saldo disponible</p>
          <Async state={monedero} fallback={<Skeleton className="h-12 w-40 !bg-white/20" />}>
            {(m) => <p className="text-4xl font-bold tabular-nums">{formatEUR(m.saldoDisponible)}</p>}
          </Async>
        </div>
        <button
          type="button"
          className="btn bg-white text-primary hover:bg-white/90 self-start"
          disabled={!(saldo > 0)}
          onClick={() => setRetirarOpen(true)}
        >
          <Icon name="account_balance" className="text-[20px]" /> Retirar a mi cuenta
        </button>
      </section>

      {/* ⚡ ZONA DINÁMICA Z3 — GET /api/config/parametros (economia) */}
      {parametros.data && (
        <p data-dyn="Z3 · GET /config/parametros" className="text-sm text-on-surface-variant flex gap-2">
          <Icon name="info" className="text-[18px] shrink-0" />
          <span>
            Por cada envase válido recibes {formatEUR(parametros.data.economia.importePorEnvase * parametros.data.economia.porcentajeCiudadano)} (
            {formatPct(parametros.data.economia.porcentajeCiudadano)} de {formatEUR(parametros.data.economia.importePorEnvase)}). Se abona cuando el
            recolector verifica tus bolsas.
          </span>
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Movimientos</h2>
        {/* ⚡ ZONA DINÁMICA Z2 — GET /api/ciudadano/monedero/movimientos */}
        <div data-dyn="Z2 · GET /ciudadano/monedero/movimientos" className="card !p-0 overflow-hidden">
          <Async state={movimientos} fallback={<Skeleton className="h-64" />}>
            {(p) =>
              p.content.length ? (
                <>
                  {p.content.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDetalle(m)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-low border-b border-surface-container last:border-0"
                    >
                      <span
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          m.tipo === 'ABONO' ? 'bg-secondary-container/60 text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        <Icon name={m.tipo === 'ABONO' ? 'south_west' : 'north_east'} className="text-[20px]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm">{m.tipo === 'ABONO' ? 'Abono por recogida' : 'Retirada a tu cuenta'}</span>
                        <span className="block text-xs text-on-surface-variant truncate">
                          {formatDate(m.fecha)} · {m.concepto}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className={`font-bold tabular-nums ${m.estado === 'FALLIDA' ? 'line-through text-on-surface-variant' : m.importe > 0 ? 'text-primary' : ''}`}>
                          {formatSignedEUR(m.importe)}
                        </span>
                        {m.tipo === 'RETIRADA' && <Estado estado={m.estado} transferencia />}
                      </span>
                    </button>
                  ))}
                  {p.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 p-3">
                      <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                        Anterior
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={page + 1 >= p.totalPages} onClick={() => setPage(page + 1)}>
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState icon="account_balance_wallet" title="Sin movimientos todavía" className="!rounded-none">
                  Tu saldo es de 0 €. Pide tu primera recogida y empieza a ganar.
                </EmptyState>
              )
            }
          </Async>
        </div>
      </section>

      <RetirarModal
        open={retirarOpen}
        saldo={saldo}
        onClose={() => setRetirarOpen(false)}
        onDone={() => {
          setRetirarOpen(false)
          monedero.reload()
          movimientos.reload()
        }}
      />

      <Modal open={Boolean(detalle)} onClose={() => setDetalle(null)} title={detalle?.tipo === 'ABONO' ? 'Abono por recogida' : 'Retirada'}>
        {detalle && (
          <dl className="flex flex-col gap-3 text-sm">
            <Fila label="Importe" value={<strong className="text-lg">{formatSignedEUR(detalle.importe)}</strong>} />
            <Fila label="Estado" value={<Estado estado={detalle.estado} transferencia={detalle.tipo === 'RETIRADA'} />} />
            <Fila label="Fecha" value={formatRelativeDateTime(detalle.fecha)} />
            <Fila label="Concepto" value={detalle.concepto} />
            {detalle.procesadaEn && <Fila label="Procesada" value={formatRelativeDateTime(detalle.procesadaEn)} />}
            {detalle.referencia && <Fila label="Referencia" value={<span className="font-mono">{detalle.referencia}</span>} />}
            {detalle.estado === 'PENDIENTE' && <Alert variant="info">Estamos tramitando la transferencia. Suele tardar 1-2 días hábiles.</Alert>}
            {detalle.motivoFallo && (
              <Alert>
                {detalle.motivoFallo} El importe ha vuelto a tu saldo.
              </Alert>
            )}
          </dl>
        )}
      </Modal>
    </div>
  )
}

const Fila = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-on-surface-variant">{label}</dt>
    <dd className="text-right">{value}</dd>
  </div>
)

function RetirarModal({ open, saldo, onClose, onDone }) {
  const toast = useToast()
  const [form, setForm] = useState({ importe: '', iban: '' })
  const [errors, setErrors] = useState({})
  const [retirar, state] = useAction(ciudadanoService.solicitarRetirada)

  const submit = async (e) => {
    e.preventDefault()
    const importe = Number(String(form.importe).replace(',', '.'))
    const v = {}
    if (!(importe > 0)) v.importe = 'Indica un importe mayor que 0'
    else if (importe > saldo) v.importe = `No puede superar tu saldo (${formatEUR(saldo)})`
    if (!isValidIban(form.iban)) v.iban = 'IBAN no válido. Revisa que esté completo y sin errores.'
    setErrors(v)
    if (Object.keys(v).length) return
    try {
      await retirar({ importe, iban: form.iban.replace(/\s/g, '') })
      toast('Retirada solicitada. Te llegará en 1-2 días hábiles.')
      setForm({ importe: '', iban: form.iban })
      onDone()
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Retirar a mi cuenta">
      {/* ⚡ ACCIÓN A1 — POST /api/ciudadano/monedero/retiradas */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-on-surface-variant">
          Tienes <strong className="text-on-surface">{formatEUR(saldo)}</strong> disponibles.
        </p>
        <div className="flex flex-col gap-2">
          <FormField
            label="Importe"
            inputMode="decimal"
            placeholder="0,00"
            value={form.importe}
            onChange={(e) => setForm((f) => ({ ...f, importe: e.target.value }))}
            error={errors.importe}
          />
          <button type="button" className="text-sm font-semibold text-primary self-start" onClick={() => setForm((f) => ({ ...f, importe: saldo.toFixed(2).replace('.', ',') }))}>
            Retirar todo
          </button>
        </div>
        <FormField
          label="IBAN"
          placeholder="ES00 0000 0000 0000 0000 0000"
          autoComplete="off"
          value={form.iban}
          onChange={(e) => setForm((f) => ({ ...f, iban: formatIbanInput(e.target.value) }))}
          error={errors.iban}
        />
        {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={state.loading}>
          {state.loading && <Spinner />} Solicitar retirada
        </button>
      </form>
    </Modal>
  )
}
