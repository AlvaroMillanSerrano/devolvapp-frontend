/**
 * VISTA: Recogida (empezar → verificar bolsas → completar)
 * Ruta: /recolector/recogidas/:id   Rol: RECOLECTOR
 * HU: HU-04.01 (solo recogidas asignadas), HU-04.02 (iniciar), HU-04.03 (verificar y finalizar), HU-04.04 (resultado por bolsa), HU-06.01 (registrar incidencia)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Dirección, mapa, franja y ciudadano  GET /api/recolector/recogidas/{id}   (403 si no es suya)
 *  [Z2] Bolsas y su resultado .............. GET /api/recolector/recogidas/{id} → bolsas[]
 *  [Z3] Incidencias registradas ............ GET /api/recolector/recogidas/{id} → incidencias[]
 *  [Z4] Tipos de envase / de incidencia .... GET /api/catalogo/tipos-envase · GET /api/catalogo/tipos-incidencia
 *
 * ACCIONES
 *  [A1] Empezar recogida ................... POST /api/recolector/recogidas/{id}/iniciar
 *  [A2] Resultado de una bolsa ............. PUT  /api/recolector/recogidas/{id}/bolsas/{bolsaId}
 *  [A3] Completar recogida ................. POST /api/recolector/recogidas/{id}/completar
 *  [A4] Registrar incidencia ............... POST /api/recolector/recogidas/{id}/incidencias
 */
import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useApi, useAction } from '../../hooks/useApi'
import { useTiposEnvase, useTiposIncidencia } from '../../hooks/useParametros'
import { recolectorService } from '../../api/recolectorService'
import Async, { ErrorState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import Mapa from '../../components/mapa/Mapa'
import { useToast } from '../../components/ui/toastContext'
import { formatDireccion, formatFranja, formatRelativeDateTime, formatRelativeDay, formatTime } from '../../utils/format'
import { contarBolsasSinVerificar } from '../../utils/recogida'

export default function RecogidaPage() {
  const { id } = useParams()
  const toast = useToast()
  const recogida = useApi(() => recolectorService.getRecogida(id), [id])
  const { reloadImpacto } = useOutletContext()
  const tipos = useTiposEnvase()
  const [incidenciaOpen, setIncidenciaOpen] = useState(false)
  const [iniciar, iniciarState] = useAction(recolectorService.iniciar)
  const [completar, completarState] = useAction(recolectorService.completar)

  const nombreTipo = (codigo) => tipos.data?.find((t) => t.codigo === codigo)?.nombre ?? codigo

  const run = async (action, msg) => {
    try {
      recogida.setData(await action(id))
      toast(msg)
    } catch {
      /* se muestra debajo del botón */
    }
  }

  if (recogida.error?.status === 403)
    return (
      <ErrorState error={{ message: 'Esta recogida no está asignada a ti.' }} className="mt-6" />
    )

  return (
    <div className="flex flex-col gap-4">
      <Link to="/recolector" className="self-start text-sm font-semibold text-primary flex items-center gap-1">
        <Icon name="arrow_back" className="text-[18px]" /> Mis recogidas
      </Link>

      <Async state={recogida} fallback={<Skeleton className="h-96" />}>
        {(r) => {
          if (!Array.isArray(r?.bolsas) || !Array.isArray(r?.incidencias)) {
            return (
              <ErrorState
                error={{ message: 'El detalle recibido está incompleto: faltan las bolsas o incidencias de la recogida.' }}
                onRetry={recogida.reload}
              />
            )
          }

          const sinVerificar = contarBolsasSinVerificar(r.bolsas)

          return (
            <>
              {/* ⚡ ZONA DINÁMICA Z1 — GET /api/recolector/recogidas/{id} */}
              <section data-dyn="Z1 · GET /recolector/recogidas/{id}" className="card flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-on-surface-variant">
                      {r.codigo} · {formatRelativeDay(r.fecha)}, {formatFranja(r.horaInicio.slice(0, 5), r.horaFin.slice(0, 5))}
                    </p>
                    <h1 className="text-xl font-bold">{formatDireccion(r.direccion, { conCiudad: false })}</h1>
                    <p className="text-sm text-on-surface-variant">
                      {r.direccion.codigoPostal} {r.direccion.ciudad}
                    </p>
                  </div>
                  <Estado estado={r.estado} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="btn btn-secondary btn-sm"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}&travelmode=driving`}
                  >
                    <Icon name="directions" className="text-[18px]" /> Cómo llegar
                  </a>
                  <a className="btn btn-secondary btn-sm" href={`tel:${r.ciudadano.telefono}`}>
                    <Icon name="call" className="text-[18px]" /> Llamar a {r.ciudadano.nombre}
                  </a>
                </div>

                <Mapa puntos={[{ id: r.id, lat: r.direccion.lat, lng: r.direccion.lng, etiqueta: '●', color: r.estado === 'EN_CAMINO' ? 'azul' : 'primary' }]} className="h-44" />
                {r.iniciadoEn && (
                  <p className="text-xs text-on-surface-variant">
                    Iniciada a las {formatTime(r.iniciadoEn)}
                    {r.completadoEn && ` · completada ${formatRelativeDateTime(r.completadoEn).toLowerCase()}`}
                  </p>
                )}
              </section>

              {r.estado === 'CANCELADA' && <Alert variant="info" icon="cancel">Recogida cancelada. No tienes que ir.</Alert>}

              {r.estado === 'PENDIENTE' && (
                <div className="flex flex-col gap-2">
                  <button type="button" className="btn btn-primary btn-lg" disabled={iniciarState.loading} onClick={() => run(iniciar, 'Recogida iniciada: el ciudadano ya la ve «en camino»')}>
                    {iniciarState.loading ? <Spinner /> : <Icon name="two_wheeler" />} Empezar recogida
                  </button>
                  {iniciarState.error && <Alert>{iniciarState.error.message}</Alert>}
                </div>
              )}

              {/* ⚡ ZONA DINÁMICA Z2 — GET /api/recolector/recogidas/{id} (bolsas) */}
              <section data-dyn="Z2 · bolsas[]" className="flex flex-col gap-2">
                <h2 className="font-bold">
                  Bolsas ({r.bolsas.length}){r.estado === 'EN_CAMINO' && sinVerificar > 0 && <span className="text-on-surface-variant font-normal"> · te quedan {sinVerificar} por verificar</span>}
                </h2>
                {r.bolsas.map((b) => (
                  <BolsaItem
                    key={b.id}
                    bolsa={b}
                    tipo={nombreTipo(b.tipoEnvase)}
                    editable={r.estado === 'EN_CAMINO'}
                    recogidaId={r.id}
                    onSaved={() => recogida.reload()}
                  />
                ))}
              </section>

              {r.estado === 'EN_CAMINO' && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    disabled={sinVerificar > 0 || completarState.loading}
                    onClick={() => run(completar, 'Recogida completada').then(reloadImpacto)}
                  >
                    {completarState.loading ? <Spinner /> : <Icon name="task_alt" />} Completar recogida
                  </button>
                  {sinVerificar > 0 && <p className="text-sm text-center text-on-surface-variant">Verifica todas las bolsas para poder completarla.</p>}
                  {completarState.error && <Alert>{completarState.error.message}</Alert>}
                </div>
              )}

              {r.estado === 'COMPLETADA' && (
                <Alert variant="info" icon="task_alt">
                  ¡Hecho! {r.bolsas.reduce((s, b) => s + b.envasesValidos, 0)} envases válidos recogidos.
                </Alert>
              )}

              {/* ⚡ ZONA DINÁMICA Z3 — GET /api/recolector/recogidas/{id} (incidencias) */}
              <section data-dyn="Z3 · incidencias[]" className="flex flex-col gap-2">
                {r.incidencias.length > 0 && <h2 className="font-bold">Incidencias</h2>}
                {r.incidencias.map((i) => (
                  <div key={i.id} className="card !p-3 flex items-center justify-between gap-2">
                    <span className="text-sm">
                      <span className="font-semibold block">{i.tipo}</span>
                      <span className="text-on-surface-variant">
                        {i.codigo} · {formatRelativeDateTime(i.creadaEn)}
                      </span>
                    </span>
                    <Estado estado={i.estado} />
                  </div>
                ))}
                {(r.estado === 'PENDIENTE' || r.estado === 'EN_CAMINO') && (
                  <button type="button" className="btn btn-ghost self-center" onClick={() => setIncidenciaOpen(true)}>
                    <Icon name="report" className="text-[20px]" /> Tengo un problema con esta recogida
                  </button>
                )}
              </section>
            </>
          )
        }}
      </Async>

      <IncidenciaModal
        open={incidenciaOpen}
        recogidaId={id}
        onClose={() => setIncidenciaOpen(false)}
        onDone={() => {
          setIncidenciaOpen(false)
          recogida.reload()
        }}
      />
    </div>
  )
}

const OPCIONES = [
  ['ACEPTADA', 'Correcta', 'check_circle'],
  ['DISCREPANCIA', 'No coincide', 'rule'],
  ['NO_ENCONTRADA', 'No está', 'search_off'],
]

function BolsaItem({ bolsa: b, tipo, editable, recogidaId, onSaved }) {
  const [editando, setEditando] = useState(null) // resultado elegido que necesita detalle
  const [form, setForm] = useState({ envasesValidos: '', nota: '' })
  const [guardar, state] = useAction(recolectorService.registrarResultadoBolsa)

  const enviar = async (resultado, extra = {}) => {
    try {
      onSaved(await guardar(recogidaId, b.id, { resultado, ...extra }))
      setEditando(null)
    } catch {
      /* se muestra el error */
    }
  }

  const elegir = (resultado) => {
    if (resultado === 'ACEPTADA') enviar(resultado)
    else {
      setForm({ envasesValidos: '', nota: '' })
      setEditando(resultado)
    }
  }

  return (
    // ⚡ ACCIÓN A2 — PUT /api/recolector/recogidas/{id}/bolsas/{bolsaId}
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="font-mono font-bold tracking-wider bg-surface-container-low px-2 py-1 rounded-lg">{b.codigo}</span>
        <span className="flex-1 text-sm">
          <span className="block font-semibold">{tipo}</span>
          <span className="text-on-surface-variant">{b.cantidad} envases declarados</span>
        </span>
        {b.resultado && !editando && <Estado estado={b.resultado} />}
      </div>

      {b.resultado && b.resultado !== 'ACEPTADA' && !editando && (
        <p className="text-sm text-on-surface-variant">
          Válidos: <strong>{b.envasesValidos}</strong> · {b.nota}
        </p>
      )}

      {editable && !editando && (
        <div className="grid grid-cols-3 gap-2">
          {OPCIONES.map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              disabled={state.loading}
              onClick={() => elegir(value)}
              className={`h-12 rounded-xl text-sm font-semibold flex flex-col items-center justify-center leading-tight transition-colors ${
                b.resultado === value ? 'bg-on-surface text-surface-container-lowest' : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <Icon name={icon} className="text-[18px]" />
              {label}
            </button>
          ))}
        </div>
      )}

      {editando && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            enviar(editando, editando === 'DISCREPANCIA' ? { envasesValidos: Number(form.envasesValidos), nota: form.nota } : { nota: form.nota })
          }}
        >
          {editando === 'DISCREPANCIA' && (
            <label className="flex flex-col gap-1">
              <span className="label">¿Cuántos envases son válidos?</span>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                required
                value={form.envasesValidos}
                onChange={(e) => setForm((f) => ({ ...f, envasesValidos: e.target.value }))}
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="label">{editando === 'DISCREPANCIA' ? '¿Qué no coincide?' : '¿Qué ha pasado?'}</span>
            <textarea
              className="input !h-20 py-2 resize-none"
              required
              placeholder={editando === 'DISCREPANCIA' ? 'Ej. había vidrio no retornable' : 'Ej. no estaba en el portal ni en conserjería'}
              value={form.nota}
              onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
            />
          </label>
          <p className="text-xs text-on-surface-variant">Se creará una incidencia para que administración lo revise.</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setEditando(null)}>
              Volver
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={state.loading}>
              {state.loading && <Spinner />} Guardar
            </button>
          </div>
        </form>
      )}
      {state.error && <Alert>{state.error.message}</Alert>}
    </div>
  )
}

function IncidenciaModal({ open, recogidaId, onClose, onDone }) {
  const toast = useToast()
  const tipos = useTiposIncidencia()
  const [form, setForm] = useState({ tipo: '', descripcion: '' })
  const [errors, setErrors] = useState({})
  const [registrar, state] = useAction(recolectorService.registrarIncidencia)

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!form.tipo) v.tipo = 'Elige qué ha pasado'
    if (!form.descripcion.trim()) v.descripcion = 'Cuéntalo brevemente'
    setErrors(v)
    if (Object.keys(v).length) return
    try {
      const inc = await registrar(recogidaId, form)
      toast(`Incidencia ${inc.codigo} registrada`)
      setForm({ tipo: '', descripcion: '' })
      onDone()
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar incidencia">
      {/* ⚡ ACCIÓN A4 — POST /api/recolector/recogidas/{id}/incidencias · Z4 GET /api/catalogo/tipos-incidencia */}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div data-dyn="Z4 · GET /catalogo/tipos-incidencia" className="flex flex-col gap-2">
          <Async state={tipos} fallback={<Skeleton className="h-40" />}>
            {(lista) =>
              lista.map((t) => (
                <label
                  key={t.codigo}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${form.tipo === t.codigo ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface-container-low'}`}
                >
                  <input type="radio" name="tipo" className="accent-primary w-4 h-4" checked={form.tipo === t.codigo} onChange={() => setForm((f) => ({ ...f, tipo: t.codigo }))} />
                  <span className="text-sm font-medium">{t.nombre}</span>
                </label>
              ))
            }
          </Async>
          {errors.tipo && <p className="text-sm text-error">{errors.tipo}</p>}
        </div>
        <label className="flex flex-col gap-1">
          <span className="label">Descripción</span>
          <textarea
            className="input !h-24 py-2 resize-none"
            placeholder="¿Qué ha pasado?"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
          {errors.descripcion && <span className="text-sm text-error">{errors.descripcion}</span>}
        </label>
        {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={state.loading}>
          {state.loading && <Spinner />} Enviar incidencia
        </button>
      </form>
    </Modal>
  )
}
