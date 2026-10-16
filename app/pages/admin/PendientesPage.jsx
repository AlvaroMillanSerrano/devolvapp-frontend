/**
 * VISTA: Pendientes (bandeja de administración)
 * Ruta: /admin/pendientes   Rol: ADMIN
 * HU: HU-05.04 / HU-07.03 (transferencias por aceptar), HU-06.03 (incidencias), HU-07.06 (zonas sin recolector y cambios de zona)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Contadores de tareas ............ GET /api/admin/pendientes
 *  [Z2] Días sin recolector ............. GET /api/admin/pendientes → diasSinRecolector[]
 *  [Z3] Solicitudes de cambio de zona ... ver SolicitudesZona.jsx (GET /api/admin/solicitudes-zona)
 */
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { adminService } from '../../api/adminService'
import Async, { Skeleton } from '../../components/ui/Async'
import Icon from '../../components/ui/Icon'
import SolicitudesZona from './SolicitudesZona'
import { DIAS_SEMANA, formatEUR } from '../../utils/format'

export default function PendientesPage() {
  const p = useApi(() => adminService.getPendientes(), [])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Pendientes</h1>
        <p className="text-on-surface-variant text-sm">Todo lo que está esperando una decisión tuya.</p>
      </div>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/pendientes */}
      <div data-dyn="Z1 · GET /admin/pendientes">
        <Async state={p} fallback={<Skeleton className="h-40" />}>
          {(d) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <Tarea
                to="/admin/pagos?estado=PENDIENTE"
                icon="payments"
                n={d.transferencias.total}
                titulo="Transferencias por aceptar"
                detalle={d.transferencias.total ? `${formatEUR(d.transferencias.importe)} en total` : 'Todo pagado'}
              />
              <Tarea to="/admin/incidencias?estado=ABIERTA" icon="report" n={d.incidenciasAbiertas} titulo="Incidencias abiertas" detalle="Sin revisar todavía" />
              <Tarea to="/admin/recogidas?estado=ATRASADAS" icon="schedule" n={d.recogidasAtrasadas} titulo="Recogidas sin cerrar de días pasados" detalle="Pendientes o en camino" />
              <Tarea to="/admin/recogidas?estado=SIN_RECOLECTOR" icon="person_off" n={d.recogidasSinRecolector} titulo="Recogidas sin recolector" detalle="Asigna a alguien en la recogida o en Zonas" />
            </div>
          )}
        </Async>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Cambios de zona solicitados</h2>
        <SolicitudesZona onChanged={p.reload} vacio={<p className="text-sm text-on-surface-variant">No hay solicitudes pendientes.</p>} />
      </section>

      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/pendientes (diasSinRecolector) */}
      {p.data?.diasSinRecolector.length > 0 && (
        <section data-dyn="Z2 · diasSinRecolector" className="card flex flex-col gap-3">
          <h2 className="font-bold flex items-center gap-2">
            <Icon name="warning" className="text-amber-700" /> Días con horario pero sin recolector
          </h2>
          <p className="text-sm text-on-surface-variant">Los ciudadanos de estas zonas no pueden pedir recogida esos días.</p>
          <div className="flex flex-wrap gap-2">
            {p.data.diasSinRecolector.map((x) => (
              <Link key={`${x.zona.id}-${x.diaSemana}`} to={`/admin/zonas?zona=${x.zona.id}`} className="chip">
                {x.zona.nombre} · {DIAS_SEMANA[x.diaSemana - 1]}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Tarea({ to, icon, n, titulo, detalle }) {
  return (
    <Link to={to} className={`card flex items-start gap-3 hover:bg-surface-container-low ${n ? 'ring-2 ring-error/30' : ''}`}>
      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${n ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'}`}>
        <Icon name={icon} />
      </span>
      <span className="flex-1">
        <span className="block text-3xl font-bold tabular-nums">{n}</span>
        <span className="block font-semibold text-sm">{titulo}</span>
        <span className="block text-xs text-on-surface-variant">{detalle}</span>
      </span>
    </Link>
  )
}
