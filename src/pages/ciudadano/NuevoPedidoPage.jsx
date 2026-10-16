/**
 * VISTA: Nuevo pedido (bolsas → día y hora → confirmar)
 * Ruta: /ciudadano/nuevo   Rol: CIUDADANO
 * HU: HU-02.01 (contenido de cada bolsa), HU-02.02 (código único por bolsa), HU-03.01 (calendario de la zona), HU-03.02 (solicitud de recogida)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Tipos de envase y capacidad máxima ..... GET /api/catalogo/tipos-envase
 *  [Z2] Máximo de bolsas, ganancia y CO2 estimados ... GET /api/config/parametros
 *  [Z3] Días y franjas de mi zona .............. GET /api/ciudadano/disponibilidad
 *  [Z4] Pedido creado con códigos de bolsa ..... respuesta de [A1]
 *
 * ACCIONES
 *  [A1] Confirmar pedido ....................... POST /api/ciudadano/pedidos
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useApi, useAction } from '../../hooks/useApi'
import { useParametros, useTiposEnvase } from '../../hooks/useParametros'
import { ciudadanoService } from '../../api/ciudadanoService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { formatCo2, formatDireccion, formatEUR, formatFranja, formatRelativeDay, parseLocalDate } from '../../utils/format'

let bolsaKey = 0
const nuevaBolsa = () => ({ key: ++bolsaKey, tipoEnvase: '', cantidad: '' })

function validarBolsas(bolsas, tipos) {
  const errores = {}
  bolsas.forEach((b) => {
    const tipo = tipos.find((t) => t.codigo === b.tipoEnvase)
    const n = Number(b.cantidad)
    if (!tipo) errores[b.key] = 'Elige qué tipo de envases hay en la bolsa'
    else if (b.cantidad === '' || !Number.isInteger(n) || n <= 0) errores[b.key] = 'Indica cuántos envases hay (más de 0)'
    else if (n > tipo.capacidadMaximaBolsa) errores[b.key] = `En una bolsa de ${tipo.nombre.toLowerCase()} caben como máximo ${tipo.capacidadMaximaBolsa} envases`
  })
  return errores
}

export default function NuevoPedidoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const tipos = useTiposEnvase()
  const parametros = useParametros()
  const [paso, setPaso] = useState(1)
  const [bolsas, setBolsas] = useState(() => [nuevaBolsa()])
  const [errores, setErrores] = useState({})
  const [hueco, setHueco] = useState(null)
  const [creado, setCreado] = useState(null)
  const [crear, crearState] = useAction(ciudadanoService.crearPedido)

  const maxBolsas = parametros.data?.pedidos.maxBolsas ?? 5
  const totalEnvases = bolsas.reduce((s, b) => s + (Number(b.cantidad) > 0 ? Number(b.cantidad) : 0), 0)
  const eco = parametros.data?.economia
  const estimado = eco ? totalEnvases * eco.importePorEnvase * eco.porcentajeCiudadano : null
  const factores = parametros.data?.impacto.kgCo2PorEnvase
  const co2Estimado = factores ? bolsas.reduce((s, b) => s + (Number(b.cantidad) > 0 ? Number(b.cantidad) * (factores[b.tipoEnvase] ?? 0) : 0), 0) : null

  const setBolsa = (key, patch) => {
    setBolsas((list) => list.map((b) => (b.key === key ? { ...b, ...patch } : b)))
    setErrores((e) => ({ ...e, [key]: undefined }))
  }

  const continuar = () => {
    const e = validarBolsas(bolsas, tipos.data ?? [])
    setErrores(e)
    if (!Object.values(e).some(Boolean)) setPaso(2)
  }

  const confirmar = async () => {
    try {
      const pedido = await crear({
        bolsas: bolsas.map((b) => ({ tipoEnvase: b.tipoEnvase, cantidad: Number(b.cantidad) })),
        fecha: hueco.fecha,
        franjaId: hueco.franjaId,
      })
      setCreado(pedido)
      window.scrollTo(0, 0)
    } catch (err) {
      if (err.code === 'FRANJA_COMPLETA') setHueco(null)
    }
  }

  if (creado) return <PedidoCreado pedido={creado} tipos={tipos.data ?? []} />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (paso === 1 ? navigate(-1) : setPaso(1))}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container"
          aria-label="Atrás"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-on-surface-variant">Paso {paso} de 2</p>
          <h1 className="text-xl font-bold">{paso === 1 ? '¿Qué vas a entregar?' : '¿Cuándo pasamos?'}</h1>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: paso === 1 ? '50%' : '100%' }} />
      </div>

      {paso === 1 ? (
        <>
          {/* ⚡ ZONA DINÁMICA Z1 — GET /api/catalogo/tipos-envase */}
          <div data-dyn="Z1 · GET /catalogo/tipos-envase" className="flex flex-col gap-3">
            <Async state={tipos} fallback={<Skeleton className="h-48" />}>
              {(lista) =>
                bolsas.map((b, i) => {
                  const tipo = lista.find((t) => t.codigo === b.tipoEnvase)
                  return (
                    <div key={b.key} className="card flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-2">
                          <Icon name="shopping_bag" className="text-[20px] text-primary" /> Bolsa {i + 1}
                        </span>
                        {bolsas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBolsas((l) => l.filter((x) => x.key !== b.key))}
                            className="text-sm font-semibold text-error flex items-center gap-1"
                          >
                            <Icon name="delete" className="text-[18px]" /> Quitar
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                        {lista.map((t) => (
                          <button
                            key={t.codigo}
                            type="button"
                            onClick={() => setBolsa(b.key, { tipoEnvase: t.codigo })}
                            className={`chip shrink-0 ${b.tipoEnvase === t.codigo ? 'chip-active' : ''}`}
                          >
                            <Icon name={t.icono} className="text-[18px]" /> {t.nombre}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex flex-col gap-1">
                          <span className="label">Número aproximado de envases</span>
                          <input
                            className="input"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max={tipo?.capacidadMaximaBolsa}
                            placeholder="Ej. 40"
                            value={b.cantidad}
                            onChange={(e) => setBolsa(b.key, { cantidad: e.target.value })}
                          />
                        </label>
                        {tipo && <span className="text-xs text-on-surface-variant mt-6 shrink-0">Máx. {tipo.capacidadMaximaBolsa}</span>}
                      </div>
                      {errores[b.key] && <p className="text-sm text-error flex items-center gap-1"><Icon name="error" className="text-[16px]" />{errores[b.key]}</p>}
                    </div>
                  )
                })
              }
            </Async>
          </div>

          {/* ⚡ ZONA DINÁMICA Z2 — GET /api/config/parametros (máximo de bolsas) */}
          <button
            type="button"
            data-dyn="Z2 · GET /config/parametros"
            disabled={bolsas.length >= maxBolsas}
            onClick={() => setBolsas((l) => [...l, nuevaBolsa()])}
            className="btn btn-secondary self-start"
          >
            <Icon name="add" className="text-[20px]" />
            {bolsas.length >= maxBolsas ? `Máximo ${maxBolsas} bolsas por pedido` : 'Añadir otra bolsa'}
          </button>

          <BarraInferior>
            <div className="flex-1 min-w-0">
              <p className="font-bold">
                {bolsas.length} {bolsas.length === 1 ? 'bolsa' : 'bolsas'} · {totalEnvases} envases
              </p>
              {estimado != null && totalEnvases > 0 && (
                <p className="text-sm text-on-surface-variant">
                  Ganarás hasta {formatEUR(estimado)}
                  {co2Estimado > 0 && <span className="text-primary font-semibold"> · evitas {formatCo2(co2Estimado)} CO₂</span>}
                </p>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={continuar}>
              Continuar
            </button>
          </BarraInferior>
        </>
      ) : (
        <>
          <div className="card flex items-center gap-3">
            <Icon name="home_pin" className="text-[24px] text-primary" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface-variant">Recogida en</p>
              <p className="text-sm font-medium truncate">{formatDireccion(user?.direccion)}</p>
            </div>
          </div>

          <SelectorFranja value={hueco} onChange={setHueco} />

          {crearState.error && <Alert>{crearState.error.message}</Alert>}

          <BarraInferior>
            <div className="flex-1 min-w-0">
              {hueco ? (
                <>
                  <p className="font-bold">{formatRelativeDay(hueco.fecha)}</p>
                  <p className="text-sm text-on-surface-variant">{formatFranja(hueco.horaInicio, hueco.horaFin)}</p>
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">Elige día y hora</p>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-lg" disabled={!hueco || crearState.loading} onClick={confirmar}>
              {crearState.loading && <Spinner />}
              Confirmar pedido
            </button>
          </BarraInferior>
        </>
      )}
    </div>
  )
}

/** Barra fija con el resumen y el botón principal (sobre las pestañas en móvil). */
function BarraInferior({ children }) {
  return (
    <>
      <div className="h-20" />
      <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-40 bg-surface-container-lowest border-t border-surface-container">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 lg:max-w-[calc(100%-392px)] flex items-center gap-3">{children}</div>
        </div>
      </div>
    </>
  )
}

function SelectorFranja({ value, onChange }) {
  const disp = useApi(() => ciudadanoService.getDisponibilidad(), [])
  const dias = useMemo(() => {
    const map = new Map()
    disp.data?.huecos.forEach((h) => map.set(h.fecha, [...(map.get(h.fecha) ?? []), h]))
    return [...map.entries()]
  }, [disp.data])
  const [diaSel, setDiaSel] = useState(null)
  const fechaActiva = diaSel ?? value?.fecha ?? dias.find(([, hs]) => hs.some((h) => !h.completa))?.[0]
  const franjas = dias.find(([f]) => f === fechaActiva)?.[1] ?? []

  return (
    // ⚡ ZONA DINÁMICA Z3 — GET /api/ciudadano/disponibilidad
    <div data-dyn="Z3 · GET /ciudadano/disponibilidad" className="flex flex-col gap-4">
      <Async state={disp} fallback={<Skeleton className="h-40" />}>
        {(d) =>
          !d.zona ? (
            <EmptyState icon="location_off" title="Aún no llegamos a tu código postal">
              Todavía no hay recogidas en el CP {d.codigoPostal}. Te avisaremos cuando empecemos a pasar por tu zona.
            </EmptyState>
          ) : !d.huecos.length ? (
            <EmptyState icon="event_busy" title="No hay fechas disponibles">
              No hay franjas configuradas para tu zona en los próximos días.
            </EmptyState>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
                {dias.map(([fecha, hs]) => {
                  const d2 = parseLocalDate(fecha)
                  const lleno = hs.every((h) => h.completa)
                  const activo = fecha === fechaActiva
                  return (
                    <button
                      key={fecha}
                      type="button"
                      disabled={lleno}
                      onClick={() => setDiaSel(fecha)}
                      className={`shrink-0 w-16 py-2 rounded-2xl flex flex-col items-center transition-colors ${
                        activo ? 'bg-on-surface text-surface-container-lowest' : 'bg-surface-container-lowest shadow-sm hover:bg-surface-container'
                      } disabled:opacity-40`}
                    >
                      <span className="text-xs font-semibold capitalize">{d2.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span>
                      <span className="text-xl font-bold">{d2.getDate()}</span>
                      <span className="text-[11px] capitalize">{d2.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}</span>
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {franjas.map((h) => {
                  const sel = value?.fecha === h.fecha && value?.franjaId === h.franjaId
                  return (
                    <button
                      key={h.franjaId}
                      type="button"
                      disabled={h.completa}
                      onClick={() => onChange(h)}
                      className={`card !p-4 flex items-center gap-3 text-left border-2 transition-colors ${
                        sel ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-surface-container-low'
                      } disabled:opacity-50 disabled:pointer-events-none`}
                    >
                      <Icon name={sel ? 'radio_button_checked' : 'radio_button_unchecked'} className={sel ? 'text-primary' : 'text-outline'} />
                      <span className="flex-1 font-semibold">{formatFranja(h.horaInicio, h.horaFin)}</span>
                      {h.completa ? (
                        <span className="text-xs font-semibold text-on-surface-variant">Completa</span>
                      ) : (
                        h.plazasLibres <= 2 && <span className="text-xs font-semibold text-amber-800">Quedan {h.plazasLibres}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )
        }
      </Async>
    </div>
  )
}

function PedidoCreado({ pedido, tipos }) {
  const nombre = (codigo) => tipos.find((t) => t.codigo === codigo)?.nombre ?? codigo
  return (
    // ⚡ ZONA DINÁMICA Z4 — respuesta de POST /api/ciudadano/pedidos
    <div data-dyn="Z4 · POST /ciudadano/pedidos" className="flex flex-col items-center text-center gap-5 pt-6">
      <span className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
        <Icon name="check" className="text-[44px] text-on-secondary-container" />
      </span>
      <div>
        <h1 className="text-2xl font-bold">¡Pedido confirmado!</h1>
        <p className="text-on-surface-variant mt-1">
          Pasaremos {formatRelativeDay(pedido.fecha).toLowerCase()} entre las {pedido.horaInicio} y las {pedido.horaFin}.
        </p>
      </div>
      <div className="card w-full text-left flex flex-col gap-3">
        <p className="font-bold">Escribe estos códigos en tus bolsas</p>
        <p className="text-sm text-on-surface-variant -mt-2">Así el recolector sabrá qué bolsa es cada una.</p>
        {pedido.bolsas.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 py-2 border-t border-surface-container">
            <span className="text-sm">
              {nombre(b.tipoEnvase)} · {b.cantidad} envases
            </span>
            <span className="font-mono font-bold text-lg tracking-wider">{b.codigo}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Link to={`/ciudadano/pedidos/${pedido.id}`} className="btn btn-primary btn-lg flex-1">
          Ver mi pedido
        </Link>
        <Link to="/ciudadano" className="btn btn-secondary btn-lg flex-1">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
