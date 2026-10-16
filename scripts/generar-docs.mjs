/**
 * Genera la documentación de integración con el backend a partir del propio código:
 *
 *   docs/ZONAS_DINAMICAS.md  ← cabecera de cada vista (src/pages/**, src/layouts/*)
 *   docs/API_ENDPOINTS.md    ← JSDoc de cada función de src/api/*Service.js
 *
 * Uso:  npm run docs
 * Mantén las cabeceras "ZONAS DINÁMICAS" / "ACCIONES" de las vistas al día y vuelve a ejecutarlo.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const rel = (p) => relative(root, p).replace(/\\/g, '/')

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

const METHOD = /\b(GET|POST|PUT|PATCH|DELETE)\b/

/* ───────────────────────── Zonas dinámicas ───────────────────────── */

function parseHeader(file) {
  const code = readFileSync(file, 'utf8')
  const m = /\/\*\*([\s\S]*?)\*\//.exec(code)
  if (!m || !/ZONAS DIN[ÁA]MICAS|ACCIONES/.test(m[1])) return null
  const lines = m[1].split('\n').map((l) => l.replace(/^\s*\*\s?/, ''))
  const info = { file: rel(file), titulo: '', ruta: '', hu: '', zonas: [], acciones: [], notas: [] }
  let section = null
  let current = null
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^VISTA:|^Layout/.test(line.trim())) info.titulo = line.trim().replace(/^VISTA:\s*/, '')
    else if (/^Ruta:/.test(line.trim())) info.ruta = line.trim().replace(/^Ruta:\s*/, '').replace(/\s{2,}/g, ' · ')
    else if (/^HU:/.test(line.trim())) info.hu = line.trim().replace(/^HU:\s*/, '')
    else if (/ZONAS DIN[ÁA]MICAS/.test(line)) section = 'zonas'
    else if (/^ACCIONES/.test(line.trim())) section = 'acciones'
    else if (!line.trim()) {
      current = null
      if (section) section = section === 'notas' ? 'notas' : null
    } else if (section && /^\s*\[[A-Z]\d+\]/.test(line)) {
      current = { id: /\[([A-Z]\d+)\]/.exec(line)[1], texto: line.replace(/^\s*\[[A-Z]\d+\]\s*/, '').trim() }
      info[section].push(current)
    } else if (section && current) {
      current.texto += ' ' + line.trim()
    } else if (!section && info.titulo && line.trim()) {
      info.notas.push(line.trim())
    }
  }
  return info
}

function splitEntry(texto) {
  const t = texto.replace(/\s+/g, ' ').trim()
  const limpia = (s) => s.replace(/[\s.]+$/, '').trim()
  const dots = /\s?\.{2,}\s?/.exec(t)
  if (dots) return [limpia(t.slice(0, dots.index)), t.slice(dots.index + dots[0].length).trim()]
  const mm = METHOD.exec(t)
  if (mm && mm.index > 0) return [limpia(t.slice(0, mm.index)), t.slice(mm.index).trim()]
  return [t, '']
}

const esc = (s) => s.replace(/\|/g, '\\|')

const vistas = [...walk(join(src, 'layouts')), ...walk(join(src, 'pages'))]
  .filter((f) => f.endsWith('.jsx'))
  .map(parseHeader)
  .filter(Boolean)

const grupos = [
  ['Layouts (cabeceras comunes)', (v) => v.file.includes('/layouts/')],
  ['Acceso y autenticación', (v) => v.file.includes('/pages/auth/')],
  ['Comunes a todos los roles', (v) => v.file.includes('/pages/comun/')],
  ['Rol CIUDADANO', (v) => v.file.includes('/pages/ciudadano/')],
  ['Rol RECOLECTOR', (v) => v.file.includes('/pages/recolector/')],
  ['Rol ADMIN', (v) => v.file.includes('/pages/admin/')],
]

let md = `# Zonas dinámicas por vista

> Documento **generado** con \`npm run docs\` a partir de la cabecera de cada vista. No lo edites a mano:
> modifica el comentario inicial del fichero \`.jsx\` y vuelve a generarlo.

**Cómo localizarlas en el código y en pantalla**

- Cada vista empieza con un bloque \`ZONAS DINÁMICAS\` (lecturas, \`[Z1]…\`) y \`ACCIONES\` (escrituras, \`[A1]…\`).
- En el JSX, cada zona va precedida de \`{/* ⚡ ZONA DINÁMICA Zn — … */}\` y su contenedor lleva \`data-dyn="Zn · MÉTODO /ruta"\`.
- Con \`npm run dev\`, el botón flotante **«Zonas dinámicas»** (abajo a la izquierda) recuadra en naranja todos esos bloques.
- Todo lo que **no** está en estas tablas es contenido estático (textos, iconos, ayudas).
- Las rutas están escritas con el prefijo \`/api\` (valor de \`VITE_API_URL\`).

`

for (const [titulo, filtro] of grupos) {
  const lista = vistas.filter(filtro)
  if (!lista.length) continue
  md += `\n## ${titulo}\n`
  for (const v of lista) {
    md += `\n### ${v.titulo || v.file}\n\n`
    md += `- **Fichero:** [\`${v.file}\`](../${v.file})\n`
    if (v.ruta) md += `- **Ruta / rol:** ${v.ruta}\n`
    if (v.hu) md += `- **Historias de usuario:** ${v.hu}\n`
    if (v.zonas.length) {
      md += `\n| Zona | Qué muestra | Origen de los datos |\n|---|---|---|\n`
      for (const z of v.zonas) {
        const [que, origen] = splitEntry(z.texto)
        md += `| **${z.id}** | ${esc(que)} | \`${esc(origen || '—')}\` |\n`
      }
    }
    if (v.acciones.length) {
      md += `\n| Acción | Qué hace | Endpoint |\n|---|---|---|\n`
      for (const a of v.acciones) {
        const [que, origen] = splitEntry(a.texto)
        md += `| **${a.id}** | ${esc(que)} | \`${esc(origen || '—')}\` |\n`
      }
    }
    const notas = v.notas.filter((n) => !/^(Ruta|HU):/.test(n))
    if (notas.length) md += `\n> ${notas.join(' ')}\n`
  }
}

/* ───────────────────────── Endpoints (servicios) ───────────────────────── */

const ROL_POR_SERVICIO = {
  'authService.js': 'Público (salvo `me`/`logout`: autenticado)',
  'perfilService.js': 'Autenticado (cualquier rol)',
  'configService.js': 'Autenticado (cualquier rol)',
  'calendarioService.js': 'CIUDADANO',
  'ciudadanoService.js': 'CIUDADANO',
  'recolectorService.js': 'RECOLECTOR',
  'adminService.js': 'ADMIN',
}

const endpoints = []
for (const file of walk(join(src, 'api')).filter((f) => f.endsWith('Service.js'))) {
  const code = readFileSync(file, 'utf8')
  const name = file.split(/[\\/]/).pop()
  // El cuerpo del comentario no puede contener "*/" (evita fusionar el JSDoc del fichero con el de la 1ª función)
  const re = /\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*\n\s*(\w+):/g
  let m
  while ((m = re.exec(code))) {
    const comment = m[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean)
    const fn = m[2]
    const texto = comment.join(' ')
    const ep = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[^\s,)]+)/.exec(texto)
    if (!ep) continue
    const hu = [...new Set(texto.match(/HU-\d{2}\.\d{2}/g) ?? [])].join(', ')
    const first = comment[0]
      .replace(/HU-\d{2}\.\d{2}(\s*\/\s*HU-\d{2}\.\d{2})*\s*·?\s*/g, '')
      .replace(/\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\/\S+/, '')
      .replace(/^[\s·:—-]+|[\s·:—-]+$/g, '')
    const detalle = comment.slice(1).join(' ')
    endpoints.push({ servicio: name, rol: ROL_POR_SERVICIO[name] ?? '—', metodo: ep[1], ruta: ep[2], hu, fn, resumen: first, detalle })
  }
}

let api = `# Contrato de API REST para Spring Boot

> Documento **generado** con \`npm run docs\` a partir del JSDoc de \`src/api/*Service.js\`.
> Cada fila es una llamada real que hace el front cuando \`VITE_USE_MOCKS=false\`.
> La forma exacta de cada respuesta está en el JSDoc del servicio y en el mock equivalente de \`src/mocks/\`.

**Convenciones**

- Prefijo \`/api\`, JSON en \`camelCase\`, fechas ISO-8601, importes como número decimal en euros.
- Listados paginados con la forma de Spring Data \`Page<T>\`: \`{ content, totalElements, totalPages, number, size }\` y parámetros \`page\` (desde 0) y \`size\`.
- Autenticación: cabecera \`Authorization: Bearer <accessToken>\` (ver \`docs/SPRING_SECURITY.md\`).
- Errores: \`{ status, code, message, fieldErrors }\` (ver \`src/api/ApiError.js\`).
- Los endpoints de un rol **nunca** reciben el id del usuario: el backend lo obtiene del token.

Total: **${endpoints.length} endpoints**.
`

for (const [servicio, rol] of Object.entries(ROL_POR_SERVICIO)) {
  const lista = endpoints.filter((e) => e.servicio === servicio)
  if (!lista.length) continue
  api += `\n## \`${servicio}\` — rol: ${rol}\n\n| Método | Ruta | HU | Función front | Descripción |\n|---|---|---|---|---|\n`
  for (const e of lista) {
    api += `| \`${e.metodo}\` | \`${esc(e.ruta)}\` | ${e.hu || '—'} | \`${e.fn}\` | ${esc(e.resumen)}${e.detalle ? `<br><sub>${esc(e.detalle)}</sub>` : ''} |\n`
  }
}

mkdirSync(join(root, 'docs'), { recursive: true })
writeFileSync(join(root, 'docs', 'ZONAS_DINAMICAS.md'), md)
writeFileSync(join(root, 'docs', 'API_ENDPOINTS.md'), api)
console.log(`✓ docs/ZONAS_DINAMICAS.md (${vistas.length} vistas)`)
console.log(`✓ docs/API_ENDPOINTS.md (${endpoints.length} endpoints)`)
