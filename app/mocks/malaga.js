/**
 * Códigos postales del municipio de Málaga con su barrio de referencia y un punto aproximado
 * (centro del área) para el mapa. Los nombres y coordenadas son ORIENTATIVOS: en el backend
 * deben salir de una tabla maestra y la geolocalización de cada dirección, de un geocodificador.
 */
export const CODIGOS_POSTALES_MALAGA = [
  { cp: '29001', barrio: 'Centro – Ensanche', lat: 36.7176, lng: -4.4244 },
  { cp: '29002', barrio: 'El Perchel – Trinidad', lat: 36.7135, lng: -4.4345 },
  { cp: '29003', barrio: 'Huelin – La Luz', lat: 36.7035, lng: -4.4455 },
  { cp: '29004', barrio: 'Carretera de Cádiz – Guadalmar', lat: 36.6905, lng: -4.4705 },
  { cp: '29005', barrio: 'Centro histórico', lat: 36.7213, lng: -4.4205 },
  { cp: '29006', barrio: 'Cruz de Humilladero', lat: 36.7150, lng: -4.4560 },
  { cp: '29007', barrio: 'Mármoles – Carranque', lat: 36.7245, lng: -4.4380 },
  { cp: '29008', barrio: 'La Goleta – San Felipe', lat: 36.7262, lng: -4.4250 },
  { cp: '29009', barrio: 'Barcelona – Ollerías', lat: 36.7290, lng: -4.4320 },
  { cp: '29010', barrio: 'Teatinos – Universidad', lat: 36.7180, lng: -4.4740 },
  { cp: '29011', barrio: 'Martiricos – La Roca', lat: 36.7340, lng: -4.4340 },
  { cp: '29012', barrio: 'La Victoria', lat: 36.7270, lng: -4.4150 },
  { cp: '29013', barrio: 'Cristo de la Epidemia – Lagunillas', lat: 36.7300, lng: -4.4180 },
  { cp: '29014', barrio: 'Ciudad Jardín – Palma-Palmilla', lat: 36.7460, lng: -4.4260 },
  { cp: '29015', barrio: 'Monte Gibralfaro – El Ejido', lat: 36.7240, lng: -4.4110 },
  { cp: '29016', barrio: 'La Malagueta – El Limonar', lat: 36.7195, lng: -4.4020 },
  { cp: '29017', barrio: 'Pedregalejo – El Palo', lat: 36.7205, lng: -4.3790 },
  { cp: '29018', barrio: 'El Palo – Cerrado de Calderón', lat: 36.7245, lng: -4.3560 },
  { cp: '29190', barrio: 'Puerto de la Torre', lat: 36.7430, lng: -4.4840 },
  { cp: '29196', barrio: 'Polígono Guadalhorce', lat: 36.7010, lng: -4.4920 },
  { cp: '29590', barrio: 'Campanillas', lat: 36.7270, lng: -4.5480 },
  { cp: '29591', barrio: 'Santa Rosalía – Maqueda', lat: 36.7370, lng: -4.5260 },
]

export const cpInfo = (cp) => CODIGOS_POSTALES_MALAGA.find((c) => c.cp === cp) ?? null

/** Punto de salida de los recolectores (nave de DevolvUp) */
export const NAVE = { nombre: 'Nave DevolvUp · Polígono Guadalhorce', lat: 36.6995, lng: -4.4885 }

/** Geocodificación simulada: centro del CP + un desplazamiento estable según la dirección */
export function geocodificar(direccion) {
  const info = cpInfo(direccion.codigoPostal) ?? { lat: 36.7213, lng: -4.4214 }
  let h = 0
  for (const ch of `${direccion.tipoVia}${direccion.nombreVia}${direccion.numero}`) h = (h * 31 + ch.charCodeAt(0)) | 0
  const dx = ((h & 0xff) / 255 - 0.5) * 0.008
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 0.006
  return { lat: Math.round((info.lat + dy) * 1e5) / 1e5, lng: Math.round((info.lng + dx) * 1e5) / 1e5 }
}
