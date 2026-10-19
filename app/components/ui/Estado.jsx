import Icon from './Icon'
import { ESTADOS, TRANSFERENCIA } from './estados'

/** Píldora de estado (pedido, incidencia, transferencia, cuenta o bolsa). */
export default function Estado({ estado, transferencia = false, className = '' }) {
  const meta = { ...(ESTADOS[estado] ?? { label: estado, icon: 'circle', cls: 'bg-surface-container text-on-surface' }), ...(transferencia ? TRANSFERENCIA[estado] : null) }
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap ${meta.cls} ${className}`}>
      <Icon name={meta.icon} className="text-[14px]" />
      {meta.label}
    </span>
  )
}
