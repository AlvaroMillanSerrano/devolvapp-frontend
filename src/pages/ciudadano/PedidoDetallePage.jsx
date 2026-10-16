/**
 * VISTA: Detalle de un pedido
 * Ruta: /ciudadano/pedidos/:id   Rol: CIUDADANO
 * HU: HU-02.02 (código de cada bolsa), HU-02.03 (composición), HU-03.03 (estado), HU-03.04 (cancelar), HU-05.02 (importe abonado), HU-06.04 (incidencias del pedido)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Estado y seguimiento ........ GET /api/ciudadano/pedidos/{id} → estado, creadoEn, iniciadoEn, completadoEn, canceladoEn
 *  [Z2] Bolsas del pedido ........... GET /api/ciudadano/pedidos/{id} → bolsas[]
 *  [Z3] Importe abonado y CO2 ........ GET /api/ciudadano/pedidos/{id} → liquidacion, co2EvitadoKg
 *  [Z4] Incidencias ................. GET /api/ciudadano/pedidos/{id} → incidencias[]
 *  [Z5] Tipos de envase (nombres) ... GET /api/catalogo/tipos-envase
 *
 * ACCIONES
 *  [A1] Cancelar pedido ............. POST /api/ciudadano/pedidos/{id}/cancelar
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApi, useAction } from '../../hooks/useApi'
import { useTiposEnvase } from '../../hooks/useParametros'
import { ciudadanoService } from '../../api/ciudadanoService'
import Async, { Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toastContext'
import { formatCo2, formatDate, formatDireccion, formatEUR, formatFranja, formatRelativeDateTime, formatRelativeDay } from '../../utils/format'

const PASOS = [
  ['PENDIENTE', 'Pedido confirmado', 'creadoEn'],
  ['EN_CAMINO', 'Recolector en camino', 'iniciadoEn'],
  ['COMPLETADA', 'Recogido y verificado', 'completadoEn'],
]

export default function PedidoDetallePage() {
  const { id } = useParams()
  const toast = useToast()
  const pedido = useApi(() => ciudadanoService.getPedido(id), [id])
  const tipos = useTiposEnvase()
  const [confirmar, setConfirmar] = useState(false)
  const [cancelar, cancelarState] = useAction(ciudadanoService.cancelarPedido)

  const nombreTipo = (codigo) => tipos.data?.find((t) => t.codigo === codigo)?.nombre ?? codigo

  const handleCancelar = async () => {
    try {
      const p = await cancelar(id)
      pedido.setData(p)
      setConfirmar(false)
      toast('Pedido cancelado')
    } catch {
      /* el error se muestra en el modal */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/ciudadano/pedidos" className="self-start text-sm font-semibold text-primary flex items-center gap-1">
        <Icon name="arrow_back" className="text-[18px]" /> Mis pedidos
      </Link>

      <Async state={pedido} fallback={<Skeleton className="h-96" />}>
        {(p) => (
          <>
            {/* ⚡ ZONA DINÁMICA Z1 — GET /api/ciudadano/pedidos/{id} (estado) */}
            <section data-dyn="Z1 · GET /ciudadano/pedidos/{id}" className="card flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-on-surface-variant">Pedido {p.codigo}</p>
                  <h1 className="text-xl font-bold">
                    {formatRelativeDay(p.fecha)}, {formatFranja(p.horaInicio, p.horaFin)}
                  </h1>
                  <p className="text-sm text-on-surface-variant mt-1">{formatDireccion(p.direccion)}</p>
                </div>
                <Estado estado={p.estado} />
              </div>

              {p.estado === 'CANCELADA' ? (
                <Alert variant="info" icon="cancel">
                  Pedido cancelado {formatRelativeDateTime(p.canceladoEn).toLowerCase()}.
                </Alert>
              ) : (
                <ol className="flex flex-col gap-0">
                  {PASOS.map(([estado, label, campo], i) => {
                    const hecho = Boolean(p[campo])
                    return (
                      <li key={estado} className="flex gap-3">
                        <span className="flex flex-col items-center">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center ${hecho ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                            <Icon name={hecho ? 'check' : 'circle'} className="text-[14px]" />
                          </span>
                          {i < PASOS.length - 1 && <span className={`w-0.5 h-6 ${hecho ? 'bg-primary' : 'bg-surface-container'}`} />}
                        </span>
                        <span className="flex-1 flex justify-between gap-2 text-sm">
                          <span className={hecho ? 'font-semibold' : 'text-on-surface-variant'}>{label}</span>
                          {hecho && <span className="text-on-surface-variant">{formatRelativeDateTime(p[campo])}</span>}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}

              {p.cancelable && (
                <button type="button" className="btn btn-secondary self-start" onClick={() => setConfirmar(true)}>
                  <Icon name="close" className="text-[18px]" /> Cancelar pedido
                </button>
              )}
              {p.estado === 'EN_CAMINO' && (
                <p className="text-sm text-on-surface-variant flex items-center gap-1">
                  <Icon name="info" className="text-[18px]" /> El recolector ya está en camino: este pedido ya no se puede cancelar.
                </p>
              )}
            </section>

            {/* ⚡ ZONA DINÁMICA Z3 — GET /api/ciudadano/pedidos/{id} (liquidacion) */}
            {p.liquidacion && (
              <section data-dyn="Z3 · liquidacion" className="card flex items-center gap-3 bg-secondary-container/40">
                <Icon name="savings" className="text-[28px] text-on-secondary-container" />
                <div className="flex-1">
                  <p className="font-bold">Has ganado {formatEUR(p.liquidacion.importeCiudadano)}</p>
                  <p className="text-sm text-on-surface-variant">
                    Por {p.liquidacion.envasesValidos} envases válidos. Ya está en tu monedero.
                  </p>
                  <p className="text-sm font-semibold text-on-secondary-container flex items-center gap-1 mt-1">
                    <Icon name="eco" filled className="text-[16px]" /> {formatCo2(p.co2EvitadoKg)} de CO₂ evitados con este pedido
                  </p>
                </div>
              </section>
            )}

            {/* ⚡ ZONA DINÁMICA Z2 — GET /api/ciudadano/pedidos/{id} (bolsas) + Z5 tipos de envase */}
            <section data-dyn="Z2 · bolsas[] · Z5 GET /catalogo/tipos-envase" className="card flex flex-col gap-1">
              <h2 className="font-bold mb-1">
                {p.numBolsas} {p.numBolsas === 1 ? 'bolsa' : 'bolsas'} · {p.totalEnvases} envases
              </h2>
              {p.bolsas.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-2.5 border-t border-surface-container first:border-0">
                  <span className="font-mono font-bold tracking-wider text-sm bg-surface-container-low px-2 py-1 rounded-lg">{b.codigo}</span>
                  <span className="flex-1 min-w-0 text-sm">
                    <span className="block font-medium">{nombreTipo(b.tipoEnvase)}</span>
                    <span className="block text-on-surface-variant">
                      {b.cantidad} de {b.capacidadMaxima} máx.
                      {b.resultado && b.resultado !== 'ACEPTADA' && ` · válidos: ${b.envasesValidos}`}
                    </span>
                  </span>
                  {b.resultado && <Estado estado={b.resultado} />}
                </div>
              ))}
            </section>

            {/* ⚡ ZONA DINÁMICA Z4 — GET /api/ciudadano/pedidos/{id} (incidencias) */}
            {p.incidencias.length > 0 && (
              <section data-dyn="Z4 · incidencias[]" className="card flex flex-col gap-3">
                <h2 className="font-bold">Incidencias</h2>
                {p.incidencias.map((i) => (
                  <div key={i.id} className="rounded-xl bg-surface-container-low p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{i.tipo}</span>
                      <Estado estado={i.estado} />
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {i.codigo} · {formatDate(i.creadaEn)}
                    </span>
                    {i.resolucion && <p className="text-sm mt-1">{i.resolucion}</p>}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </Async>

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="¿Cancelar el pedido?">
        <p className="text-on-surface-variant">El recolector ya no pasará a por tus bolsas. Podrás pedir otra recogida cuando quieras.</p>
        {cancelarState.error && <Alert className="mt-3">{cancelarState.error.message}</Alert>}
        <div className="flex gap-2 mt-5">
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmar(false)}>
            No, mantener
          </button>
          <button type="button" className="btn btn-danger flex-1" disabled={cancelarState.loading} onClick={handleCancelar}>
            {cancelarState.loading && <Spinner />} Sí, cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}
