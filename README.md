# DevolvUp · Front-end React

App sencilla tipo «delivery al revés» para **Málaga**: el ciudadano llena bolsas de envases, elige día y hora, un recolector
pasa a recogerlas y el ciudadano cobra en su monedero. Lo primero que ve cada usuario es **cuánto CO₂ ha ayudado a evitar**. Las vistas salen **directamente de las historias de usuario
(EP-01 a EP-07)**: de Stitch solo se conserva el color y la tipografía; se han quitado sus pantallas y textos
de corte institucional (remesas SEPA, auditoría, cierre de turno, PIN…), que no pedía ninguna HU.

- **Stack:** React 19 · Vite 8 · React Router 6 · Tailwind CSS 3 · Axios
- **Backend esperado:** Spring Boot 3 + Spring Security 6 con JWT (ver [`docs/SPRING_SECURITY.md`](docs/SPRING_SECURITY.md))

## Arranque rápido

```bash
npm install
npm run dev          # http://localhost:5173  (modo mock: sin backend)
```

Con `VITE_USE_MOCKS=true` (por defecto en `.env.development`) los servicios usan una base de datos en memoria
(`src/mocks/db.js`) compartida por los tres roles: lo que pide un ciudadano le aparece al recolector de su zona, las
incidencias del recolector llegan a administración, etc. Se reinicia al recargar la página. Si quieres probar el
recorrido completo sin perder datos, entra con `multirol@devolvup.es` y cambia de perfil desde la cabecera.

Cuentas demo (contraseña `demo1234`):

| Cuenta | Perfiles |
|---|---|
| `ciudadano@devolvup.es` | Ciudadano (zona Centro, con 6 meses de historial, saldo y una incidencia) |
| `recolector@devolvup.es` | Recolector: Centro de lunes a viernes y Norte martes y jueves |
| `nuevo@devolvup.es` | Recolector recién dado de alta: al entrar tiene que elegir su zona preferida |
| `admin@devolvup.es` | Administración |
| `multirol@devolvup.es` | Ciudadano + Recolector + Administración |
| `suspendida@devolvup.es` | Cuenta suspendida (error 403 `ACCOUNT_SUSPENDED`) |

Recuperación de contraseña: `/restablecer-password?token=abc` (válido), `?token=expirado`, `?token=usado`.

### Conectar con Spring Boot

1. Crea `.env.development.local` con `VITE_USE_MOCKS=false` (y `VITE_PROXY_TARGET` si el backend no está en `http://localhost:8080`).
2. `npm run dev`: Vite redirige `/api/**` al backend (no hace falta CORS en desarrollo).
3. Implementa los endpoints de [`docs/API_ENDPOINTS.md`](docs/API_ENDPOINTS.md) con las formas de respuesta de los mocks.

| Variable | Por defecto | Uso |
|---|---|---|
| `VITE_API_URL` | `/api` | Base de la API (en producción, la URL pública del backend) |
| `VITE_PROXY_TARGET` | `http://localhost:8080` | Destino del proxy de desarrollo |
| `VITE_USE_MOCKS` | `true` en desarrollo | `true` = datos simulados, `false` = backend real |
| `VITE_SHOW_DYNAMIC_ZONES` | `true` en desarrollo | Muestra el botón «Zonas dinámicas» |

## Zonas dinámicas: dónde está lo que viene del servidor

Están marcadas de tres formas que coinciden entre sí:

1. **Cabecera de cada vista**: bloque `ZONAS DINÁMICAS` (`[Z1]…`, lecturas) y `ACCIONES` (`[A1]…`, escrituras), con el endpoint y la HU.
2. **En el JSX**: `{/* ⚡ ZONA DINÁMICA Z3 — GET /api/… */}` justo antes del bloque, que además lleva `data-dyn="Z3 · GET /…"`.
3. **En pantalla**: el botón flotante **«Zonas dinámicas»** (abajo a la izquierda) recuadra en naranja cada bloque con su endpoint.

El inventario completo está en [`docs/ZONAS_DINAMICAS.md`](docs/ZONAS_DINAMICAS.md) y el contrato de API en
[`docs/API_ENDPOINTS.md`](docs/API_ENDPOINTS.md) (67 endpoints). Los dos se **generan desde el código** con `npm run docs`.

## Vistas por rol

En escritorio el contenido ocupa hasta 1280 px: el ciudadano y el recolector tienen a la derecha un panel con su impacto
(CO₂ por mes, por tipo de envase, el de su zona…). En móvil hay pestañas abajo.

**Ciudadano** (Inicio · Pedidos · Monedero · Perfil)

| Vista | Ruta | HU |
|---|---|---|
| Inicio: **CO₂ evitado** con equivalencias, «Pedir recogida», saldo, dirección y pedidos en curso | `/ciudadano` | 05.01, 03.03 |
| Nuevo pedido: bolsas → día y hora → confirmar (con códigos de bolsa, ganancia y CO₂ estimados) | `/ciudadano/nuevo` | 02.01, 02.02, 03.01, 03.02 |
| Mis pedidos (filtro por estado) | `/ciudadano/pedidos` | 02.03, 03.03 |
| Detalle del pedido: seguimiento, bolsas, importe y CO₂, incidencias, cancelar | `/ciudadano/pedidos/:id` | 02.02, 02.03, 03.03, 03.04, 06.04 |
| Monedero: saldo, retirar a mi IBAN, movimientos | `/ciudadano/monedero` | 05.01, 05.03, 05.05 |
| Perfil: **dirección** (tipo de vía, nombre, número, piso, letra, ciudad, CP), datos y contraseña | `/ciudadano/perfil` | 01.01 |

**Recolector** (Hoy · Mapa y ruta · Historial · Perfil)

| Vista | Ruta | HU |
|---|---|---|
| Bienvenida (solo el primer inicio de sesión): elegir zona preferida | `/recolector/bienvenida` | 07.06 |
| Hoy: CO₂ evitado, zonas en las que recoge hoy y recogidas por día | `/recolector` | 04.01 |
| Mapa y ruta: paradas del día en el mapa, orden sugerido, km y tiempo, «Abrir en Google Maps» | `/recolector/ruta` | 04.01 |
| Recogida: mapa, empezar → verificar cada bolsa → completar; incidencias | `/recolector/recogidas/:id` | 04.01–04.04, 06.01 |
| Historial de recogidas completadas con su CO₂ | `/recolector/historial` | 04.03 |
| Perfil: mi zona y días, **pedir cambio de zona**, mis solicitudes, datos y contraseña | `/recolector/perfil` | 07.06 |

**Administración** (Resumen · Pendientes · Recogidas · Pagos · Incidencias · Zonas · Usuarios · Mi perfil)

| Vista | Ruta | HU |
|---|---|---|
| Resumen: **CO₂ evitado** del periodo y por zona, recogidas, incidencias y reparto económico | `/admin` | 07.04, 07.05 |
| Pendientes: todo lo que espera decisión (transferencias, solicitudes de zona, incidencias, recogidas atrasadas o sin recolector, días sin recolector) | `/admin/pendientes` | 05.04, 06.03, 07.06 |
| Recogidas: todas, con filtros; detalle, reasignar recolector, cancelar | `/admin/recogidas` | 04.04, 03.03 |
| Pagos: **aceptar y pagar** o **rechazar** transferencias, una a una o varias a la vez | `/admin/pagos` | 07.03, 05.04 |
| Incidencias: filtro por tipo/estado, resolución con historial | `/admin/incidencias` | 06.02, 06.03 |
| Zonas: nombre + CP de Málaga, **recolector por día de la semana**, franjas y capacidad, solicitudes de cambio | `/admin/zonas` | 07.01, 07.06 |
| Usuarios: buscar, ficha, **editar datos y dirección**, suspender/reactivar, alta de recolector | `/admin/usuarios` | 07.02 |

**Acceso:** login multirol, selección de perfil, registro (con la dirección detallada), recuperar y restablecer contraseña (EP-01).

## Estructura

```
src/
  api/          client.js (axios + JWT + refresh), mock.js (mockable), *Service.js (uno por rol)
  auth/         AuthProvider (sesión multirol), ProtectedRoute (guardas por rol), tokenStorage
  components/   ui/ (Icon, Async, Modal, FormField, Estado, Paginacion, Toast) · impacto/ (CO₂) · mapa/ (Leaflet)
                DireccionFields · DynamicZonesToggle
  config/       env, roles
  hooks/        useApi / useAction, useParametros (parámetros y catálogos cacheados)
  layouts/      AppLayout (común a los 3 roles), RoleSwitcher
  mocks/        db.js (datos en memoria), malaga.js (CP de Málaga) + un mock por rol y perfil
  pages/        auth/, comun/ (perfil), ciudadano/, recolector/, admin/, errors/
  utils/        format (es-ES), validators (DNI/NIE, IBAN, CP…), direccion
docs/           ZONAS_DINAMICAS.md · API_ENDPOINTS.md (generados) · SPRING_SECURITY.md · MODELO_DATOS.md
scripts/        generar-docs.mjs
```

## Decisiones

- **Un pedido = una recogida.** El ciudadano declara las bolsas y elige la franja en el mismo paso; el seguimiento
  es por pedido (PENDIENTE → EN_CAMINO → COMPLETADA, o CANCELADA) y cada bolsa solo tiene su código y su resultado (HU-02.02).
- **Zonas de Málaga (HU-07.06)**: una zona es un nombre + varios CP del municipio de Málaga (22 CP en
  `src/mocks/malaga.js`, con barrio y coordenadas orientativas). Un CP solo puede estar en una zona.
- **Recolector por día**: cada zona tiene un recolector distinto para cada día de la semana (p. ej. Centro: Carlos de
  lunes a viernes y Diego el sábado). Un recolector no puede estar en dos zonas el mismo día. El recolector de un pedido
  es el de la zona del ciudadano el día de la recogida; al ciudadano solo se le ofrecen días con horario **y** recolector.
  Si se cambia el recolector de un día, sus recogidas pendientes de ese día pasan al nuevo. No hay «autoasignarme».
- **Zona preferida del recolector**: la elige en su primer inicio de sesión. Después solo puede **pedir el cambio**;
  administración lo aprueba o rechaza (con mensaje) en «Pendientes» o en «Zonas». Al aprobar se puede marcar
  «pasar sus días a la zona nueva» (desmarcado por defecto, porque deja sin recolector esos días en su zona anterior).
- **CO₂ evitado**: kg de CO₂e por envase válido según su tipo (PET 0,03 · lata 0,09 · brik 0,02 · vidrio 0,04 · mezclado 0,04)
  y equivalencias (0,12 kg/km en coche, 21 kg por árbol y año). **Son valores orientativos** que el front lee de
  `GET /api/config/parametros`: hay que validarlos antes de publicarlos.
- **Ruta sugerida**: la calcula el backend (`GET /api/recolector/ruta`). El mock ordena por franja (no se puede llegar antes de que
  empiece) y dentro de cada franja por cercanía (vecino más próximo + 2-opt) desde la nave o la ubicación del recolector.
  La línea del mapa es el orden, no el trazado por calles: «Abrir en Google Maps» calcula el recorrido real (máx. 10 paradas).
  Para un trazado por calles en la propia app haría falta un servicio de rutas (OSRM, GraphHopper, Google Directions).
- **Mapa**: Leaflet + teselas de OpenStreetMap. Para producción conviene un proveedor de teselas propio o de pago.
- **Dirección**: tipo de vía, nombre, número, piso, letra, ciudad y CP. El backend la geocodifica (lat/lng) al guardarla.
  Si el ciudadano la cambia, los pedidos ya programados conservan la anterior.
- **Modelo económico del documento de HU** (0,10 €/envase, 40 % ciudadano · 60 % empresa), marcado como provisional.
  El front no lo tiene fijo: lo lee de `GET /api/config/parametros`. Solo cuentan los envases válidos y se abona una vez.
- **Verificación sin PIN**: el recolector marca cada bolsa como correcta, «no coincide» (indicando los válidos) o «no está».
  Las dos últimas crean una incidencia automáticamente (HU-04.04). No se puede completar con bolsas sin verificar.
- **Cancelación**: el ciudadano solo puede cancelar en PENDIENTE (HU-03.04). Administración puede cancelar desde
  una incidencia (p. ej. ciudadano ausente). Las reglas de plazo siguen pendientes en el PRD.
- **Pagos**: administración acepta y paga cada retirada (una a una o en lote) o la rechaza. La referencia de la
  transferencia (`TRF-AAAAMMDD-000123`) y la de la remesa (`REM-…`) las genera el servidor, no se escriben a mano; o la rechaza (con motivo, que ve el ciudadano). Una rechazada devuelve el importe al saldo y una procesada no se puede
  volver a procesar (HU-05.04).
- **Sin cliente nativo**: no hay escaneo de códigos ni cámara.
- **Alta de recolectores**: administración lo da de alta y el sistema genera una **contraseña provisional** que se muestra
  una sola vez para dársela. En su primer acceso crea su contraseña y elige su zona preferida. Desde la ficha del usuario se
  puede generar otra provisional si la olvida. (Alternativa en producción: enviar un enlace de activación por correo.)
- **Ajustes**: todas las cabeceras tienen un botón con engranaje «Ajustes» que lleva a los datos, la dirección y la contraseña.
- **Modo mock persistente**: los cambios se guardan en `localStorage` (sobreviven a recargar). El aviso «Modo mock» tiene
  un botón «Reiniciar datos» para volver a los datos de ejemplo.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (con proxy `/api` → Spring) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build |
| `npm run lint` | Oxlint |
| `npm run docs` | Regenera `docs/ZONAS_DINAMICAS.md` y `docs/API_ENDPOINTS.md` desde el código |
