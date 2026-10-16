/**
 * VISTA: Mapa y ruta del día
 * Ruta: /recolector/ruta   Rol: RECOLECTOR
 * HU: HU-04.01 (recogidas asignadas con fecha, franja y dirección)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Paradas en el mapa y ruta sugerida .... GET /api/recolector/ruta?fecha=&lat=&lng=
 *  [Z2] Orden de paradas, km y tiempo ......... GET /api/recolector/ruta → paradas[], distanciaKm, duracionMin
 *
 * La ruta respeta las franjas (primero las que empiezan antes) y, dentro de cada franja, va por cercanía.
 * «Abrir en Google Maps» calcula el trayecto real por carretera con el mismo orden.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { recolectorService } from '../../api/recolectorService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import Icon from '../../components/ui/Icon'
import { Alert } from '../../components/ui/FormField'
import Mapa from '../../components/mapa/Mapa'
import { formatDireccion, formatFranja, formatNumber, formatRelativeDay, toYmd } from '../../utils/format'

const DIAS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() + i)
  return toYmd(d)
})

/** Google Maps admite hasta 9 paradas intermedias en un enlace */
function enlaceGoogle(origen, paradas) {
  if (!paradas.length) return null
  const p = paradas.slice(0, 10)
  const pt = (x) => `${x.lat},${x.lng}`
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', pt(origen))
  url.searchParams.set('destination', pt(p[p.length - 1]))
  if (p.length > 1) url.searchParams.set('waypoints', p.slice(0, -1).map(pt).join('|'))
  url.searchParams.set('travelmode', 'driving')
  return url.toString()
}

export default function RutaPage() {
  const [fecha, setFecha] = useState(DIAS[0])
  const [ubicacion, setUbicacion] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const ruta = useApi(() => recolectorService.getRuta({ fecha, ...(ubicacion ?? {}) }), [fecha, ubicacion?.lat, ubicacion?.lng])

  const usarUbicacion = () => {
    setGeoError(null)
    if (!navigator.geolocation) return setGeoError('Tu navegador no permite obtener la ubicación.')
    navigator.geolocation.getCurrentPosition(
      (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('No hemos podido obtener tu ubicación. La ruta sale desde la nave.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Mapa y ruta</h1>
        <button type="button" className="btn btn-secondary btn-sm" onClick={usarUbicacion}>
          <Icon name="my_location" className="text-[18px]" /> {ubicacion ? 'Recalcular desde aquí' : 'Salir desde mi ubicación'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {DIAS.map((d) => (
          <button key={d} type="button" className={`chip shrink-0 ${fecha === d ? 'chip-active' : ''}`} onClick={() => setFecha(d)}>
            {formatRelativeDay(d)}
          </button>
        ))}
      </div>
      {geoError && <Alert variant="warning">{geoError}</Alert>}

      <Async state={ruta} fallback={<Skeleton className="h-[480px]" />}>
        {(r) => {
          const google = enlaceGoogle(r.origen, r.paradas)
          const puntos = [
            { id: 'origen', lat: r.origen.lat, lng: r.origen.lng, etiqueta: 'S', color: 'naranja', forma: 'cuadrado', popup: r.origen.nombre },
            ...r.paradas.map((p) => ({
              id: p.id,
              lat: p.lat,
              lng: p.lng,
              etiqueta: p.orden,
              color: p.estado === 'EN_CAMINO' ? 'azul' : 'primary',
              popup: (
                <span>
                  <strong>
                    {p.orden}. {formatDireccion(p.direccion, { conCiudad: false })}
                  </strong>
                  <br />
                  {formatFranja(p.horaInicio, p.horaFin)} · {p.numBolsas} bolsas
                  <br />
                  <Link to={`/recolector/recogidas/${p.id}`}>Abrir recogida</Link>
                </span>
              ),
            })),
            ...r.hechas.map((p) => ({ id: `h${p.id}`, lat: p.lat, lng: p.lng, etiqueta: '✓', color: 'gris', popup: `${p.codigo} · completada` })),
          ]
          return (
            // ⚡ ZONA DINÁMICA Z1 / Z2 — GET /api/recolector/ruta
            <div data-dyn="Z1 · GET /recolector/ruta" className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <Dato icon="pin_drop" valor={r.paradas.length} texto={r.paradas.length === 1 ? 'parada' : 'paradas'} />
                  <Dato icon="straighten" valor={`${formatNumber(r.distanciaKm, { maximumFractionDigits: 1 })} km`} texto="aprox." />
                  <Dato icon="schedule" valor={`${r.duracionMin} min`} texto="con paradas" />
                </div>
                <Mapa puntos={puntos} ruta={[[r.origen.lat, r.origen.lng], ...r.paradas.map((p) => [p.lat, p.lng])]} className="h-[360px] sm:h-[460px]" />
                <p className="text-xs text-on-surface-variant">
                  S = punto de salida ({r.origen.nombre}). La línea es el orden sugerido, no el trazado por calles.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {google && (
                  <a href={google} target="_blank" rel="noreferrer" className="btn btn-primary btn-lg">
                    <Icon name="navigation" /> Abrir en Google Maps
                  </a>
                )}
                {r.paradas.length > 10 && <p className="text-xs text-on-surface-variant">Google Maps solo admite 10 paradas: se abren las 10 primeras.</p>}
                {r.paradas.length === 0 ? (
                  <EmptyState icon="done_all" title={r.hechas.length ? '¡Todo hecho por hoy!' : 'Sin recogidas este día'}>
                    {r.hechas.length ? `Has completado ${r.hechas.length} recogidas.` : 'No tienes recogidas asignadas para esta fecha.'}
                  </EmptyState>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {r.paradas.map((p) => (
                      <li key={p.id}>
                        <Link to={`/recolector/recogidas/${p.id}`} className={`card !p-3 flex items-center gap-3 hover:bg-surface-container-low ${p.orden === 1 ? 'ring-2 ring-primary' : ''}`}>
                          <span className={`w-8 h-8 rounded-full text-white font-bold flex items-center justify-center shrink-0 ${p.estado === 'EN_CAMINO' ? 'bg-sky-600' : 'bg-primary'}`}>
                            {p.orden}
                          </span>
                          <span className="flex-1 min-w-0 text-sm">
                            <span className="block font-semibold truncate">{formatDireccion(p.direccion, { conCiudad: false })}</span>
                            <span className="block text-on-surface-variant">
                              {formatFranja(p.horaInicio, p.horaFin)} · {formatNumber(p.distanciaDesdeAnteriorKm, { maximumFractionDigits: 1 })} km
                            </span>
                          </span>
                          {p.orden === 1 ? <span className="text-xs font-bold text-primary">Siguiente</span> : <Estado estado={p.estado} />}
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
                {r.canceladas.length > 0 && (
                  <p className="text-sm text-on-surface-variant">
                    {r.canceladas.length} {r.canceladas.length === 1 ? 'recogida cancelada' : 'recogidas canceladas'} este día (no hace falta ir).
                  </p>
                )}
              </div>
            </div>
          )
        }}
      </Async>
    </div>
  )
}

const Dato = ({ icon, valor, texto }) => (
  <div className="card !p-3">
    <Icon name={icon} className="text-[20px] text-primary" />
    <p className="text-lg font-bold leading-tight">{valor}</p>
    <p className="text-xs text-on-surface-variant">{texto}</p>
  </div>
)
