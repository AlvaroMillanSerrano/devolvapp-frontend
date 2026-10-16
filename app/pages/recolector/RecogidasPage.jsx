/**
 * VISTA: Mis recogidas
 * Ruta: /recolector   Rol: RECOLECTOR
 * HU: HU-04.01 (recogidas asignadas con fecha, franja, dirección e identificador; las canceladas, marcadas)
 *
 * ZONAS DINÁMICAS
 *  [Z0] CO2 evitado con mis recogidas ....... GET /api/recolector/impacto (lo carga el layout: useOutletContext)
 *  [Z1] Zonas de hoy y resumen del día ...... GET /api/recolector/recogidas → asignaciones, recogidas[] (conteo)
 *  [Z2] Recogidas agrupadas por día ......... GET /api/recolector/recogidas → recogidas[]
 */
import { Link, useOutletContext } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { recolectorService } from '../../api/recolectorService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import Icon from '../../components/ui/Icon'
import { dayDiff, DIAS_SEMANA, formatDireccion, formatFranja, formatRelativeDay } from '../../utils/format'
import { ImpactoDetalle, ImpactoHero } from '../../components/impacto/Impacto'

const HOY = ((new Date().getDay() + 6) % 7) + 1

const agrupar = (lista) => {
  const map = new Map()
  lista.forEach((r) => {
    const key = dayDiff(r.fecha) < 0 ? 'atrasadas' : r.fecha
    map.set(key, [...(map.get(key) ?? []), r])
  })
  return [...map.entries()]
}

export default function RecogidasPage() {
  const data = useApi(() => recolectorService.getRecogidas(), [])
  const { impacto } = useOutletContext()

  return (
    <div className="flex flex-col gap-5">
      <Async state={data} fallback={<Skeleton className="h-96" />}>
        {({ asignaciones, recogidas }) => {
          const zonasHoy = asignaciones.filter((a) => a.dias.includes(HOY)).map((a) => a.zona.nombre)
          const hoy = recogidas.filter((r) => dayDiff(r.fecha) <= 0)
          const porHacer = hoy.filter((r) => r.estado === 'PENDIENTE' || r.estado === 'EN_CAMINO').length
          const hechas = hoy.filter((r) => r.estado === 'COMPLETADA').length
          return (
            <>
              {/* ⚡ ZONA DINÁMICA Z1 — GET /api/recolector/recogidas (resumen) */}
              <section data-dyn="Z1 · GET /recolector/recogidas" className="flex flex-col gap-3">
                <div>
                  <h1 className="text-2xl font-bold">Tus recogidas</h1>
                  <p className="text-on-surface-variant text-sm flex items-center gap-1">
                    <Icon name="map" className="text-[18px]" />
                    {zonasHoy.length ? `Hoy (${DIAS_SEMANA[HOY - 1].toLowerCase()}) recoges en ${zonasHoy.join(' y ')}` : asignaciones.length ? 'Hoy no tienes zona asignada' : 'Administración aún no te ha asignado días'}
                  </p>
                </div>
                {/* ⚡ ZONA DINÁMICA Z0 — GET /api/recolector/impacto */}
                <div data-dyn="Z0 · GET /recolector/impacto">
                  <ImpactoHero impacto={impacto} titulo="Con tus recogidas has evitado" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="card">
                    <p className="text-3xl font-bold">{porHacer}</p>
                    <p className="text-sm text-on-surface-variant">por hacer hoy</p>
                  </div>
                  <div className="card">
                    <p className="text-3xl font-bold text-primary">{hechas}</p>
                    <p className="text-sm text-on-surface-variant">completadas hoy</p>
                  </div>
                  <Link to="/recolector/ruta" className="card hover:bg-surface-container-low flex flex-col justify-between">
                    <Icon name="route" className="text-[28px] text-primary" />
                    <p className="text-sm font-semibold text-primary">Ver mapa y ruta</p>
                  </Link>
                </div>
              </section>

              {/* ⚡ ZONA DINÁMICA Z2 — GET /api/recolector/recogidas (lista) */}
              <div data-dyn="Z2 · GET /recolector/recogidas" className="flex flex-col gap-5">
                {recogidas.length === 0 ? (
                  <EmptyState icon="route" title="No tienes recogidas asignadas">
                    Cuando un ciudadano de tu zona pida una recogida, aparecerá aquí.
                  </EmptyState>
                ) : (
                  agrupar(recogidas).map(([dia, lista]) => (
                    <section key={dia} className="flex flex-col gap-2">
                      <h2 className={`font-bold ${dia === 'atrasadas' ? 'text-error' : ''}`}>
                        {dia === 'atrasadas' ? 'Sin cerrar de días anteriores' : formatRelativeDay(dia)}
                      </h2>
                      {lista.map((r) => (
                        <RecogidaItem key={r.id} r={r} />
                      ))}
                    </section>
                  ))
                )}
              </div>
              <ImpactoDetalle impacto={impacto} className="lg:hidden" />
            </>
          )
        }}
      </Async>
    </div>
  )
}

function RecogidaItem({ r }) {
  const cerrada = r.estado === 'CANCELADA' || r.estado === 'COMPLETADA'
  return (
    <Link
      to={`/recolector/recogidas/${r.id}`}
      className={`card flex items-center gap-3 hover:bg-surface-container-low ${cerrada ? 'opacity-60' : ''} ${
        r.estado === 'EN_CAMINO' ? 'ring-2 ring-sky-400' : ''
      }`}
    >
      <span className="w-14 text-center shrink-0">
        <span className={`block font-bold ${r.estado === 'CANCELADA' ? 'line-through' : ''}`}>{r.horaInicio}</span>
        <span className="block text-xs text-on-surface-variant">{r.horaFin}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-semibold truncate ${r.estado === 'CANCELADA' ? 'line-through' : ''}`}>{formatDireccion(r.direccion, { conCiudad: false })}</span>
        <span className="block text-sm text-on-surface-variant">
          {r.codigo} · {r.numBolsas} {r.numBolsas === 1 ? 'bolsa' : 'bolsas'} · {r.totalEnvases} env. · CP {r.direccion.codigoPostal}
        </span>
        <span className="sr-only">Franja {formatFranja(r.horaInicio, r.horaFin)}</span>
      </span>
      <Estado estado={r.estado} />
    </Link>
  )
}
