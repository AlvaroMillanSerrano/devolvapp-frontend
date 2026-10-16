/**
 * VISTA: Historial de recogidas completadas
 * Ruta: /recolector/historial   Rol: RECOLECTOR
 * HU: HU-04.03 (recogidas finalizadas), HU-04.04 (resultado de las bolsas)
 *
 * ZONAS DINÁMICAS
 *  [Z1] CO2 evitado con mis recogidas ..... GET /api/recolector/impacto (lo carga el layout: useOutletContext)
 *  [Z2] Recogidas completadas ............. GET /api/recolector/historial?page=
 */
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { recolectorService } from '../../api/recolectorService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Icon from '../../components/ui/Icon'
import Paginacion from '../../components/ui/Paginacion'
import { ImpactoHero } from '../../components/impacto/Impacto'
import { formatCo2, formatDireccion, formatRelativeDateTime } from '../../utils/format'

export default function HistorialPage() {
  const { impacto } = useOutletContext()
  const [page, setPage] = useState(0)
  const historial = useApi(() => recolectorService.getHistorial({ page, size: 10 }), [page])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Historial</h1>
      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/recolector/impacto */}
      <div data-dyn="Z1 · GET /recolector/impacto">
        <ImpactoHero impacto={impacto} titulo="Con tus recogidas has evitado" subtitulo={impacto ? `${impacto.recogidas} recogidas completadas` : null} />
      </div>

      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/recolector/historial */}
      <div data-dyn="Z2 · GET /recolector/historial" className="card !p-0 overflow-hidden">
        <Async state={historial} fallback={<Skeleton className="h-72" />}>
          {(p) =>
            p.content.length ? (
              <>
                {p.content.map((r) => (
                  <Link
                    key={r.id}
                    to={`/recolector/recogidas/${r.id}`}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-surface-container-low border-b border-surface-container last:border-0"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary-container/60 flex items-center justify-center shrink-0">
                      <Icon name="task_alt" className="text-[20px] text-on-secondary-container" />
                    </span>
                    <span className="flex-1 min-w-0 text-sm">
                      <span className="block font-semibold truncate">{formatDireccion(r.direccion, { conCiudad: false })}</span>
                      <span className="block text-on-surface-variant">
                        {r.codigo} · {formatRelativeDateTime(r.completadoEn)} · {r.envasesValidos} envases
                        {r.tieneIncidencias && <Icon name="report" className="text-[16px] text-error align-[-3px] ml-1" />}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-primary flex items-center gap-1 shrink-0">
                      <Icon name="eco" filled className="text-[16px]" /> {formatCo2(r.co2EvitadoKg)}
                    </span>
                  </Link>
                ))}
                <Paginacion page={p} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon="history" title="Aún no has completado recogidas" className="!rounded-none" />
            )
          }
        </Async>
      </div>
    </div>
  )
}
