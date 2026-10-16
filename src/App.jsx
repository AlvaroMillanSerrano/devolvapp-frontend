import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireAuth, RoleHomeRedirect } from './auth/ProtectedRoute'
import { ROLES } from './config/roles'
import AppLayout from './layouts/AppLayout'
import { Spinner } from './components/ui/FormField'
import { ForbiddenPage, NotFoundPage } from './pages/errors/ErrorPages'

// Acceso
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const SeleccionPerfilPage = lazy(() => import('./pages/auth/SeleccionPerfilPage'))
const RegistroPage = lazy(() => import('./pages/auth/RegistroPage'))
const RecuperarPasswordPage = lazy(() => import('./pages/auth/RecuperarPasswordPage'))
const RestablecerPasswordPage = lazy(() => import('./pages/auth/RestablecerPasswordPage'))

// Ciudadano
const InicioPage = lazy(() => import('./pages/ciudadano/InicioPage'))
const NuevoPedidoPage = lazy(() => import('./pages/ciudadano/NuevoPedidoPage'))
const PedidosPage = lazy(() => import('./pages/ciudadano/PedidosPage'))
const PedidoDetallePage = lazy(() => import('./pages/ciudadano/PedidoDetallePage'))
const MonederoPage = lazy(() => import('./pages/ciudadano/MonederoPage'))

// Recolector
const RecogidasPage = lazy(() => import('./pages/recolector/RecogidasPage'))
const RecogidaPage = lazy(() => import('./pages/recolector/RecogidaPage'))
const RutaPage = lazy(() => import('./pages/recolector/RutaPage'))
const HistorialRecolectorPage = lazy(() => import('./pages/recolector/HistorialPage'))
const BienvenidaPage = lazy(() => import('./pages/recolector/BienvenidaPage'))
const ZonaPreferencias = lazy(() => import('./pages/recolector/ZonaPreferencias'))

// Comunes
const PerfilPage = lazy(() => import('./pages/comun/PerfilPage'))

// Administración
const ResumenPage = lazy(() => import('./pages/admin/ResumenPage'))
const PendientesPage = lazy(() => import('./pages/admin/PendientesPage'))
const RecogidasAdminPage = lazy(() => import('./pages/admin/RecogidasPage'))
const IncidenciasPage = lazy(() => import('./pages/admin/IncidenciasPage'))
const PagosPage = lazy(() => import('./pages/admin/PagosPage'))
const ZonasPage = lazy(() => import('./pages/admin/ZonasPage'))
const UsuariosPage = lazy(() => import('./pages/admin/UsuariosPage'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-primary">
      <Spinner className="text-[32px]" />
    </div>
  )
}

/**
 * Mapa de rutas. Cada bloque de rol está protegido por <RequireAuth roles=[...]>
 * (solo navegación: la autorización real la hace Spring Security en cada endpoint).
 */
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
          <Route path="/restablecer-password" element={<RestablecerPasswordPage />} />
        </Route>
        <Route path="/seleccionar-perfil" element={<SeleccionPerfilPage />} />

        <Route element={<RequireAuth roles={[ROLES.CIUDADANO]} />}>
          <Route path="/ciudadano" element={<AppLayout role={ROLES.CIUDADANO} />}>
            <Route index element={<InicioPage />} />
            <Route path="nuevo" element={<NuevoPedidoPage />} />
            <Route path="pedidos" element={<PedidosPage />} />
            <Route path="pedidos/:id" element={<PedidoDetallePage />} />
            <Route path="monedero" element={<MonederoPage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={[ROLES.RECOLECTOR]} />}>
          <Route path="/recolector" element={<AppLayout role={ROLES.RECOLECTOR} />}>
            <Route index element={<RecogidasPage />} />
            <Route path="recogidas/:id" element={<RecogidaPage />} />
            <Route path="ruta" element={<RutaPage />} />
            <Route path="historial" element={<HistorialRecolectorPage />} />
            <Route path="bienvenida" element={<BienvenidaPage />} />
            <Route
              path="perfil"
              element={
                <PerfilPage>
                  <ZonaPreferencias />
                </PerfilPage>
              }
            />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={[ROLES.ADMIN]} />}>
          <Route path="/admin" element={<AppLayout role={ROLES.ADMIN} />}>
            <Route index element={<ResumenPage />} />
            <Route path="pendientes" element={<PendientesPage />} />
            <Route path="recogidas" element={<RecogidasAdminPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            <Route path="incidencias" element={<IncidenciasPage />} />
            <Route path="pagos" element={<PagosPage />} />
            <Route path="zonas" element={<ZonasPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
          </Route>
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
