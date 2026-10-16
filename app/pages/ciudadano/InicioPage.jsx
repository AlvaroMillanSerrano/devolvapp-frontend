/**
 * VISTA: Inicio del ciudadano
 * Ruta: /ciudadano   Rol: CIUDADANO
 * HU: HU-05.01 (saldo), HU-03.03 (estado de las recogidas en curso)
 *
 * ZONAS DINÁMICAS
 *  [Z0] CO2 evitado (lo primero que ve) .... GET /api/ciudadano/impacto (lo carga el layout: useOutletContext)
 *  [Z1] Saldo disponible ............ GET /api/ciudadano/monedero
 *  [Z2] Pedidos en curso ............ GET /api/ciudadano/pedidos?estado=ACTIVOS
 *  [Z3] Dirección de recogida ....... usuario de la sesión (GET /api/auth/me) → usuario.direccion, usuario.zona
 */
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useApi } from '../../hooks/useApi'
import { ciudadanoService } from '../../api/ciudadanoService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Icon from '../../components/ui/Icon'
import PedidoCard from './PedidoCard'
import { ImpactoDetalle, ImpactoHero } from '../../components/impacto/Impacto'
import { formatDireccion, formatEUR } from '../../utils/format'

export default function InicioPage() {
  const { user } = useAuth()
  const { impacto } = useOutletContext()
  const monedero = useApi(() => ciudadanoService.getMonedero(), [])
  const activos = useApi(() => ciudadanoService.getPedidos({ estado: 'ACTIVOS', size: 5 }), [])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Hola, {user?.nombre} 👋</h1>

      {/* ⚡ ZONA DINÁMICA Z0 — GET /api/ciudadano/impacto */}
      <div data-dyn="Z0 · GET /ciudadano/impacto">
        <ImpactoHero
          impacto={impacto}
          titulo="Gracias a tus envases has evitado"
          subtitulo={impacto ? `En ${impacto.recogidas} ${impacto.recogidas === 1 ? 'recogida' : 'recogidas'}. ¡Sigue así!` : null}
        />
      </div>

      {/* Acción principal: pedir una recogida */}
      <Link
        to="/ciudadano/nuevo"
        className="relative overflow-hidden rounded-3xl bg-primary text-on-primary p-5 flex items-center gap-4 shadow-md active:scale-[0.99] transition-transform"
      >
        <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
          <Icon name="add_shopping_cart" className="text-[30px] text-secondary-fixed" />
        </span>
        <span className="flex-1">
          <span className="block text-lg font-bold">Pedir recogida</span>
          <span className="block text-sm text-white/80">Prepara tus bolsas y elige cuándo pasamos</span>
        </span>
        <Icon name="arrow_forward" className="text-[24px]" />
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ⚡ ZONA DINÁMICA Z1 — GET /api/ciudadano/monedero */}
        <Link to="/ciudadano/monedero" data-dyn="Z1 · GET /ciudadano/monedero" className="card flex items-center gap-3 hover:bg-surface-container-low">
          <span className="w-11 h-11 rounded-full bg-secondary-container/60 flex items-center justify-center">
            <Icon name="account_balance_wallet" className="text-[22px] text-on-secondary-container" />
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold text-on-surface-variant">Tu saldo</span>
            <Async state={monedero} fallback={<Skeleton className="h-7 w-24" />}>
              {(m) => <span className="block text-2xl font-bold tabular-nums">{formatEUR(m.saldoDisponible)}</span>}
            </Async>
          </span>
          <Icon name="chevron_right" className="text-on-surface-variant" />
        </Link>

        {/* ⚡ ZONA DINÁMICA Z3 — dirección del usuario (sesión) */}
        <div data-dyn="Z3 · usuario.direccion" className="card flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center">
            <Icon name="home_pin" className="text-[22px] text-primary" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-on-surface-variant">Recogemos en{user?.zona ? ` · zona ${user.zona.nombre}` : ''}</span>
            <span className="block text-sm font-medium truncate">{formatDireccion(user?.direccion)}</span>
          </span>
          <Link to="/ciudadano/perfil" className="text-sm font-semibold text-primary shrink-0">
            Cambiar
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">En curso</h2>
          <Link to="/ciudadano/pedidos" className="text-sm font-semibold text-primary">
            Ver todos
          </Link>
        </div>
        {/* ⚡ ZONA DINÁMICA Z2 — GET /api/ciudadano/pedidos?estado=ACTIVOS */}
        <div data-dyn="Z2 · GET /ciudadano/pedidos?estado=ACTIVOS" className="flex flex-col gap-3">
          <Async state={activos} fallback={<Skeleton className="h-24" />}>
            {(page) =>
              page.content.length ? (
                page.content.map((p) => <PedidoCard key={p.id} pedido={p} />)
              ) : (
                <EmptyState icon="inventory_2" title="No tienes recogidas en curso">
                  Cuando pidas una recogida, la verás aquí con su estado.
                </EmptyState>
              )
            }
          </Async>
        </div>
      </section>

      {/* En pantallas grandes este detalle está en el panel lateral */}
      <ImpactoDetalle impacto={impacto} className="lg:hidden" />

      <section className="card flex flex-col gap-3">
        <h2 className="font-bold">¿Cómo funciona?</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            ['shopping_bag', 'Llena tus bolsas', 'Separa los envases y dinos qué hay en cada bolsa.'],
            ['event_available', 'Elige día y hora', 'Un recolector pasa por tu casa en la franja que elijas.'],
            ['savings', 'Cobra', 'Cuando se verifican los envases, el dinero llega a tu monedero.'],
          ].map(([icon, t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
              <span>
                <span className="font-semibold flex items-center gap-1">
                  <Icon name={icon} className="text-[18px] text-primary" /> {t}
                </span>
                <span className="text-on-surface-variant">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
