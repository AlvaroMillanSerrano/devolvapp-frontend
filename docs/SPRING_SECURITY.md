# Login multirol con Spring Security — contrato front ↔ back

Este documento describe cómo está construido el acceso en el front (React) y qué tiene que exponer el
backend (Spring Boot 3 / Spring Security 6) para que funcione sin tocar el front.

- Front: `src/auth/*`, `src/api/client.js`, `src/api/authService.js`, `src/pages/auth/*`
- Historias: HU-01.01 (registro), HU-01.02 (login), HU-01.03 (roles), HU-01.04 (recuperación), HU-07.02 (suspensión)

---

## 1. Modelo de roles

| Rol (front) | Authority (Spring) | Home en el front | Cómo se obtiene |
|---|---|---|---|
| `CIUDADANO` | `ROLE_CIUDADANO` | `/ciudadano` | Registro público (`POST /api/auth/registro`) |
| `RECOLECTOR` | `ROLE_RECOLECTOR` | `/recolector` | Alta por un admin (`POST /api/admin/recolectores`) |
| `ADMIN` | `ROLE_ADMIN` | `/admin` | Alta por un admin |

Un usuario puede tener **varios roles a la vez** (p. ej. un recolector que también es ciudadano,
o un admin que también recoge). En esta versión los roles extra se asignan en base de datos: la pantalla
`/admin/usuarios` solo da de alta recolectores y suspende/reactiva cuentas (HU-07.02).

### Rol activo (solo interfaz)

```
POST /auth/login ──► roles del usuario
        │
        ├─ 1 rol ...................................► entra directamente en su home
        ├─ varios roles + último rol usado guardado ► entra en la home de ese rol
        └─ varios roles sin preferencia ............► /seleccionar-perfil (tarjetas por rol)

En cualquier pantalla: selector de perfil en la cabecera (RoleSwitcher) → cambia de layout sin re-login.
Si un multirol navega a /admin teniendo activo CIUDADANO, el front activa ADMIN automáticamente.
Si NO tiene el rol → /403.
```

> ⚠ **El rol activo es solo una decisión de interfaz.** El token lleva **todas** las authorities y el
> backend autoriza cada endpoint por sí mismo (HU-01.03: "rechazar la operación independientemente de lo que
> muestre la interfaz"). No se envía ninguna cabecera de "rol activo".

---

## 2. Endpoints de autenticación

### `POST /api/auth/login` (público)

```jsonc
// request — username admite email o DNI/NIE
{ "username": "multirol@devolvup.es", "password": "••••••••" }

// 200
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9…",   // JWT, ~15 min
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9…",  // opaco o JWT, ~7-30 días, revocable
  "tokenType": "Bearer",
  "expiresIn": 900,
  "usuario": {
    "id": 7,
    "nombre": "Laura",
    "apellidos": "Martín Soria",
    "email": "multirol@devolvup.es",
    "telefono": "622330007",
    "avatarUrl": null,
    "roles": ["ROLE_CIUDADANO", "ROLE_RECOLECTOR", "ROLE_ADMIN"],
    "codigoRecolector": "R-007",                  // solo si es recolector
    "direccion": {                                 // solo si es ciudadano
      "calle": "Calle Lagasca", "numero": "15", "bloque": null, "planta": "2º", "letra": "A",
      "codigoPostal": "28001", "ciudad": "Madrid", "barrio": "Barrio de Salamanca",
      "verificada": true, "notaAcceso": "Portería física disponible"
    },
    "zona": { "id": 1, "nombre": "Madrid Centro", "codigoPostal": "28001" }
  }
}
```

| Caso | HTTP | `code` | Qué muestra el front |
|---|---|---|---|
| Usuario o contraseña incorrectos | 401 | `BAD_CREDENTIALS` | Mensaje **genérico** (no revela si el correo existe) |
| Cuenta suspendida (HU-07.02) | 403 | `ACCOUNT_SUSPENDED` | "Tu cuenta está suspendida…" |
| Demasiados intentos | 429 | `TOO_MANY_ATTEMPTS` | "Espera unos minutos…" |

### Resto

| Endpoint | Acceso | Notas |
|---|---|---|
| `POST /api/auth/refresh` `{ refreshToken }` | público | Devuelve `{ accessToken, refreshToken? }`. El cliente lo llama solo, una vez, al recibir un 401 (`src/api/client.js`). Rotar el refresh token y revocar el anterior. |
| `POST /api/auth/logout` `{ refreshToken }` | autenticado | Revoca el refresh token. |
| `GET /api/auth/me` | autenticado | Mismo objeto `usuario` del login (para refrescar roles/dirección). |
| `POST /api/auth/registro` | público | Crea SIEMPRE `ROLE_CIUDADANO`. 400 `VALIDATION_ERROR` / 409 `DUPLICATE_*` con `fieldErrors` (`email`, `telefono`, `dni`, `direccion.calle`…). |
| `POST /api/auth/password/recuperar` `{ email }` | público | **Siempre 202**, exista o no el correo. Envía enlace `https://<front>/restablecer-password?token=…` |
| `GET /api/auth/password/token/{token}` | público | 200 `{ valido, email (enmascarado), expiraEn }` · 410 `TOKEN_EXPIRED` / `TOKEN_USED` |
| `POST /api/auth/password/restablecer` `{ token, password }` | público | Token de un solo uso; invalida además los refresh tokens del usuario. |

### Formato de error común

```json
{ "status": 400, "code": "VALIDATION_ERROR", "message": "Datos no válidos", "fieldErrors": { "dni": "Formato de DNI/NIE no válido" } }
```

---

## 3. Reglas de autorización por ruta

| Patrón | Regla |
|---|---|
| `/api/auth/login`, `/api/auth/refresh`, `/api/auth/registro`, `/api/auth/password/**` | `permitAll()` |
| `/api/auth/me`, `/api/auth/logout`, `/api/perfil/**`, `/api/config/**`, `/api/catalogo/**` | `authenticated()` |
| `/api/ciudadano/**` | `hasRole("CIUDADANO")` |
| `/api/recolector/**` | `hasRole("RECOLECTOR")` |
| `/api/admin/**` | `hasRole("ADMIN")` |
| resto | `denyAll()` |

Además, **autorización por propiedad** (HU-04.01: un recolector no ve recogidas de otro; un ciudadano solo
las suyas): los servicios filtran siempre por el usuario del token (`@AuthenticationPrincipal`) y devuelven
404/403 si el recurso no le pertenece. Ningún endpoint de rol recibe el id del usuario.

---

## 4. Esqueleto de configuración (Spring Boot 3)

```java
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthFilter jwtAuthFilter;
  private final RestAuthEntryPoint authEntryPoint;      // 401 con el JSON de error común
  private final RestAccessDeniedHandler accessDenied;   // 403 con el JSON de error común

  @Bean
  SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http
      .csrf(AbstractHttpConfigurer::disable)            // API stateless con Bearer token
      .cors(Customizer.withDefaults())
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .exceptionHandling(e -> e.authenticationEntryPoint(authEntryPoint).accessDeniedHandler(accessDenied))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/refresh", "/api/auth/registro").permitAll()
        .requestMatchers("/api/auth/password/**").permitAll()
        .requestMatchers("/api/auth/me", "/api/auth/logout", "/api/perfil/**", "/api/config/**", "/api/catalogo/**").authenticated()
        .requestMatchers("/api/ciudadano/**").hasRole("CIUDADANO")
        .requestMatchers("/api/recolector/**").hasRole("RECOLECTOR")
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .anyRequest().denyAll())
      .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
      .build();
  }

  @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

  @Bean
  AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
    return cfg.getAuthenticationManager();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(@Value("${app.front-url}") String front) {
    var cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(List.of(front));               // en desarrollo no hace falta: Vite hace de proxy de /api
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    cfg.setExposedHeaders(List.of("Content-Disposition")); // nombres de ficheros descargados
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cfg);
    return source;
  }
}
```

### Usuario con varios roles

```java
@Entity
public class Usuario {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  private String nombre, apellidos, telefono, dni, password;
  @Column(unique = true) private String email;
  @Enumerated(EnumType.STRING) private EstadoCuenta estado;          // ACTIVA | SUSPENDIDA
  private String motivoSuspension;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "usuario_rol", joinColumns = @JoinColumn(name = "usuario_id"))
  @Enumerated(EnumType.STRING) @Column(name = "rol")
  private Set<Rol> roles = EnumSet.noneOf(Rol.class);                 // CIUDADANO, RECOLECTOR, ADMIN
}

public record UsuarioPrincipal(Usuario u) implements UserDetails {
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return u.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();
  }
  public String getUsername() { return u.getEmail(); }
  public String getPassword() { return u.getPassword(); }
  public boolean isEnabled() { return u.getEstado() == EstadoCuenta.ACTIVA; }  // suspendida → DisabledException
}

@Service @RequiredArgsConstructor
public class UsuarioDetailsService implements UserDetailsService {
  private final UsuarioRepository repo;
  public UserDetails loadUserByUsername(String username) {           // email o DNI/NIE
    return repo.findByEmailIgnoreCaseOrDniIgnoreCase(username, username)
      .map(UsuarioPrincipal::new)
      .orElseThrow(() -> new UsernameNotFoundException("BAD_CREDENTIALS"));
  }
}
```

> Ojo con la tabla del PRD: `usuario.rol VARCHAR` admite **un solo rol**. Para multirol hace falta la tabla
> `usuario_rol (usuario_id, rol)` como arriba (o una `ManyToMany` con una entidad `Rol`).

### Login, refresh y errores

```java
@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
  private final AuthenticationManager authManager;
  private final JwtService jwt;
  private final RefreshTokenService refreshTokens;
  private final LoginAttemptService attempts;                       // 429 tras N fallos por IP/usuario

  @PostMapping("/login")
  public LoginResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest http) {
    attempts.checkNotBlocked(req.username(), http.getRemoteAddr()); // lanza TooManyAttemptsException
    try {
      var auth = authManager.authenticate(new UsernamePasswordAuthenticationToken(req.username(), req.password()));
      var user = ((UsuarioPrincipal) auth.getPrincipal()).u();
      attempts.reset(req.username());
      return new LoginResponse(jwt.accessToken(user), refreshTokens.issue(user), "Bearer", jwt.ttlSeconds(), UsuarioDto.from(user));
    } catch (BadCredentialsException | UsernameNotFoundException e) {
      attempts.fail(req.username(), http.getRemoteAddr());
      throw new ApiException(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Credenciales incorrectas.");
    } catch (DisabledException e) {
      throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "Tu cuenta está suspendida.");
    }
  }

  @PostMapping("/refresh")
  public TokenPair refresh(@RequestBody RefreshRequest req) {        // rota y revoca el anterior
    var user = refreshTokens.consume(req.refreshToken());             // 401 si caducado/revocado/usuario suspendido
    return new TokenPair(jwt.accessToken(user), refreshTokens.issue(user));
  }
}
```

- **JWT**: `sub` = id de usuario, claim `roles` = `["ROLE_CIUDADANO", …]`, `exp` corto (≈15 min). El `JwtAuthFilter`
  valida firma/expiración y crea el `Authentication` con esas authorities.
- **Suspensión (HU-07.02)**: al suspender, revocar todos los refresh tokens del usuario; el access token muere
  en ≤15 min (o comprobar `estado` en el filtro si se quiere corte inmediato).
- **Cambio de roles**: entra en vigor en el siguiente refresh/login (el front lo avisa en `/admin/usuarios`).
- **Recuperación (HU-01.04)**: guardar solo el **hash** del token, con `expiraEn` (p. ej. 30 min) y `usadoEn`.
- **`@RestControllerAdvice`**: traducir `ApiException`, `MethodArgumentNotValidException` (→ `fieldErrors`) y
  `DataIntegrityViolationException` de email/teléfono/DNI duplicados (→ 409 `DUPLICATE_*`) al formato común.

---

## 5. Dónde guarda el front la sesión

`src/auth/tokenStorage.js`: `localStorage` si el usuario marca "Mantener sesión iniciada", `sessionStorage` si no.
Si preferís **refresh token en cookie `httpOnly` + `SameSite=Strict`** (más seguro frente a XSS), basta con:

1. Que `/auth/login` y `/auth/refresh` devuelvan el refresh token como cookie (no en el JSON).
2. En `src/api/client.js`, `withCredentials: true` en la llamada a `/auth/refresh` y no enviar `refreshToken` en el body.

El resto del front (guardas, multirol, interceptores) no cambia.
