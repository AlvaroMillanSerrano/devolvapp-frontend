# Modelo de datos propuesto (PostgreSQL)

Tablas mínimas para cubrir los 69 endpoints de [`API_ENDPOINTS.md`](API_ENDPOINTS.md). Los nombres de columna en
`snake_case` se exponen en la API en `camelCase`. `PK` = clave primaria, `FK` = clave foránea, `UQ` = único.

## Usuarios y acceso (EP-01, HU-07.02)

**usuario**
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| nombre, apellidos | varchar(80), varchar(120) | |
| email | varchar(160) UQ | login |
| dni | varchar(9) UQ | login alternativo |
| telefono | varchar(15) UQ | |
| password_hash | varchar(100) | BCrypt |
| debe_cambiar_password | boolean default false | true al crearlo un admin o al generar una provisional |
| estado | varchar(12) | `ACTIVA` · `SUSPENDIDA` |
| zona_preferida_id | bigint FK zona null | solo recolectores; null = primer inicio pendiente |
| creado_en, actualizado_en | timestamptz | |

**usuario_rol** — PK (usuario_id, rol)
| usuario_id | bigint FK usuario | |
|---|---|---|
| rol | varchar(12) | `CIUDADANO` · `RECOLECTOR` · `ADMIN` (un usuario puede tener varios) |

**direccion** — dirección actual del ciudadano (1:1)
| Columna | Tipo | Notas |
|---|---|---|
| usuario_id | bigint PK FK usuario | |
| tipo_via | varchar(20) | Calle, Avenida, Plaza… |
| nombre_via | varchar(120) | |
| numero | varchar(10) | |
| piso, letra | varchar(10) null | |
| codigo_postal | char(5) FK codigo_postal | |
| ciudad | varchar(80) | |
| lat, lng | numeric(9,6) | geocodificadas al guardar |

Control de la dirección (backend, en `PUT /api/perfil` y `PUT /api/admin/usuarios/{id}`):
- `codigo_postal` debe existir en la tabla `codigo_postal` (FK + `400 VALIDATION_ERROR` "Elige un código postal de Málaga de la lista").
  En el front es un desplegable cerrado; los CP sin zona aparecen como "próximamente".
- CP sin zona: **se acepta** y la respuesta trae `avisoZona` (sirve para medir demanda). El pedido lo rechaza `422 ZONA_SIN_SERVICIO`.
- Se geocodifica con CartoCiudad (IGN): si no encuentra la vía/número o el CP devuelto no coincide → `400` en `direccion.numero`
  "Revisa la calle y el número". Las coordenadas se guardan en `lat, lng`.

**refresh_token**: id PK · usuario_id FK · token_hash UQ · expira_en · revocado_en null · creado_en

**token_recuperacion** (HU-01.04): id PK · usuario_id FK · token_hash UQ · expira_en · usado_en null

## Zonas y horarios (HU-03.01, HU-07.01, HU-07.06)

**zona**: id PK · nombre varchar(80) UQ · creado_en

**codigo_postal**: cp char(5) PK · barrio varchar(80) · lat, lng · zona_id FK zona null (un CP solo en una zona)

**zona_dia_recolector** — quién recoge cada día de la semana
| zona_id | bigint FK zona | PK (zona_id, dia_semana) |
|---|---|---|
| dia_semana | smallint 1-7 | 1 = lunes |
| recolector_id | bigint FK usuario | UQ (recolector_id, dia_semana): no puede estar en dos zonas el mismo día |

**franja**: id PK · zona_id FK · dia_semana smallint · hora_inicio time · hora_fin time · capacidad smallint · activa boolean
(borrar = `activa=false`, para no romper los pedidos que la referencian)

**solicitud_zona**: id PK · recolector_id FK · zona_actual_id FK null · zona_solicitada_id FK · motivo text null ·
estado (`PENDIENTE` · `APROBADA` · `RECHAZADA` · `CANCELADA`) · creada_en · resuelta_en null · resuelta_por FK usuario null · respuesta text null

## Pedidos, bolsas y recogida (EP-02, EP-03, EP-04)

**pedido** (1 pedido = 1 recogida)
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| codigo | varchar(12) UQ | `P-1001` |
| ciudadano_id | bigint FK usuario | |
| zona_id | bigint FK zona | |
| recolector_id | bigint FK usuario null | el de `zona_dia_recolector` al crear; reasignable |
| franja_id | bigint FK franja null | |
| fecha | date | |
| hora_inicio, hora_fin | time | copia: si cambian la franja, el pedido no cambia (HU-07.01) |
| dir_tipo_via … dir_ciudad, dir_lat, dir_lng | | copia de la dirección al pedir |
| estado | varchar(12) | `PENDIENTE` · `EN_CAMINO` · `COMPLETADA` · `CANCELADA` |
| creado_en, iniciado_en, completado_en, cancelado_en | timestamptz | |
| cancelado_por | bigint FK usuario null | ciudadano o admin |

Índices: (recolector_id, fecha), (ciudadano_id, fecha), (fecha, franja_id, estado) para contar ocupación.

**bolsa**: id PK · pedido_id FK · codigo varchar(8) UQ (`B-7F3K2`) · tipo_envase FK tipo_envase · cantidad smallint ·
capacidad_maxima smallint · resultado null (`ACEPTADA` · `DISCREPANCIA` · `NO_ENCONTRADA`) · envases_validos smallint null · nota text null

**liquidacion** (HU-05.02, idempotente): id PK · pedido_id FK **UQ** · envases_validos · importe_total numeric(10,2) ·
parte_ciudadano numeric(10,2) · parte_empresa numeric(10,2) · co2_kg numeric(10,3) · creada_en

## Incidencias (EP-06)

**incidencia**: id PK · codigo UQ (`INC-2001`) · pedido_id FK · bolsa_id FK null · tipo FK tipo_incidencia · descripcion text ·
estado (`ABIERTA` · `EN_REVISION` · `RESUELTA`) · creada_en · creada_por FK usuario · resolucion text null · resuelta_en null

**incidencia_historial**: id PK · incidencia_id FK · fecha · autor_id FK usuario · accion varchar(120)

## Monedero y pagos (EP-05)

Saldo disponible = Σ `liquidacion.parte_ciudadano` del ciudadano − Σ `retirada.importe` no `FALLIDA`.

**retirada**: id PK · codigo UQ (`R-501`) · ciudadano_id FK · importe numeric(10,2) · iban varchar(34) ·
estado (`PENDIENTE` · `COMPLETADA` · `FALLIDA`) · solicitada_en · procesada_en null · procesada_por FK usuario null ·
referencia_bancaria varchar(30) UQ null (la genera el servidor) · remesa_id FK remesa null · motivo_fallo text null

**remesa**: id PK · codigo UQ (`REM-20261016-094633`) · creada_en · creada_por FK usuario · num_transferencias · total numeric(10,2)

**retirada_historial**: id PK · retirada_id FK · estado · fecha · autor_id FK usuario null

## Catálogos y parámetros

**tipo_envase**: codigo PK (`PET`, `LATA`, `BRIK`, `VIDRIO`, `MEZCLADO`) · nombre · icono · capacidad_maxima_bolsa · kg_co2_por_envase numeric(6,3)

**tipo_incidencia**: codigo PK · nombre

**parametro**: clave PK · valor (p. ej. `importe_por_envase`=0.10, `porcentaje_ciudadano`=0.40, `porcentaje_empresa`=0.60,
`max_bolsas_pedido`=5, `kg_co2_por_km_coche`=0.12, `kg_co2_por_arbol_anio`=21)
