/**
 * VISTA: Zonas de reparto (códigos postales, recolector por día y horarios)
 * Ruta: /admin/zonas   Rol: ADMIN
 * HU: HU-07.06 (zona por CP y recolector asignado, aquí por día de la semana), HU-07.01 (días, horarios y capacidad)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Zonas con sus CP y su semana (recolector y franjas por día) ... GET /api/admin/zonas
 *  [Z2] Cobertura de los CP de Málaga ................................. GET /api/admin/codigos-postales
 *  [Z3] Recolectores (preferencia y días ocupados) .................... GET /api/admin/recolectores
 *  [Z4] Solicitudes de cambio de zona ................................. ver SolicitudesZona.jsx
 *
 * ACCIONES
 *  [A1] Nueva zona (nombre + CP) ...................................... POST   /api/admin/zonas
 *  [A2] Editar nombre y CP ............................................ PUT    /api/admin/zonas/{id}
 *  [A3] Borrar zona ................................................... DELETE /api/admin/zonas/{id}
 *  [A4] Recolector de un día .......................................... PUT    /api/admin/zonas/{id}/dias/{diaSemana}/recolector
 *  [A5] Añadir / editar / borrar franja ............................... POST /api/admin/zonas/{id}/franjas · PUT/DELETE /api/admin/franjas/{id}
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi, useAction } from '../../hooks/useApi'
import { adminService } from '../../api/adminService'
import Async, { Skeleton } from '../../components/ui/Async'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import SolicitudesZona from './SolicitudesZona'
import { DIAS_SEMANA, formatFranja } from '../../utils/format'

export default function ZonasPage() {
  const [params] = useSearchParams()
  const zonas = useApi(() => adminService.getZonas(), [])
  const cps = useApi(() => adminService.getCodigosPostales(), [])
  const recolectores = useApi(() => adminService.getRecolectores(), [])
  const [zonaForm, setZonaForm] = useState(null) // { zona? }
  const [franja, setFranja] = useState(null) // { zonaId, diaSemana, franja? }
  const destacada = Number(params.get('zona')) || null

  const recargar = () => {
    zonas.reload()
    cps.reload()
    recolectores.reload()
  }
  const actualizarZona = (z) => {
    zonas.setData((list) => list.map((x) => (x.id === z.id ? z : x)))
    recolectores.reload()
  }

  useEffect(() => {
    if (destacada && zonas.data) document.getElementById(`zona-${destacada}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [destacada, zonas.data])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Zonas de reparto</h1>
          <p className="text-sm text-on-surface-variant">Agrupa códigos postales de Málaga, elige quién recoge cada día de la semana y en qué horarios.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => setZonaForm({})}>
          <Icon name="add" className="text-[18px]" /> Nueva zona
        </button>
      </div>

      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/codigos-postales */}
      <section data-dyn="Z2 · GET /admin/codigos-postales" className="card flex flex-col gap-3">
        <Async state={cps} fallback={<Skeleton className="h-24" />}>
          {(lista) => {
            const sinZona = lista.filter((c) => !c.zona)
            return (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="font-bold">Códigos postales de Málaga</h2>
                  <span className={`text-sm font-semibold ${sinZona.length ? 'text-amber-800' : 'text-primary'}`}>
                    {lista.length - sinZona.length} de {lista.length} con zona{sinZona.length ? ` · ${sinZona.length} sin servicio` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lista.map((c) => (
                    <span
                      key={c.cp}
                      title={`${c.barrio}${c.zona ? ` · zona ${c.zona.nombre}` : ' · sin zona'}`}
                      className={`h-7 px-2.5 rounded-full text-xs font-semibold flex items-center ${c.zona ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-900'}`}
                    >
                      {c.cp}
                    </span>
                  ))}
                </div>
              </>
            )
          }}
        </Async>
      </section>

      <SolicitudesZona onChanged={recargar} />

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/zonas */}
      <div data-dyn="Z1 · GET /admin/zonas" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Async state={zonas} fallback={<Skeleton className="h-96 xl:col-span-2" />}>
          {(lista) =>
            lista.map((z) => (
              <ZonaCard
                key={z.id}
                zona={z}
                destacada={z.id === destacada}
                recolectores={recolectores.data ?? []}
                onChange={actualizarZona}
                onEditar={() => setZonaForm({ zona: z })}
                onFranja={(diaSemana, f) => setFranja({ zonaId: z.id, diaSemana, franja: f })}
              />
            ))
          }
        </Async>
      </div>

      {zonaForm && (
        <ZonaModal
          zona={zonaForm.zona}
          cps={cps.data ?? []}
          onClose={() => setZonaForm(null)}
          onDone={() => {
            setZonaForm(null)
            recargar()
          }}
        />
      )}
      {franja && (
        <FranjaModal
          {...franja}
          onClose={() => setFranja(null)}
          onDone={(z) => {
            actualizarZona(z)
            setFranja(null)
          }}
        />
      )}
    </div>
  )
}

function ZonaCard({ zona: z, destacada, recolectores, onChange, onEditar, onFranja }) {
  const toast = useToast()
  const [asignar, asignarState] = useAction(adminService.asignarDia)
  const [diaGuardando, setDiaGuardando] = useState(null)
  const sinRecolector = z.dias.filter((d) => d.franjas.length && !d.recolector).length

  const cambiar = async (dia, value) => {
    setDiaGuardando(dia)
    try {
      onChange(await asignar(z.id, dia, value ? Number(value) : null))
      toast(value ? `${DIAS_SEMANA[dia - 1]}: recolector asignado` : `${DIAS_SEMANA[dia - 1]}: sin recolector`)
    } catch {
      /* error debajo */
    } finally {
      setDiaGuardando(null)
    }
  }

  return (
    <section id={`zona-${z.id}`} className={`card flex flex-col gap-4 scroll-mt-24 ${destacada ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{z.nombre}</h2>
          <p className="text-sm text-on-surface-variant">CP {z.codigosPostales.join(', ')}</p>
          {sinRecolector > 0 && (
            <p className="text-xs font-semibold text-amber-800 mt-1">
              {sinRecolector} {sinRecolector === 1 ? 'día con horario no tiene' : 'días con horario no tienen'} recolector
            </p>
          )}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEditar}>
          <Icon name="edit" className="text-[18px]" /> Editar
        </button>
      </div>

      {/* ⚡ ACCIÓN A4 — PUT /api/admin/zonas/{id}/dias/{diaSemana}/recolector · Z3 GET /api/admin/recolectores */}
      <div data-dyn="Z3 · GET /admin/recolectores" className="flex flex-col divide-y divide-surface-container">
        {z.dias.map((d) => (
          <div key={d.diaSemana} className="py-2.5 grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[96px_200px_minmax(0,1fr)] gap-x-3 gap-y-2 items-center">
            <span className="font-semibold text-sm">{DIAS_SEMANA[d.diaSemana - 1]}</span>
            <select
              className={`input !h-9 text-sm ${d.franjas.length && !d.recolector ? 'ring-2 ring-amber-400' : ''}`}
              value={d.recolector?.id ?? ''}
              disabled={diaGuardando === d.diaSemana}
              onChange={(e) => cambiar(d.diaSemana, e.target.value)}
            >
              <option value="">— Nadie —</option>
              {recolectores.map((r) => {
                const ocupado = r.diasOcupados.find((o) => o.diaSemana === d.diaSemana && o.zonaId !== z.id)
                return (
                  <option key={r.id} value={r.id} disabled={Boolean(ocupado)}>
                    {r.zonaPreferida?.id === z.id ? '★ ' : ''}
                    {r.nombre}
                    {ocupado ? ` (en ${ocupado.zona})` : ''}
                  </option>
                )
              })}
            </select>
            <div className="col-span-2 sm:col-span-1 flex flex-wrap items-center gap-1.5">
              {d.franjas.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFranja(d.diaSemana, f)}
                  className="h-8 px-3 rounded-full bg-surface-container-low hover:bg-surface-container text-xs font-medium"
                  title="Editar franja"
                >
                  {formatFranja(f.horaInicio, f.horaFin)} <span className="text-on-surface-variant">· {f.capacidad}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => onFranja(d.diaSemana, null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10"
                title="Añadir franja"
                aria-label={`Añadir franja el ${DIAS_SEMANA[d.diaSemana - 1]}`}
              >
                <Icon name="add" className="text-[18px]" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {asignarState.error && <Alert>{asignarState.error.message}</Alert>}
      <p className="text-xs text-on-surface-variant">
        ★ = es su zona preferida · El número de cada franja es su capacidad (recogidas que caben). Al cambiar el recolector de un día, sus recogidas pendientes pasan al nuevo.
      </p>
    </section>
  )
}

function ZonaModal({ zona, cps, onClose, onDone }) {
  const toast = useToast()
  const [nombre, setNombre] = useState(zona?.nombre ?? '')
  const [seleccion, setSeleccion] = useState(zona?.codigosPostales ?? [])
  const [filtro, setFiltro] = useState('')
  const [guardar, state] = useAction((data) => (zona ? adminService.editarZona(zona.id, data) : adminService.crearZona(data)))
  const [borrar, borrarState] = useAction(adminService.borrarZona)
  const error = state.error ?? borrarState.error

  const toggle = (cp) => setSeleccion((s) => (s.includes(cp) ? s.filter((x) => x !== cp) : [...s, cp]))
  const visibles = cps.filter((c) => `${c.cp} ${c.barrio}`.toLowerCase().includes(filtro.toLowerCase()))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await guardar({ nombre, codigosPostales: seleccion })
      toast(zona ? 'Zona actualizada' : `Zona ${nombre} creada. Ahora asígnale recolector y horarios.`)
      onDone()
    } catch {
      /* error debajo */
    }
  }

  return (
    <Modal open onClose={onClose} title={zona ? `Editar ${zona.nombre}` : 'Nueva zona'} panelClassName="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl p-5 shadow-xl max-h-[92vh] overflow-y-auto">
      {/* ⚡ ACCIONES A1 / A2 / A3 — POST /api/admin/zonas · PUT / DELETE /api/admin/zonas/{id} */}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormField label="Nombre de la zona" placeholder="Ej. Campanillas" value={nombre} onChange={(e) => setNombre(e.target.value)} error={error?.fieldErrors?.nombre} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="label">Códigos postales ({seleccion.length})</span>
            <input className="input !h-9 !w-48 text-sm" placeholder="Buscar CP o barrio" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
            {visibles.map((c) => {
              const deOtra = c.zona && c.zona.id !== zona?.id
              const marcado = seleccion.includes(c.cp)
              return (
                <label
                  key={c.cp}
                  className={`flex items-center gap-2 p-2 rounded-xl text-sm ${deOtra ? 'opacity-50' : 'cursor-pointer hover:bg-surface-container-low'} ${marcado ? 'bg-primary/10' : ''}`}
                >
                  <input type="checkbox" className="accent-primary w-4 h-4" disabled={deOtra} checked={marcado} onChange={() => toggle(c.cp)} />
                  <span className="font-semibold">{c.cp}</span>
                  <span className="text-on-surface-variant truncate">{c.barrio}</span>
                  {deOtra && <span className="ml-auto text-xs whitespace-nowrap">{c.zona.nombre}</span>}
                </label>
              )
            })}
          </div>
          {error?.fieldErrors?.codigosPostales && <p className="text-sm text-error">{error.fieldErrors.codigosPostales}</p>}
        </div>
        {error && !error.fieldErrors && <Alert>{error.message}</Alert>}
        <div className="flex gap-2">
          {zona && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={borrarState.loading}
              onClick={async () => {
                try {
                  await borrar(zona.id)
                  toast('Zona borrada')
                  onDone()
                } catch {
                  /* error arriba */
                }
              }}
            >
              <Icon name="delete" className="text-[18px]" /> Borrar
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1" disabled={state.loading}>
            {state.loading && <Spinner />} {zona ? 'Guardar' : 'Crear zona'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FranjaModal({ zonaId, diaSemana, franja, onClose, onDone }) {
  const toast = useToast()
  const [form, setForm] = useState(() => franja ?? { diaSemana, horaInicio: '10:00', horaFin: '12:00', capacidad: 5 })
  const [guardar, guardarState] = useAction((data) => (franja ? adminService.editarFranja(franja.id, data) : adminService.crearFranja(zonaId, data)))
  const [borrar, borrarState] = useAction(adminService.borrarFranja)
  const error = guardarState.error ?? borrarState.error

  const submit = async (e) => {
    e.preventDefault()
    try {
      onDone(await guardar({ diaSemana: Number(form.diaSemana), horaInicio: form.horaInicio, horaFin: form.horaFin, capacidad: Number(form.capacidad) }))
      toast(franja ? 'Franja actualizada' : 'Franja añadida')
    } catch {
      /* error debajo */
    }
  }

  return (
    <Modal open onClose={onClose} title={franja ? 'Editar franja' : `Nueva franja · ${DIAS_SEMANA[diaSemana - 1]}`}>
      {/* ⚡ ACCIÓN A5 — POST /api/admin/zonas/{id}/franjas · PUT / DELETE /api/admin/franjas/{id} */}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="label">Día</span>
          <select className="input" value={form.diaSemana} onChange={(e) => setForm((f) => ({ ...f, diaSemana: e.target.value }))}>
            {DIAS_SEMANA.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Desde" type="time" value={form.horaInicio} onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))} error={error?.fieldErrors?.horaInicio} />
          <FormField label="Hasta" type="time" value={form.horaFin} onChange={(e) => setForm((f) => ({ ...f, horaFin: e.target.value }))} error={error?.fieldErrors?.horaFin} />
        </div>
        <FormField
          label="Capacidad (recogidas en esta franja)"
          type="number"
          min="1"
          value={form.capacidad}
          onChange={(e) => setForm((f) => ({ ...f, capacidad: e.target.value }))}
          error={error?.fieldErrors?.capacidad}
        />
        {franja && <p className="text-xs text-on-surface-variant">Las recogidas ya confirmadas en esta franja se mantienen aunque la cambies o la borres.</p>}
        {error && !error.fieldErrors && <Alert>{error.message}</Alert>}
        <div className="flex gap-2">
          {franja && (
            <button
              type="button"
              className="btn btn-danger"
              disabled={borrarState.loading}
              onClick={async () => {
                try {
                  onDone(await borrar(franja.id))
                  toast('Franja borrada')
                } catch {
                  /* error arriba */
                }
              }}
            >
              <Icon name="delete" className="text-[18px]" />
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1" disabled={guardarState.loading}>
            {guardarState.loading && <Spinner />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}
