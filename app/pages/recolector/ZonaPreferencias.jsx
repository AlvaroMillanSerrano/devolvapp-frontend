import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useApi, useAction } from '../../hooks/useApi'
import { recolectorService } from '../../api/recolectorService'
import Async, { Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { useToast } from '../../components/ui/toastContext'
import { DIAS_SEMANA, formatRelativeDateTime } from '../../utils/format'

/**
 * VISTA: Bloque «Mi zona» del perfil del recolector
 * Ruta: /recolector/perfil   Rol: RECOLECTOR
 * HU: HU-07.06 (zona preferida y solicitud de cambio)
 *
 * ZONAS DINÁMICAS
 *  [Z2] Zona preferida, días por zona y solicitudes .... GET /api/recolector/preferencias
 *
 * ACCIONES
 *  [A3] Pedir cambio de zona ........................... POST /api/recolector/solicitudes-zona
 *  [A4] Cancelar mi solicitud .......................... POST /api/recolector/solicitudes-zona/{id}/cancelar
 */
export default function ZonaPreferencias() {
  const toast = useToast()
  const { refreshUser } = useAuth()
  const prefs = useApi(() => recolectorService.getPreferencias(), [])
  const [form, setForm] = useState({ zonaId: '', motivo: '' })
  const [abierto, setAbierto] = useState(false)
  const [solicitar, solState] = useAction(recolectorService.solicitarCambioZona)
  const [cancelar, cancelState] = useAction(recolectorService.cancelarSolicitudZona)

  const enviar = async (e) => {
    e.preventDefault()
    try {
      prefs.setData(await solicitar({ zonaId: Number(form.zonaId), motivo: form.motivo }))
      setAbierto(false)
      setForm({ zonaId: '', motivo: '' })
      toast('Solicitud enviada a administración')
    } catch {
      /* error debajo */
    }
  }

  return (
    // ⚡ ZONA DINÁMICA Z2 — GET /api/recolector/preferencias
    <div data-dyn="Z2 · GET /recolector/preferencias" className="card flex flex-col gap-4 ring-2 ring-primary/20">
      <h2 className="font-bold flex items-center gap-2">
        <Icon name="map" className="text-primary" /> Mi zona
      </h2>
      <Async state={prefs} fallback={<Skeleton className="h-40" />}>
        {(p) => {
          const pendiente = p.solicitudes.find((s) => s.estado === 'PENDIENTE')
          return (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p>
                  Zona preferida: <strong className="text-lg">{p.zonaPreferida?.nombre ?? '—'}</strong>
                </p>
                {!pendiente && !abierto && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAbierto(true)}>
                    <Icon name="swap_horiz" className="text-[18px]" /> Pedir cambio de zona
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="label">Días en los que recoges</p>
                {p.asignaciones.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Administración todavía no te ha asignado días.</p>
                ) : (
                  p.asignaciones.map((a) => (
                    <div key={a.zona.id} className="flex items-center gap-3 flex-wrap text-sm">
                      <span className="font-semibold w-44">{a.zona.nombre}</span>
                      <span className="flex gap-1">
                        {DIAS_SEMANA.map((d, i) => (
                          <span
                            key={d}
                            title={d}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              a.dias.includes(i + 1) ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'
                            }`}
                          >
                            {d.slice(0, 2)}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {abierto && (
                // ⚡ ACCIÓN A3 — POST /api/recolector/solicitudes-zona
                <form onSubmit={enviar} className="rounded-2xl bg-surface-container-low p-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="label">¿A qué zona quieres cambiarte?</span>
                    <select className="input" required value={form.zonaId} onChange={(e) => setForm((f) => ({ ...f, zonaId: e.target.value }))}>
                      <option value="">Elige una zona</option>
                      {p.zonas
                        .filter((z) => z.id !== p.zonaPreferida?.id)
                        .map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.nombre} (CP {z.codigosPostales.join(', ')})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="label">Motivo (opcional)</span>
                    <textarea className="input !h-20 py-2 resize-none" placeholder="Ej. me he mudado" value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
                  </label>
                  <p className="text-xs text-on-surface-variant">Administración revisará la solicitud. Hasta entonces sigues con tus días actuales.</p>
                  {solState.error && <Alert>{solState.error.message}</Alert>}
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary flex-1" onClick={() => setAbierto(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={!form.zonaId || solState.loading}>
                      {solState.loading && <Spinner />} Enviar solicitud
                    </button>
                  </div>
                </form>
              )}

              {p.solicitudes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="label">Mis solicitudes</p>
                  {p.solicitudes.map((s) => (
                    <div key={s.id} className="rounded-xl bg-surface-container-low p-3 flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {s.zonaActual?.nombre ?? '—'} → <strong>{s.zonaSolicitada.nombre}</strong>
                        </span>
                        <Estado estado={s.estado} />
                      </div>
                      <span className="text-xs text-on-surface-variant">Enviada {formatRelativeDateTime(s.creadaEn).toLowerCase()}</span>
                      {s.respuesta && <p>Respuesta: {s.respuesta}</p>}
                      {s.estado === 'PENDIENTE' && (
                        // ⚡ ACCIÓN A4 — POST /api/recolector/solicitudes-zona/{id}/cancelar
                        <button
                          type="button"
                          className="text-sm font-semibold text-error self-start"
                          disabled={cancelState.loading}
                          onClick={async () => {
                            try {
                              prefs.setData(await cancelar(s.id))
                              refreshUser()
                              toast('Solicitud cancelada')
                            } catch {
                              /* sin cambios */
                            }
                          }}
                        >
                          Cancelar solicitud
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        }}
      </Async>
    </div>
  )
}
