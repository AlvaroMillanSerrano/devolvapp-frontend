import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'

/**
 * Mapa con OpenStreetMap (Leaflet). Las coordenadas vienen del backend (lat/lng de cada dirección).
 * En producción conviene un proveedor de teselas propio o de pago (la política de tile.openstreetmap.org
 * no permite uso intensivo).
 *
 * puntos: [{ id, lat, lng, etiqueta, color, popup }] · ruta: [[lat, lng], ...]
 */
export default function Mapa({ puntos = [], ruta, className = 'h-80', onSelect }) {
  const centro = puntos[0] ? [puntos[0].lat, puntos[0].lng] : [36.7213, -4.4214]

  return (
    <div className={`rounded-2xl overflow-hidden relative z-0 ${className}`}>
      <MapContainer center={centro} zoom={14} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {ruta?.length > 1 && <Polyline positions={ruta} pathOptions={{ color: '#006948', weight: 4, opacity: 0.8, dashArray: '8 6' }} />}
        {puntos.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icono(p)} eventHandlers={onSelect ? { click: () => onSelect(p) } : undefined}>
            {p.popup && <Popup>{p.popup}</Popup>}
          </Marker>
        ))}
        <Encuadre puntos={puntos} />
      </MapContainer>
    </div>
  )
}

const COLORES = { primary: '#006948', gris: '#8a948f', azul: '#0284c7', naranja: '#d97706', rojo: '#ba1a1a' }

const icono = ({ etiqueta = '', color = 'primary', forma = 'circulo' }) =>
  L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;border-radius:${forma === 'cuadrado' ? '8px' : '50%'};background:${COLORES[color] ?? color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 13px Inter,sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${etiqueta}</div>`,
  })

/** Ajusta el zoom para que se vean todos los puntos */
function Encuadre({ puntos }) {
  const map = useMap()
  const clave = puntos.map((p) => `${p.lat},${p.lng}`).join('|')
  useEffect(() => {
    if (puntos.length > 1) map.fitBounds(puntos.map((p) => [p.lat, p.lng]), { padding: [36, 36] })
    else if (puntos.length === 1) map.setView([puntos[0].lat, puntos[0].lng], 16)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, map])
  return null
}
