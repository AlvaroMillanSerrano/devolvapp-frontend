/**
 * VISTA: Resumen (indicadores y reparto económico)
 * Ruta: /admin   Rol: ADMIN
 * HU: HU-07.04 (indicadores de recogidas e incidencias por periodo), HU-07.05 (reparto económico por periodo)
 *
 * ZONAS DINÁMICAS
 *  [Z0] CO2 evitado en el periodo y por zona ... GET /api/admin/indicadores?desde=&hasta= → impacto, porZona
 *  [Z1] Recogidas e incidencias del periodo .... GET /api/admin/indicadores?desde=&hasta= → recogidas, incidencias
 *  [Z2] Reparto económico del periodo .......... GET /api/admin/indicadores?desde=&hasta= → economia
 *  [Z3] Porcentajes del reparto ................ GET /api/config/parametros → economia
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useParametros } from '../../hooks/useParametros'
import { adminService } from '../../api/adminService'
import Async, { Skeleton } from '../../components/ui/Async'
import Icon from '../../components/ui/Icon'
import { formatCo2, formatEUR, formatNumber, formatPct, toYmd } from '../../utils/format'
import { ImpactoDetalle, ImpactoHero } from '../../components/impacto/Impacto'

const hace = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return toYmd(d)
}
const HOY = toYmd(new Date())
const PERIODOS = [
  ['7', 'Últimos 7 días', () => ({ desde: hace(6), hasta: HOY })],
  ['30', 'Últimos 30 días', () => ({ desde: hace(29), hasta: HOY })],
  ['mes', 'Este mes', () => ({ desde: `${HOY.slice(0, 8)}01`, hasta: HOY })],
  ['otro', 'Elegir fechas', null],
]

export default function ResumenPage() {
  const [preset, setPreset] = useState('30')
  const [rango, setRango] = useState(PERIODOS[1][2]())
  const datos = useApi(() => adminService.getIndicadores(rango), [rango.desde, rango.hasta])
  const parametros = useParametros()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Resumen</h1>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map(([key, label, fn]) => (
          <button
            key={key}
            type="button"
            className={`chip ${preset === key ? 'chip-active' : ''}`}
            onClick={() => {
              setPreset(key)
              if (fn) setRango(fn())
            }}
          >
            {label}
          </button>
        ))}
        {preset === 'otro' && (
          <div className="flex items-center gap-2">
            <input type="date" className="input !h-9 !w-auto" value={rango.desde} max={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
            <span className="text-on-surface-variant">a</span>
            <input type="date" className="input !h-9 !w-auto" value={rango.hasta} min={rango.desde} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
          </div>
        )}
      </div>

      <Async state={datos} fallback={<Skeleton className="h-80" />}>
        {(d) => (
          <div className={`flex flex-col gap-5 transition-opacity ${datos.loading ? 'opacity-50' : ''}`}>
            {/* ⚡ ZONA DINÁMICA Z0 — GET /api/admin/indicadores (impacto, porZona) */}
            <section data-dyn="Z0 · impacto · porZona" className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
              <ImpactoHero
                impacto={d.impacto}
                titulo="En este periodo, DevolvUp ha evitado"
                subtitulo={`${formatCo2(d.impacto.totalHistoricoKg)} de CO₂ desde el inicio del servicio`}
              />
              <div className="card flex flex-col gap-2.5">
                <h2 className="font-bold text-sm flex items-center gap-1.5">
                  <Icon name="map" className="text-[18px] text-primary" /> CO₂ evitado por zona
                </h2>
                {[...d.porZona]
                  .sort((a, b) => b.co2Kg - a.co2Kg)
                  .map((z) => (
                    <div key={z.zona} className="flex flex-col gap-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{z.zona}</span>
                        <span className="font-semibold tabular-nums">{formatCo2(z.co2Kg)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(z.co2Kg / Math.max(...d.porZona.map((x) => x.co2Kg), 0.001)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </section>
            {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/indicadores (recogidas, incidencias) */}
            <section data-dyn="Z1 · GET /admin/indicadores" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kpi icon="receipt_long" label="Recogidas solicitadas" value={d.recogidas.solicitadas} />
              <Kpi icon="task_alt" label="Completadas" value={d.recogidas.completadas} tone="text-primary" />
              <Kpi icon="cancel" label="Canceladas" value={d.recogidas.canceladas} />
              <Kpi icon="schedule" label="Pendientes o en camino" value={d.recogidas.enCurso} />
              <Link to="/admin/incidencias" className="col-span-2 lg:col-span-1">
                <Kpi icon="report" label={`Incidencias · ${d.incidencias.abiertas} sin resolver`} value={d.incidencias.registradas} tone="text-error" />
              </Link>
            </section>

            {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/indicadores (economia) + Z3 GET /api/config/parametros */}
            <section data-dyn="Z2 · economia · Z3 GET /config/parametros" className="card flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-bold">Reparto económico</h2>
                {parametros.data && (
                  <span className="text-xs text-on-surface-variant">
                    {formatEUR(parametros.data.economia.importePorEnvase)} por envase válido · {formatPct(parametros.data.economia.porcentajeEmpresa)} empresa ·{' '}
                    {formatPct(parametros.data.economia.porcentajeCiudadano)} ciudadanos
                    {parametros.data.economia.provisional && ' (provisional)'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Dato label="Envases válidos" value={formatNumber(d.economia.envasesValidos)} />
                <Dato label="Importe generado" value={formatEUR(d.economia.importeTotal)} />
                <Dato label="Parte empresa" value={formatEUR(d.economia.parteEmpresa)} />
                <Dato label="Parte ciudadanos" value={formatEUR(d.economia.parteCiudadanos)} />
              </div>
              {d.economia.importeTotal > 0 && (
                <div className="h-3 rounded-full overflow-hidden flex bg-surface-container">
                  <div className="bg-primary" style={{ width: `${(d.economia.parteEmpresa / d.economia.importeTotal) * 100}%` }} title="Empresa" />
                  <div className="bg-secondary-fixed-dim" style={{ width: `${(d.economia.parteCiudadanos / d.economia.importeTotal) * 100}%` }} title="Ciudadanos" />
                </div>
              )}
            </section>

            <ImpactoDetalle impacto={d.impacto} className="lg:!grid lg:grid-cols-2" />
          </div>
        )}
      </Async>
    </div>
  )
}

function Kpi({ icon, label, value, tone = '' }) {
  return (
    <div className="card h-full flex flex-col gap-1">
      <Icon name={icon} className={`text-[22px] ${tone || 'text-on-surface-variant'}`} />
      <span className={`text-3xl font-bold tabular-nums ${tone}`}>{formatNumber(value)}</span>
      <span className="text-sm text-on-surface-variant">{label}</span>
    </div>
  )
}

const Dato = ({ label, value }) => (
  <div className="rounded-xl bg-surface-container-low p-3">
    <p className="text-xs text-on-surface-variant">{label}</p>
    <p className="text-xl font-bold tabular-nums">{value}</p>
  </div>
)
