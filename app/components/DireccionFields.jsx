import { useApi } from '../hooks/useApi'
import { configService } from '../api/configService'
import { FormField } from './ui/FormField'
import { TIPOS_VIA } from '../utils/direccion'

/**
 * Campos de dirección: tipo de vía, nombre de la vía, número, piso, letra, ciudad y código postal.
 * El código postal es una lista cerrada del catálogo de Málaga (GET /api/catalogo/codigos-postales);
 * los que aún no tienen zona salen como "próximamente" pero se pueden elegir (el backend vuelve a validarlo).
 */
export default function DireccionFields({ value, onChange, errors = {} }) {
  const cps = useApi(() => configService.getCodigosPostales(), [])
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  const seleccionado = cps.data?.find((c) => c.cp === value.codigoPostal)

  return (
    <div className="grid grid-cols-6 gap-3">
      <label className="col-span-6 sm:col-span-2 flex flex-col gap-1">
        <span className="label">Tipo de vía</span>
        <select className={`input ${errors.tipoVia ? 'ring-2 ring-error/60' : ''}`} value={value.tipoVia} onChange={set('tipoVia')}>
          {TIPOS_VIA.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <FormField className="col-span-6 sm:col-span-4" label="Nombre de la vía" placeholder="Ej. Granada" value={value.nombreVia} onChange={set('nombreVia')} error={errors.nombreVia} autoComplete="address-line1" />
      <FormField className="col-span-2" label="Número" value={value.numero} onChange={set('numero')} error={errors.numero} />
      <FormField className="col-span-2" label="Piso" placeholder="Ej. 3º" value={value.piso} onChange={set('piso')} hint="Opcional" />
      <FormField className="col-span-2" label="Letra" placeholder="Ej. B" value={value.letra} onChange={set('letra')} hint="Opcional" />
      {/* ⚡ ZONA DINÁMICA — GET /api/catalogo/codigos-postales (lista cerrada: solo CP del catálogo) */}
      <label className="col-span-6 sm:col-span-3 flex flex-col gap-1" data-dyn="GET /catalogo/codigos-postales">
        <span className="label">Código postal</span>
        <select
          className={`input ${errors.codigoPostal ? 'ring-2 ring-error/60' : ''}`}
          value={value.codigoPostal}
          onChange={set('codigoPostal')}
          autoComplete="postal-code"
        >
          <option value="">{cps.loading ? 'Cargando…' : 'Elige tu código postal'}</option>
          {cps.data?.map((c) => (
            <option key={c.cp} value={c.cp}>
              {c.cp} · {c.barrio}
              {c.conServicio ? '' : ' (próximamente)'}
            </option>
          ))}
        </select>
        {errors.codigoPostal ? (
          <span className="text-xs text-error">{errors.codigoPostal}</span>
        ) : (
          seleccionado && !seleccionado.conServicio && <span className="text-xs text-amber-700">Aún no recogemos aquí. Te avisaremos cuando lleguemos.</span>
        )}
      </label>
      <FormField className="col-span-6 sm:col-span-3" label="Ciudad" value={value.ciudad} onChange={set('ciudad')} error={errors.ciudad} autoComplete="address-level2" />
    </div>
  )
}
