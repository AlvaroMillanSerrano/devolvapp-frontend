/**
 * MVP ciudadano: crea pedidos con bolsas mixtas y los deja pendientes de programación.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useAction } from '../../hooks/useApi'
import { useParametros, useTiposEnvase } from '../../hooks/useParametros'
import { ciudadanoService } from '../../api/ciudadanoService'
import Async, { Skeleton } from '../../components/ui/Async'
import { Alert, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { formatCo2, formatDireccion, formatEUR } from '../../utils/format'

let bolsaKey = 0
const nuevaBolsa = () => ({ key: ++bolsaKey, contenidos: {} })

function validarBolsas(bolsas, tipos) {
  const errores = {}
  bolsas.forEach((bolsa) => {
    const entries = Object.entries(bolsa.contenidos)
    if (!entries.length) {
      errores[bolsa.key] = 'Añade al menos un tipo de envase a esta bolsa'
      return
    }
    for (const [codigo, raw] of entries) {
      const tipo = tipos.find((item) => item.codigo === codigo)
      const cantidad = Number(raw)
      if (raw === '' || !Number.isInteger(cantidad) || cantidad <= 0) {
        errores[bolsa.key] = `Indica una cantidad mayor que cero para ${tipo?.nombre ?? codigo}`
        break
      }
      if (tipo && cantidad > tipo.capacidadMaximaBolsa) {
        errores[bolsa.key] = `En una bolsa caben como máximo ${tipo.capacidadMaximaBolsa} envases de ${tipo.nombre.toLowerCase()}`
        break
      }
    }
  })
  return errores
}

export default function NuevoPedidoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const tipos = useTiposEnvase()
  const parametros = useParametros()
  const [bolsas, setBolsas] = useState(() => [nuevaBolsa()])
  const [errores, setErrores] = useState({})
  const [creado, setCreado] = useState(null)
  const [crear, crearState] = useAction(ciudadanoService.crearPedido)

  const listaTipos = tipos.data ?? []
  const maxBolsas = parametros.data?.pedidos.maxBolsas ?? 5
  const totalEnvases = bolsas.reduce((total, bolsa) => total + Object.values(bolsa.contenidos).reduce((suma, value) => suma + (Number(value) > 0 ? Number(value) : 0), 0), 0)
  const eco = parametros.data?.economia
  const estimado = eco ? totalEnvases * eco.importePorEnvase * eco.porcentajeCiudadano : null
  const factores = parametros.data?.impacto.kgCo2PorEnvase
  const co2Estimado = factores
    ? bolsas.reduce((total, bolsa) => total + Object.entries(bolsa.contenidos).reduce((suma, [codigo, value]) => suma + (Number(value) > 0 ? Number(value) * (factores[codigo] ?? 0) : 0), 0), 0)
    : null

  const setContenido = (key, codigo, value) => {
    setBolsas((current) => current.map((bolsa) => {
      if (bolsa.key !== key) return bolsa
      const contenidos = { ...bolsa.contenidos }
      if (value === null) delete contenidos[codigo]
      else contenidos[codigo] = value
      return { ...bolsa, contenidos }
    }))
    setErrores((current) => ({ ...current, [key]: undefined }))
  }

  const confirmar = async () => {
    const nextErrors = validarBolsas(bolsas, listaTipos)
    setErrores(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return
    try {
      const pedido = await crear({
        bolsas: bolsas.map((bolsa) => ({
          contenidos: Object.fromEntries(Object.entries(bolsa.contenidos).map(([codigo, cantidad]) => [codigo, Number(cantidad)])),
        })),
      })
      setCreado(pedido)
      window.scrollTo(0, 0)
    } catch {
      // useAction expone el error para mostrarlo en el formulario.
    }
  }

  if (creado) return <PedidoCreado pedido={creado} tipos={listaTipos} />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container" aria-label="Atrás">
          <Icon name="arrow_back" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-on-surface-variant">Solicitud de recogida</p>
          <h1 className="text-xl font-bold">¿Qué vas a entregar?</h1>
        </div>
      </div>

      <div className="card flex items-center gap-3">
        <Icon name="home_pin" className="text-[24px] text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-on-surface-variant">Domicilio de recogida</p>
          <p className="text-sm font-medium truncate">{formatDireccion(user?.direccion)}</p>
        </div>
      </div>

      <Async state={tipos} fallback={<Skeleton className="h-48" />}>
        {(lista) => (
          <div data-dyn="GET /catalogo/tipos-envase" className="flex flex-col gap-3">
            {bolsas.map((bolsa, index) => (
              <section key={bolsa.key} className="card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold flex items-center gap-2"><Icon name="shopping_bag" className="text-[20px] text-primary" />Bolsa {index + 1}</h2>
                  {bolsas.length > 1 && (
                    <button type="button" onClick={() => setBolsas((items) => items.filter((item) => item.key !== bolsa.key))} className="text-sm font-semibold text-error flex items-center gap-1">
                      <Icon name="delete" className="text-[18px]" />Quitar
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lista.map((tipo) => {
                    const selected = Object.hasOwn(bolsa.contenidos, tipo.codigo)
                    return (
                      <button key={tipo.codigo} type="button" aria-pressed={selected}
                        onClick={() => setContenido(bolsa.key, tipo.codigo, selected ? null : '')}
                        className={`chip ${selected ? 'chip-active' : ''}`}>
                        <Icon name={tipo.icono} className="text-[18px]" />{tipo.nombre}
                      </button>
                    )
                  })}
                </div>
                {Object.entries(bolsa.contenidos).map(([codigo, cantidad]) => {
                  const tipo = lista.find((item) => item.codigo === codigo)
                  return (
                    <label key={codigo} className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-medium">{tipo?.nombre ?? codigo}</span>
                      <input className="input max-w-32" type="number" inputMode="numeric" min="1" max={tipo?.capacidadMaximaBolsa}
                        aria-label={`Cantidad de ${tipo?.nombre ?? codigo}`} placeholder="Cantidad" value={cantidad}
                        onChange={(event) => setContenido(bolsa.key, codigo, event.target.value)} />
                      <span className="text-xs text-on-surface-variant">máx. {tipo?.capacidadMaximaBolsa}</span>
                    </label>
                  )
                })}
                {errores[bolsa.key] && <p className="text-sm text-error flex items-center gap-1"><Icon name="error" className="text-[16px]" />{errores[bolsa.key]}</p>}
              </section>
            ))}
          </div>
        )}
      </Async>

      <button type="button" disabled={bolsas.length >= maxBolsas} onClick={() => setBolsas((items) => [...items, nuevaBolsa()])} className="btn btn-secondary self-start">
        <Icon name="add" className="text-[20px]" />{bolsas.length >= maxBolsas ? `Máximo ${maxBolsas} bolsas por pedido` : 'Añadir otra bolsa'}
      </button>

      {crearState.error && <Alert>{crearState.error.message}</Alert>}

      <div className="card bg-primary/5 text-sm text-on-surface-variant">
        Guardaremos la solicitud ahora. La fecha de recogida se confirmará cuando el servicio esté programado.
      </div>

      <BarraInferior>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{bolsas.length} {bolsas.length === 1 ? 'bolsa' : 'bolsas'} · {totalEnvases} envases</p>
          {estimado != null && totalEnvases > 0 && <p className="text-sm text-on-surface-variant">Estimación: {formatEUR(estimado)}{co2Estimado > 0 && <span className="text-primary font-semibold"> · {formatCo2(co2Estimado)} CO₂ evitados</span>}</p>}
        </div>
        <button type="button" className="btn btn-primary btn-lg" disabled={crearState.loading || !bolsas.length} onClick={confirmar}>
          {crearState.loading && <Spinner />}Solicitar recogida
        </button>
      </BarraInferior>
    </div>
  )
}

function BarraInferior({ children }) {
  return <><div className="h-20" /><div className="fixed inset-x-0 bottom-16 md:bottom-0 z-40 bg-surface-container-lowest border-t border-surface-container"><div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-3"><div className="flex-1 lg:max-w-[calc(100%-392px)] flex items-center gap-3">{children}</div></div></div></>
}

function PedidoCreado({ pedido, tipos }) {
  const nombre = (codigo) => tipos.find((tipo) => tipo.codigo === codigo)?.nombre ?? codigo
  return (
    <div data-dyn="POST /ciudadano/pedidos" className="flex flex-col items-center text-center gap-5 pt-6">
      <span className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center"><Icon name="check" className="text-[44px] text-on-secondary-container" /></span>
      <div>
        <h1 className="text-2xl font-bold">¡Solicitud guardada!</h1>
        <p className="text-on-surface-variant mt-1">Te avisaremos cuando la recogida tenga fecha y horario.</p>
      </div>
      <div className="card w-full text-left flex flex-col gap-3">
        <p className="font-bold">Identifica tus bolsas con estos códigos</p>
        {pedido.bolsas.map((bolsa) => (
          <div key={bolsa.id} className="flex items-center justify-between gap-3 py-2 border-t border-surface-container">
            <span className="text-sm">{Object.entries(bolsa.contenidos ?? {}).map(([codigo, cantidad]) => `${nombre(codigo)}: ${cantidad}`).join(' · ') || `${bolsa.cantidad} envases`}</span>
            <span className="font-mono font-bold text-lg tracking-wider">{bolsa.codigo}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Link to={`/ciudadano/pedidos/${pedido.id}`} className="btn btn-primary btn-lg flex-1">Ver mi solicitud</Link>
        <Link to="/ciudadano" className="btn btn-secondary btn-lg flex-1">Volver al inicio</Link>
      </div>
    </div>
  )
}
