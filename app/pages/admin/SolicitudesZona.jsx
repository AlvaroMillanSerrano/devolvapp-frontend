/**
 * VISTA: Bloque «Solicitudes de cambio de zona» (en Pendientes y en Zonas)
 * Ruta: /admin/pendientes · /admin/zonas   Rol: ADMIN
 * HU: HU-07.06 (asignación de recolectores por zona)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Solicitudes pendientes ....... GET /api/admin/solicitudes-zona?estado=PENDIENTE
 *
 * ACCIONES
 *  [A1] Aprobar / rechazar ........... POST /api/admin/solicitudes-zona/{id}/resolver
 */
import { useState } from 'react'
import { useApi, useAction } from '../../hooks/useApi'
import { adminService } from '../../api/adminService'
import Async, { Skeleton } from '../../components/ui/Async'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { useToast } from '../../components/ui/toastContext'
import { DIAS_SEMANA, formatRelativeDateTime } from '../../utils/format'

export default function SolicitudesZona({ onChanged, vacio = null }) {
  const lista = useApi(() => adminService.getSolicitudesZona({ estado: 'PENDIENTE' }), [])
  return (
    // ⚡ ZONA DINÁMICA Z1 — GET /api/admin/solicitudes-zona?estado=PENDIENTE
    <div data-dyn="Z1 · GET /admin/solicitudes-zona" className="flex flex-col gap-3">
      <Async state={lista} fallback={<Skeleton className="h-24" />}>
        {(items) =>
          items.length === 0
            ? vacio
            : items.map((s) => (
                <Solicitud
                  key={s.id}
                  s={s}
                  onDone={() => {
                    lista.reload()
                    onChanged?.()
                  }}
                />
              ))
        }
      </Async>
    </div>
  )
}

function Solicitud({ s, onDone }) {
  const toast = useToast()
  const [modo, setModo] = useState(null) // 'aprobar' | 'rechazar'
  const [respuesta, setRespuesta] = useState('')
  const [moverDias, setMoverDias] = useState(false)
  const [resolver, state] = useAction(adminService.resolverSolicitudZona)

  const enviar = async () => {
    try {
      const res = await resolver(s.id, { aprobar: modo === 'aprobar', moverDias, respuesta })
      const conflicto = res.diasEnConflicto.length ? ` (${res.diasEnConflicto.map((d) => DIAS_SEMANA[d - 1]).join(', ')} ya tenía recolector: revísalo en Zonas)` : ''
      toast(modo === 'aprobar' ? `Cambio aprobado${conflicto}` : 'Solicitud rechazada')
      onDone()
    } catch {
      /* error debajo */
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon name="swap_horiz" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{s.recolector.nombre}</p>
          <p className="text-sm">
            {s.zonaActual?.nombre ?? 'Sin zona'} → <strong>{s.zonaSolicitada.nombre}</strong>
          </p>
          {s.motivo && <p className="text-sm text-on-surface-variant mt-1">«{s.motivo}»</p>}
          <p className="text-xs text-on-surface-variant mt-1">{formatRelativeDateTime(s.creadaEn)}</p>
        </div>
      </div>
      {modo ? (
        // ⚡ ACCIÓN A1 — POST /api/admin/solicitudes-zona/{id}/resolver
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-low p-3">
          {modo === 'aprobar' && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-primary w-4 h-4 mt-0.5" checked={moverDias} onChange={(e) => setMoverDias(e.target.checked)} />
              Pasar sus días de recogida a {s.zonaSolicitada.nombre} (si esos días están libres allí)
            </label>
          )}
          <textarea
            className="input !h-16 py-2 resize-none"
            placeholder={modo === 'aprobar' ? 'Mensaje para el recolector (opcional)' : 'Motivo del rechazo (lo verá el recolector)'}
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
          />
          {state.error && <Alert>{state.error.message}</Alert>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setModo(null)}>
              Volver
            </button>
            <button type="button" className={`btn flex-1 ${modo === 'aprobar' ? 'btn-primary' : 'btn-danger'}`} disabled={state.loading} onClick={enviar}>
              {state.loading && <Spinner />} {modo === 'aprobar' ? 'Aprobar' : 'Rechazar'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" className="btn btn-danger btn-sm flex-1" onClick={() => setModo('rechazar')}>
            Rechazar
          </button>
          <button type="button" className="btn btn-primary btn-sm flex-1" onClick={() => setModo('aprobar')}>
            Aprobar
          </button>
        </div>
      )}
    </div>
  )
}
