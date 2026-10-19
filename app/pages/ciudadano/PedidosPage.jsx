/**
 * VISTA: Mis pedidos
 * Ruta: /ciudadano/pedidos   Rol: CIUDADANO
 * HU: HU-02.03 (listado de pedidos), HU-03.03 (estado de cada recogida)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Lista de pedidos (paginada, filtrable por estado) ... GET /api/ciudadano/pedidos?estado=&page=
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { ciudadanoService } from '../../api/ciudadanoService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Icon from '../../components/ui/Icon'
import PedidoCard from './PedidoCard'

const FILTROS = [
  ['', 'Todos'],
  ['ACTIVOS', 'En curso'],
  ['COMPLETADA', 'Completados'],
  ['CANCELADA', 'Cancelados'],
]

export default function PedidosPage() {
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(0)
  const pedidos = useApi(() => ciudadanoService.getPedidos({ estado: estado || undefined, page, size: 10 }), [estado, page])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>
        <Link to="/ciudadano/nuevo" className="btn btn-primary btn-sm">
          <Icon name="add" className="text-[18px]" /> Nuevo
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {FILTROS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setEstado(value)
              setPage(0)
            }}
            className={`chip ${estado === value ? 'chip-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/ciudadano/pedidos */}
      <div data-dyn="Z1 · GET /ciudadano/pedidos" className="flex flex-col gap-3">
        <Async state={pedidos} fallback={<Skeleton className="h-64" />}>
          {(p) =>
            p.content.length ? (
              <>
                {p.content.map((x) => (
                  <PedidoCard key={x.id} pedido={x} />
                ))}
                {p.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      Anterior
                    </button>
                    <span className="text-sm text-on-surface-variant">
                      {page + 1} de {p.totalPages}
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={page + 1 >= p.totalPages} onClick={() => setPage(page + 1)}>
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState icon="receipt_long" title="No hay pedidos">
                {estado ? 'No tienes pedidos con este estado.' : 'Cuando pidas tu primera recogida aparecerá aquí.'}
              </EmptyState>
            )
          }
        </Async>
      </div>
    </div>
  )
}
