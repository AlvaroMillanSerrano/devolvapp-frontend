# Zonas dinámicas por vista

> Documento **generado** con `npm run docs` a partir de la cabecera de cada vista. No lo edites a mano:
> modifica el comentario inicial del fichero `.jsx` y vuelve a generarlo.

**Cómo localizarlas en el código y en pantalla**

- Cada vista empieza con un bloque `ZONAS DINÁMICAS` (lecturas, `[Z1]…`) y `ACCIONES` (escrituras, `[A1]…`).
- En el JSX, cada zona va precedida de `{/* ⚡ ZONA DINÁMICA Zn — … */}` y su contenedor lleva `data-dyn="Zn · MÉTODO /ruta"`.
- Con `npm run dev`, el botón flotante **«Zonas dinámicas»** (abajo a la izquierda) recuadra en naranja todos esos bloques.
- Todo lo que **no** está en estas tablas es contenido estático (textos, iconos, ayudas).
- Las rutas están escritas con el prefijo `/api` (valor de `VITE_API_URL`).


## Layouts (cabeceras comunes)

### Layout común a los tres roles

- **Fichero:** [`app/layouts/AppLayout.jsx`](../app/layouts/AppLayout.jsx)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **L1** | Nombre del usuario | `usuario de la sesión (POST /api/auth/login · GET /api/auth/me) → usuario.nombre` |
| **L2** | Impacto (panel lateral) | `GET /api/ciudadano/impacto \| GET /api/recolector/impacto` |
| **L3** | Zonas del recolector | `usuario de la sesión → usuario.zonaPreferida, usuario.zonasRecogida` |
| **L4** | Avisos de administración | `GET /api/admin/pendientes (número en la pestaña «Pendientes»)` |

> Barra superior + pestañas inferiores en móvil (estilo app de reparto). En pantallas grandes el ciudadano y el recolector tienen un panel lateral con su impacto ambiental (CO2), que se carga aquí una sola vez y llega a las vistas por el contexto del <Outlet> (useOutletContext → { impacto, reloadImpacto }).

## Acceso y autenticación

### Inicio de sesión MULTIROL

- **Fichero:** [`app/pages/auth/LoginPage.jsx`](../app/pages/auth/LoginPage.jsx)
- **Ruta / rol:** /login · Acceso: público (solo sin sesión)
- **Historias de usuario:** HU-01.02 (inicio de sesión), HU-01.03 (roles), HU-07.02 (cuentas suspendidas)

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Iniciar sesión | `POST /api/auth/login { username, password } 200 → { accessToken, refreshToken, usuario: { roles: ["ROLE_CIUDADANO", ...] } } 401 BAD_CREDENTIALS → mensaje genérico (no revela si el usuario existe) 403 ACCOUNT_SUSPENDED → cuenta suspendida por un administrador 429 TOO_MANY_ATTEMPTS → bloqueo temporal por intentos fallidos` |

> Tras el login: - 1 rol .................................... → home de ese rol - varios roles + último rol usado guardado . → home de ese rol - varios roles sin preferencia ............. → /seleccionar-perfil

### Recuperar contraseña — solicitud de enlace

- **Fichero:** [`app/pages/auth/RecuperarPasswordPage.jsx`](../app/pages/auth/RecuperarPasswordPage.jsx)
- **Ruta / rol:** /recuperar-password · Acceso: público
- **Historias de usuario:** HU-01.04

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Solicitar enlace | `POST /api/auth/password/recuperar { email } Responde 202 exista o no la cuenta (no se revela qué correos están registrados). El backend envía un enlace /restablecer-password?token=… de un solo uso y caducidad limitada.` |

### Registro de ciudadano

- **Fichero:** [`app/pages/auth/RegistroPage.jsx`](../app/pages/auth/RegistroPage.jsx)
- **Ruta / rol:** /registro · Acceso: público
- **Historias de usuario:** HU-01.01

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Crear cuenta | `POST /api/auth/registro body: { nombre, apellidos, dni, telefono, email, password, direccion: { tipoVia, nombreVia, numero, piso, letra, codigoPostal, ciudad }, aceptaPrivacidad } 201 → cuenta creada con ROLE_CIUDADANO 400 VALIDATION_ERROR (fieldErrors) · 409 DUPLICATE_* (email / teléfono / DNI ya registrados)` |

> Las validaciones de cliente (DNI/NIE con letra de control, email, teléfono, CP, campos obligatorios de dirección) son solo UX: Spring debe repetirlas.

### Restablecer contraseña desde el enlace del correo

- **Fichero:** [`app/pages/auth/RestablecerPasswordPage.jsx`](../app/pages/auth/RestablecerPasswordPage.jsx)
- **Ruta / rol:** /restablecer-password?token=XXXX · Acceso: público
- **Historias de usuario:** HU-01.04

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Validez del enlace | `GET /api/auth/password/token/{token} 200 { valido, email (enmascarado), expiraEn } · 410 TOKEN_EXPIRED \| TOKEN_USED → se ofrece pedir otro enlace` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Guardar contraseña | `POST /api/auth/password/restablecer { token, password } (el token queda invalidado)` |

> Mock: ?token=expirado y ?token=usado simulan los dos casos de error.

### Selección de perfil para usuarios MULTIROL

- **Fichero:** [`app/pages/auth/SeleccionPerfilPage.jsx`](../app/pages/auth/SeleccionPerfilPage.jsx)
- **Ruta / rol:** /seleccionar-perfil · Acceso: autenticado con 2+ roles
- **Historias de usuario:** HU-01.02 / HU-01.03

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Nombre y roles del usuario | `respuesta de POST /api/auth/login (usuario.roles) — sin petición adicional` |

## Comunes a todos los roles

### Ajustes de mi cuenta (datos personales, dirección y contraseña)

- **Fichero:** [`app/pages/comun/PerfilPage.jsx`](../app/pages/comun/PerfilPage.jsx)
- **Ruta / rol:** /ciudadano/perfil · /recolector/perfil · /admin/perfil · Rol: cualquiera
- **Historias de usuario:** HU-01.01 (datos y dirección completa del ciudadano), HU-07.02 (información de usuario actualizada)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Mis datos y dirección | `GET /api/perfil` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Guardar datos / dirección | `PUT /api/perfil` |
| **A2** | Cambiar contraseña | `PUT /api/perfil/password` |

## Rol CIUDADANO

### Inicio del ciudadano

- **Fichero:** [`app/pages/ciudadano/InicioPage.jsx`](../app/pages/ciudadano/InicioPage.jsx)
- **Ruta / rol:** /ciudadano · Rol: CIUDADANO
- **Historias de usuario:** HU-05.01 (saldo), HU-03.03 (estado de las recogidas en curso)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z0** | CO2 evitado (lo primero que ve) | `GET /api/ciudadano/impacto (lo carga el layout: useOutletContext)` |
| **Z1** | Saldo disponible | `GET /api/ciudadano/monedero` |
| **Z2** | Pedidos en curso | `GET /api/ciudadano/pedidos?estado=ACTIVOS` |
| **Z3** | Dirección de recogida | `usuario de la sesión (GET /api/auth/me) → usuario.direccion, usuario.zona` |

### Monedero

- **Fichero:** [`app/pages/ciudadano/MonederoPage.jsx`](../app/pages/ciudadano/MonederoPage.jsx)
- **Ruta / rol:** /ciudadano/monedero · Rol: CIUDADANO
- **Historias de usuario:** HU-05.01 (saldo), HU-05.03 (retirar a mi cuenta), HU-05.05 (movimientos)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Saldo disponible | `GET /api/ciudadano/monedero` |
| **Z2** | Movimientos | `GET /api/ciudadano/monedero/movimientos?page=` |
| **Z3** | Cómo se calcula | `GET /api/config/parametros → economia` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Retirar dinero | `POST /api/ciudadano/monedero/retiradas` |

### Detalle de un pedido

- **Fichero:** [`app/pages/ciudadano/PedidoDetallePage.jsx`](../app/pages/ciudadano/PedidoDetallePage.jsx)
- **Ruta / rol:** /ciudadano/pedidos/:id · Rol: CIUDADANO
- **Historias de usuario:** HU-02.02 (código de cada bolsa), HU-02.03 (composición), HU-03.03 (estado), HU-03.04 (cancelar), HU-05.02 (importe abonado), HU-06.04 (incidencias del pedido)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Estado y seguimiento | `GET /api/ciudadano/pedidos/{id} → estado, creadoEn, iniciadoEn, completadoEn, canceladoEn` |
| **Z2** | Bolsas del pedido | `GET /api/ciudadano/pedidos/{id} → bolsas[]` |
| **Z3** | Importe abonado y CO2 | `GET /api/ciudadano/pedidos/{id} → liquidacion, co2EvitadoKg` |
| **Z4** | Incidencias | `GET /api/ciudadano/pedidos/{id} → incidencias[]` |
| **Z5** | Tipos de envase (nombres) | `GET /api/catalogo/tipos-envase` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Cancelar pedido | `POST /api/ciudadano/pedidos/{id}/cancelar` |

### Mis pedidos

- **Fichero:** [`app/pages/ciudadano/PedidosPage.jsx`](../app/pages/ciudadano/PedidosPage.jsx)
- **Ruta / rol:** /ciudadano/pedidos · Rol: CIUDADANO
- **Historias de usuario:** HU-02.03 (listado de pedidos), HU-03.03 (estado de cada recogida)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Lista de pedidos (paginada, filtrable por estado) | `GET /api/ciudadano/pedidos?estado=&page=` |

## Rol RECOLECTOR

### Bienvenida del recolector (primer inicio de sesión)

- **Fichero:** [`app/pages/recolector/BienvenidaPage.jsx`](../app/pages/recolector/BienvenidaPage.jsx)
- **Ruta / rol:** /recolector/bienvenida · Rol: RECOLECTOR (si aún no tiene zona preferida o tiene contraseña provisional)
- **Historias de usuario:** HU-07.06 (asignación por zona)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Zonas disponibles con sus CP | `GET /api/recolector/preferencias → zonas` |
| **Z2** | Barrios de cada CP | `GET /api/catalogo/codigos-postales` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Crear su contraseña | `PUT /api/perfil/password-inicial (sustituye a la provisional)` |
| **A2** | Guardar zona preferida | `PUT /api/recolector/preferencias/zona (solo la primera vez)` |

> Pasos: 1) crear su contraseña (solo si la cuenta la creó administración) · 2) elegir zona preferida

### Historial de recogidas completadas

- **Fichero:** [`app/pages/recolector/HistorialPage.jsx`](../app/pages/recolector/HistorialPage.jsx)
- **Ruta / rol:** /recolector/historial · Rol: RECOLECTOR
- **Historias de usuario:** HU-04.03 (recogidas finalizadas), HU-04.04 (resultado de las bolsas)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | CO2 evitado con mis recogidas | `GET /api/recolector/impacto (lo carga el layout: useOutletContext)` |
| **Z2** | Recogidas completadas | `GET /api/recolector/historial?page=` |

### Recogida (empezar → verificar bolsas → completar)

- **Fichero:** [`app/pages/recolector/RecogidaPage.jsx`](../app/pages/recolector/RecogidaPage.jsx)
- **Ruta / rol:** /recolector/recogidas/:id · Rol: RECOLECTOR
- **Historias de usuario:** HU-04.01 (solo recogidas asignadas), HU-04.02 (iniciar), HU-04.03 (verificar y finalizar), HU-04.04 (resultado por bolsa), HU-06.01 (registrar incidencia)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Dirección, mapa, franja y ciudadano | `GET /api/recolector/recogidas/{id} (403 si no es suya)` |
| **Z2** | Bolsas y su resultado | `GET /api/recolector/recogidas/{id} → bolsas[]` |
| **Z3** | Incidencias registradas | `GET /api/recolector/recogidas/{id} → incidencias[]` |
| **Z4** | Tipos de envase / de incidencia | `GET /api/catalogo/tipos-envase · GET /api/catalogo/tipos-incidencia` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Empezar recogida | `POST /api/recolector/recogidas/{id}/iniciar` |
| **A2** | Resultado de una bolsa | `PUT /api/recolector/recogidas/{id}/bolsas/{bolsaId}` |
| **A3** | Completar recogida | `POST /api/recolector/recogidas/{id}/completar` |
| **A4** | Registrar incidencia | `POST /api/recolector/recogidas/{id}/incidencias` |

### Mis recogidas

- **Fichero:** [`app/pages/recolector/RecogidasPage.jsx`](../app/pages/recolector/RecogidasPage.jsx)
- **Ruta / rol:** /recolector · Rol: RECOLECTOR
- **Historias de usuario:** HU-04.01 (recogidas asignadas con fecha, franja, dirección e identificador; las canceladas, marcadas)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z0** | CO2 evitado con mis recogidas | `GET /api/recolector/impacto (lo carga el layout: useOutletContext)` |
| **Z1** | Zonas de hoy y resumen del día | `GET /api/recolector/recogidas → asignaciones, recogidas[] (conteo)` |
| **Z2** | Recogidas agrupadas por día | `GET /api/recolector/recogidas → recogidas[]` |

### Mapa y ruta del día

- **Fichero:** [`app/pages/recolector/RutaPage.jsx`](../app/pages/recolector/RutaPage.jsx)
- **Ruta / rol:** /recolector/ruta · Rol: RECOLECTOR
- **Historias de usuario:** HU-04.01 (recogidas asignadas con fecha, franja y dirección)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Paradas en el mapa y ruta sugerida | `GET /api/recolector/ruta?fecha=&lat=&lng=` |
| **Z2** | Orden de paradas, km y tiempo | `GET /api/recolector/ruta → paradas[], distanciaKm, duracionMin` |

> La ruta respeta las franjas (primero las que empiezan antes) y, dentro de cada franja, va por cercanía. «Abrir en Google Maps» calcula el trayecto real por carretera con el mismo orden.

### Bloque «Mi zona» del perfil del recolector

- **Fichero:** [`app/pages/recolector/ZonaPreferencias.jsx`](../app/pages/recolector/ZonaPreferencias.jsx)
- **Ruta / rol:** /recolector/perfil · Rol: RECOLECTOR
- **Historias de usuario:** HU-07.06 (zona preferida y solicitud de cambio)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z2** | Zona preferida, días por zona y solicitudes | `GET /api/recolector/preferencias` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A3** | Pedir cambio de zona | `POST /api/recolector/solicitudes-zona` |
| **A4** | Cancelar mi solicitud | `POST /api/recolector/solicitudes-zona/{id}/cancelar` |

## Rol ADMIN

### Incidencias

- **Fichero:** [`app/pages/admin/IncidenciasPage.jsx`](../app/pages/admin/IncidenciasPage.jsx)
- **Ruta / rol:** /admin/incidencias · Rol: ADMIN
- **Historias de usuario:** HU-06.02 (consultar y filtrar), HU-06.03 (resolver con trazabilidad), HU-04.04 (resultados por bolsa de la recogida), HU-03.03 (cancelación autorizada de la recogida)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Lista de incidencias (filtro por tipo y estado) | `GET /api/admin/incidencias?tipo=&estado=&page=` |
| **Z2** | Detalle, recogida asociada e historial | `GET /api/admin/incidencias/{id}` |
| **Z3** | Tipos de incidencia (filtro) | `GET /api/catalogo/tipos-incidencia` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Cambiar estado / registrar resolución | `PATCH /api/admin/incidencias/{id}` |
| **A2** | Cancelar la recogida asociada | `POST /api/admin/recogidas/{id}/cancelar` |

### Pagos a ciudadanos (aceptar o rechazar transferencias)

- **Fichero:** [`app/pages/admin/PagosPage.jsx`](../app/pages/admin/PagosPage.jsx)
- **Ruta / rol:** /admin/pagos · Rol: ADMIN
- **Historias de usuario:** HU-07.03 (estado de las transferencias), HU-05.04 (registrar el resultado sin pagos duplicados)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Totales por estado | `GET /api/admin/transferencias → totales` |
| **Z2** | Lista de transferencias | `GET /api/admin/transferencias?estado=&page=` |
| **Z3** | Detalle e historial | `GET /api/admin/transferencias/{id}` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Aceptar y pagar / rechazar una | `POST /api/admin/transferencias/{id}/resultado (la referencia la genera el servidor)` |
| **A2** | Aceptar y pagar varias a la vez | `POST /api/admin/transferencias/pagar-lote (genera la remesa y las referencias)` |

### Pendientes (bandeja de administración)

- **Fichero:** [`app/pages/admin/PendientesPage.jsx`](../app/pages/admin/PendientesPage.jsx)
- **Ruta / rol:** /admin/pendientes · Rol: ADMIN
- **Historias de usuario:** HU-05.04 / HU-07.03 (transferencias por aceptar), HU-06.03 (incidencias), HU-07.06 (zonas sin recolector y cambios de zona)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Contadores de tareas | `GET /api/admin/pendientes` |
| **Z2** | Días sin recolector | `GET /api/admin/pendientes → diasSinRecolector[]` |
| **Z3** | Solicitudes de cambio de zona | `ver SolicitudesZona.jsx (GET /api/admin/solicitudes-zona)` |

### Recogidas (todas)

- **Fichero:** [`app/pages/admin/RecogidasPage.jsx`](../app/pages/admin/RecogidasPage.jsx)
- **Ruta / rol:** /admin/recogidas · Rol: ADMIN
- **Historias de usuario:** HU-04.04 (resultados por bolsa e incidencias de cada recogida), HU-03.03 (cancelación autorizada), HU-07.06 (recolector responsable)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Lista filtrable (fecha, estado, zona, texto) | `GET /api/admin/recogidas?fecha=&estado=&zonaId=&q=&page=` |
| **Z2** | Detalle con bolsas, liquidación e incidencias | `GET /api/admin/recogidas/{id}` |
| **Z3** | Zonas (filtro) y recolectores (reasignar) | `GET /api/admin/zonas · GET /api/admin/recolectores` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Reasignar recolector | `PUT /api/admin/recogidas/{id}/recolector` |
| **A2** | Cancelar recogida | `POST /api/admin/recogidas/{id}/cancelar` |

### Resumen (indicadores y reparto económico)

- **Fichero:** [`app/pages/admin/ResumenPage.jsx`](../app/pages/admin/ResumenPage.jsx)
- **Ruta / rol:** /admin · Rol: ADMIN
- **Historias de usuario:** HU-07.04 (indicadores de recogidas e incidencias por periodo), HU-07.05 (reparto económico por periodo)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z0** | CO2 evitado en el periodo y por zona | `GET /api/admin/indicadores?desde=&hasta= → impacto, porZona` |
| **Z1** | Recogidas e incidencias del periodo | `GET /api/admin/indicadores?desde=&hasta= → recogidas, incidencias` |
| **Z2** | Reparto económico del periodo | `GET /api/admin/indicadores?desde=&hasta= → economia` |
| **Z3** | Porcentajes del reparto | `GET /api/config/parametros → economia` |

### Bloque «Solicitudes de cambio de zona» (en Pendientes y en Zonas)

- **Fichero:** [`app/pages/admin/SolicitudesZona.jsx`](../app/pages/admin/SolicitudesZona.jsx)
- **Ruta / rol:** /admin/pendientes · /admin/zonas · Rol: ADMIN
- **Historias de usuario:** HU-07.06 (asignación de recolectores por zona)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Solicitudes pendientes | `GET /api/admin/solicitudes-zona?estado=PENDIENTE` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Aprobar / rechazar | `POST /api/admin/solicitudes-zona/{id}/resolver` |

### Usuarios

- **Fichero:** [`app/pages/admin/UsuariosPage.jsx`](../app/pages/admin/UsuariosPage.jsx)
- **Ruta / rol:** /admin/usuarios · Rol: ADMIN
- **Historias de usuario:** HU-07.02 (consultar cuentas por rol, ver su estado, suspender), HU-01.03 (roles)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Lista de usuarios (búsqueda y filtro por rol) | `GET /api/admin/usuarios?q=&rol=&page=` |
| **Z2** | Ficha del usuario | `GET /api/admin/usuarios/{id}` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A0** | Editar datos y dirección | `PUT /api/admin/usuarios/{id}` |
| **A1** | Suspender cuenta | `POST /api/admin/usuarios/{id}/suspender` |
| **A2** | Reactivar cuenta | `POST /api/admin/usuarios/{id}/reactivar` |
| **A3** | Dar de alta un recolector | `POST /api/admin/recolectores (devuelve su contraseña provisional)` |
| **A4** | Generar contraseña provisional | `POST /api/admin/usuarios/{id}/password-provisional` |
| **A5** | Modificar roles | `PUT /api/admin/usuarios/{id}/roles` |

### Zonas de reparto (códigos postales, recolector por día y horarios)

- **Fichero:** [`app/pages/admin/ZonasPage.jsx`](../app/pages/admin/ZonasPage.jsx)
- **Ruta / rol:** /admin/zonas · Rol: ADMIN
- **Historias de usuario:** HU-07.06 (zona por CP y recolector asignado, aquí por día de la semana), HU-07.01 (días, horarios y capacidad)

| Zona | Qué muestra | Origen de los datos |
|---|---|---|
| **Z1** | Zonas con sus CP y su semana (recolector y franjas por día) | `GET /api/admin/zonas` |
| **Z2** | Cobertura de los CP de Málaga | `GET /api/admin/codigos-postales` |
| **Z3** | Recolectores (preferencia y días ocupados) | `GET /api/admin/recolectores` |
| **Z4** | Solicitudes de cambio de zona | `ver SolicitudesZona.jsx` |

| Acción | Qué hace | Endpoint |
|---|---|---|
| **A1** | Nueva zona (nombre + CP) | `POST /api/admin/zonas` |
| **A2** | Editar nombre y CP | `PUT /api/admin/zonas/{id}` |
| **A3** | Borrar zona | `DELETE /api/admin/zonas/{id}` |
| **A4** | Recolector de un día | `PUT /api/admin/zonas/{id}/dias/{diaSemana}/recolector` |
| **A5** | Añadir / editar / borrar franja | `POST /api/admin/zonas/{id}/franjas · PUT/DELETE /api/admin/franjas/{id}` |
