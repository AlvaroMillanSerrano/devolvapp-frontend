import { useParametros, useTiposEnvase } from '../../hooks/useParametros'
import { formatCo2, formatMesCorto, formatNumber } from '../../utils/format'
import Icon from '../ui/Icon'
import { Skeleton } from '../ui/Async'

/**
 * Impacto ambiental (CO2 evitado). Los datos llegan del endpoint de impacto de cada rol
 * (GET /api/ciudadano/impacto, /api/recolector/impacto o /api/admin/indicadores → impacto);
 * las equivalencias se calculan con GET /api/config/parametros → impacto.
 */

/** Tarjeta principal: el número grande de CO2 y sus equivalencias */
export function ImpactoHero({ impacto, titulo = 'Has evitado', subtitulo, className = '' }) {
  const parametros = useParametros()
  const p = parametros.data?.impacto
  if (!impacto) return <Skeleton className={`h-44 rounded-3xl ${className}`} />
  const km = p ? impacto.co2EvitadoKg / p.kgCo2PorKmCoche : null
  const arboles = p ? impacto.co2EvitadoKg / p.kgCo2PorArbolAnio : null
  return (
    <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b5d3b] via-primary to-[#2f9e6e] text-white p-5 sm:p-6 shadow-md ${className}`}>
      <Icon name="eco" filled className="absolute -right-6 -top-6 text-[160px] text-white/10 pointer-events-none" />
      <p className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
        <Icon name="eco" filled className="text-[18px] text-secondary-fixed" /> {titulo}
      </p>
      <p className="text-5xl sm:text-6xl font-bold tracking-tight tabular-nums mt-1" style={{ fontFamily: 'Plus Jakarta Sans' }}>
        {formatCo2(impacto.co2EvitadoKg)}
        <span className="text-xl sm:text-2xl font-semibold text-white/80 ml-2">de CO₂</span>
      </p>
      {subtitulo && <p className="text-sm text-white/80 mt-1">{subtitulo}</p>}
      <div className="grid grid-cols-3 gap-2 mt-5">
        <Equivalencia icon="recycling" valor={formatNumber(impacto.envasesReciclados)} texto="envases reciclados" />
        <Equivalencia icon="directions_car" valor={km != null ? formatNumber(Math.round(km)) : '—'} texto="km en coche que no se emiten" />
        <Equivalencia icon="park" valor={arboles != null ? formatNumber(arboles, { maximumFractionDigits: 1 }) : '—'} texto="árboles absorbiendo un año" />
      </div>
    </section>
  )
}

function Equivalencia({ icon, valor, texto }) {
  return (
    <div className="rounded-2xl bg-white/10 p-2.5 sm:p-3">
      <Icon name={icon} className="text-[20px] text-secondary-fixed" />
      <p className="text-lg sm:text-xl font-bold tabular-nums leading-tight mt-0.5">{valor}</p>
      <p className="text-[11px] sm:text-xs text-white/80 leading-tight">{texto}</p>
    </div>
  )
}

/** Detalle: evolución por mes, reparto por tipo de envase y, si hay, comparación con la zona */
export function ImpactoDetalle({ impacto, className = '' }) {
  const tipos = useTiposEnvase()
  if (!impacto) return <Skeleton className={`h-72 ${className}`} />
  const max = Math.max(...impacto.porMes.map((m) => m.co2Kg), 0.001)
  const totalTipos = impacto.porTipo.reduce((s, t) => s + t.co2Kg, 0) || 1
  const nombre = (c) => tipos.data?.find((t) => t.codigo === c)?.nombre ?? c
  const icono = (c) => tipos.data?.find((t) => t.codigo === c)?.icono ?? 'recycling'

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <section className="card flex flex-col gap-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <Icon name="bar_chart" className="text-[18px] text-primary" /> CO₂ evitado por mes
        </h3>
        <div className="flex items-end gap-2 h-28">
          {impacto.porMes.map((m, i) => (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] text-on-surface-variant tabular-nums">{m.co2Kg ? formatCo2(m.co2Kg).replace(' kg', '') : ''}</span>
              <div
                className={`w-full rounded-t-lg ${i === impacto.porMes.length - 1 ? 'bg-primary' : 'bg-primary/35'}`}
                style={{ height: `${Math.max(4, (m.co2Kg / max) * 100)}%` }}
                title={formatCo2(m.co2Kg)}
              />
              <span className="text-[11px] text-on-surface-variant capitalize">{formatMesCorto(m.mes)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col gap-2.5">
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          <Icon name="category" className="text-[18px] text-primary" /> Por tipo de envase
        </h3>
        {impacto.porTipo
          .filter((t) => t.envases > 0)
          .sort((a, b) => b.co2Kg - a.co2Kg)
          .map((t) => (
            <div key={t.tipoEnvase} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Icon name={icono(t.tipoEnvase)} className="text-[16px] text-on-surface-variant" />
                  {nombre(t.tipoEnvase)}
                  <span className="text-xs text-on-surface-variant">· {formatNumber(t.envases)}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatCo2(t.co2Kg)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(t.co2Kg / totalTipos) * 100}%` }} />
              </div>
            </div>
          ))}
        {impacto.envasesReciclados === 0 && <p className="text-sm text-on-surface-variant">Aún no hay envases verificados.</p>}
      </section>

      {impacto.zona && (
        <section className="card flex items-center gap-3 bg-secondary-container/30">
          <Icon name="groups" className="text-[28px] text-on-secondary-container" />
          <p className="text-sm">
            Entre todos los vecinos de <strong>{impacto.zona.nombre}</strong> habéis evitado <strong>{formatCo2(impacto.zona.co2EvitadoKg)}</strong> de CO₂.
          </p>
        </section>
      )}
    </div>
  )
}
