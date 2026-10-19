import { Link } from 'react-router-dom'
import Estado from '../../components/ui/Estado'
import Icon from '../../components/ui/Icon'
import { formatEUR, formatFranja, formatRelativeDay } from '../../utils/format'

/** Tarjeta de un pedido en las listas del ciudadano (datos de GET /api/ciudadano/pedidos). */
export default function PedidoCard({ pedido: p }) {
  return (
    <Link to={`/ciudadano/pedidos/${p.id}`} className="card flex items-center gap-3 hover:bg-surface-container-low transition-colors">
      <span className="w-11 h-11 rounded-2xl bg-surface-container flex items-center justify-center shrink-0">
        <Icon name={p.estado === 'EN_CAMINO' ? 'two_wheeler' : 'shopping_bag'} className="text-[22px] text-primary" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          {p.fecha && p.horaInicio && p.horaFin ? (
            <><span className="font-semibold">{formatRelativeDay(p.fecha)}</span><span className="text-sm text-on-surface-variant">{formatFranja(p.horaInicio, p.horaFin)}</span></>
          ) : <span className="font-semibold">Pendiente de programación</span>}
        </span>
        <span className="block text-sm text-on-surface-variant">
          {p.codigo} · {p.numBolsas} {p.numBolsas === 1 ? 'bolsa' : 'bolsas'} · {p.totalEnvases} envases
          {p.tieneIncidencias && <Icon name="report" className="text-[16px] text-error align-[-3px] ml-1" title="Tiene incidencias" />}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1 shrink-0">
        <Estado estado={p.estado} />
        {p.importeCiudadano != null && <span className="text-sm font-bold text-primary tabular-nums">+{formatEUR(p.importeCiudadano)}</span>}
      </span>
    </Link>
  )
}
