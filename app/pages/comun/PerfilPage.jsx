/**
 * VISTA: Ajustes de mi cuenta (datos personales, dirección y contraseña)
 * Ruta: /ciudadano/perfil · /recolector/perfil · /admin/perfil   Rol: cualquiera
 * HU: HU-01.01 (datos y dirección completa del ciudadano), HU-07.02 (información de usuario actualizada)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Mis datos y dirección ........ GET /api/perfil
 *
 * ACCIONES
 *  [A1] Guardar datos / dirección .... PUT /api/perfil
 *  [A2] Cambiar contraseña ........... PUT /api/perfil/password
 */
import { useState } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useApi, useAction } from '../../hooks/useApi'
import { perfilService } from '../../api/perfilService'
import Async, { Skeleton } from '../../components/ui/Async'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import DireccionFields from '../../components/DireccionFields'
import { useToast } from '../../components/ui/toastContext'
import { normalizeRoles, ROLE_META } from '../../config/roles'
import { direccionAForm, erroresDireccion, limpiarDireccion, validarDireccion } from '../../utils/direccion'
import { isStrongPassword, isValidEmail, isValidPhoneES } from '../../utils/validators'

export default function PerfilPage({ children }) {
  const perfil = useApi(() => perfilService.get(), [])
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="settings" className="text-[28px] text-primary" /> Ajustes
        </h1>
        <p className="text-sm text-on-surface-variant">Aquí puedes cambiar tus datos, tu dirección y tu contraseña.</p>
      </div>
      {children}
      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/perfil */}
      <div data-dyn="Z1 · GET /api/perfil" className="flex flex-col gap-5">
        <Async state={perfil} fallback={<Skeleton className="h-96" />}>
          {(u) => <FormularioPerfil key={u.id} usuario={u} onSaved={perfil.setData} />}
        </Async>
      </div>
      <CambiarPassword />
    </div>
  )
}

function FormularioPerfil({ usuario, onSaved }) {
  const { updateUser } = useAuth()
  const toast = useToast()
  const esCiudadano = normalizeRoles(usuario.roles).includes('CIUDADANO')
  const [datos, setDatos] = useState({ nombre: usuario.nombre, apellidos: usuario.apellidos, email: usuario.email, telefono: usuario.telefono ?? '' })
  const [direccion, setDireccion] = useState(() => direccionAForm(usuario.direccion))
  const [errors, setErrors] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardar, state] = useAction(perfilService.actualizar)
  const set = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!datos.nombre.trim()) v.nombre = 'Obligatorio'
    if (!datos.apellidos.trim()) v.apellidos = 'Obligatorio'
    if (!isValidEmail(datos.email)) v.email = 'Correo no válido'
    if (!isValidPhoneES(datos.telefono)) v.telefono = 'Teléfono no válido'
    const vd = esCiudadano ? validarDireccion(direccion) : {}
    setErrors({ ...v, direccion: vd })
    if (Object.keys(v).length || Object.keys(vd).length) return
    try {
      const res = await guardar({ ...datos, ...(esCiudadano ? { direccion: limpiarDireccion(direccion) } : {}) })
      const { avisoZona, ...usuarioNuevo } = res
      updateUser(usuarioNuevo)
      onSaved(usuarioNuevo)
      setAviso(avisoZona)
      toast('Datos guardados')
    } catch (err) {
      if (err.fieldErrors) setErrors({ ...err.fieldErrors, direccion: erroresDireccion(err.fieldErrors) })
    }
  }

  return (
    // ⚡ ACCIÓN A1 — PUT /api/perfil
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {esCiudadano && (
        <section className="card flex flex-col gap-4 ring-2 ring-primary/20">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <Icon name="home_pin" className="text-primary" /> Dirección de recogida
            </h2>
            <p className="text-sm text-on-surface-variant">
              Es donde pasará el recolector. Revisa bien el número, el piso y la letra.
              {usuario.zona ? ` Ahora estás en la zona ${usuario.zona.nombre}.` : ''}
            </p>
          </div>
          <DireccionFields value={direccion} onChange={setDireccion} errors={errors.direccion} />
          <p className="text-xs text-on-surface-variant flex gap-1">
            <Icon name="info" className="text-[16px] shrink-0" /> Si cambias la dirección, los pedidos que ya tienes programados se recogerán en la anterior.
          </p>
          {aviso && <Alert variant="warning">{aviso} No podrás pedir recogidas hasta que lleguemos a tu código postal.</Alert>}
        </section>
      )}

      <section className="card flex flex-col gap-4">
        <h2 className="font-bold flex items-center gap-2">
          <Icon name="badge" className="text-primary" /> Datos personales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Nombre" value={datos.nombre} onChange={set('nombre')} error={errors.nombre} autoComplete="given-name" />
          <FormField label="Apellidos" value={datos.apellidos} onChange={set('apellidos')} error={errors.apellidos} autoComplete="family-name" />
          <FormField label="Correo electrónico" type="email" value={datos.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <FormField label="Teléfono" type="tel" value={datos.telefono} onChange={set('telefono')} error={errors.telefono} autoComplete="tel" />
          <FormField label="DNI / NIE" value={usuario.dni ?? ''} disabled hint="Para cambiarlo, contacta con soporte" />
          <div className="flex flex-col gap-1">
            <span className="label">Perfiles</span>
            <span className="flex flex-wrap gap-1 pt-2">
              {normalizeRoles(usuario.roles).map((r) => (
                <span key={r} className="h-7 px-3 rounded-full bg-surface-container text-sm font-semibold flex items-center">
                  {ROLE_META[r].label}
                </span>
              ))}
            </span>
          </div>
        </div>
      </section>

      {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
      <button type="submit" className="btn btn-primary btn-lg self-start" disabled={state.loading}>
        {state.loading && <Spinner />} Guardar cambios
      </button>
    </form>
  )
}

function CambiarPassword() {
  const toast = useToast()
  const [form, setForm] = useState({ actual: '', nueva: '', repetir: '' })
  const [errors, setErrors] = useState({})
  const [cambiar, state] = useAction(perfilService.cambiarPassword)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!form.actual) v.actual = 'Obligatorio'
    if (!isStrongPassword(form.nueva)) v.nueva = 'Mínimo 8 caracteres, con letras y números'
    if (form.repetir !== form.nueva) v.repetir = 'No coincide'
    setErrors(v)
    if (Object.keys(v).length) return
    try {
      await cambiar({ actual: form.actual, nueva: form.nueva })
      setForm({ actual: '', nueva: '', repetir: '' })
      toast('Contraseña cambiada')
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
    }
  }

  return (
    // ⚡ ACCIÓN A2 — PUT /api/perfil/password
    <form onSubmit={submit} noValidate className="card flex flex-col gap-4">
      <h2 className="font-bold flex items-center gap-2">
        <Icon name="key" className="text-primary" /> Contraseña
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Actual" type="password" value={form.actual} onChange={set('actual')} error={errors.actual} autoComplete="current-password" />
        <FormField label="Nueva" type="password" value={form.nueva} onChange={set('nueva')} error={errors.nueva} autoComplete="new-password" />
        <FormField label="Repite la nueva" type="password" value={form.repetir} onChange={set('repetir')} error={errors.repetir} autoComplete="new-password" />
      </div>
      {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
      <button type="submit" className="btn btn-secondary self-start" disabled={state.loading}>
        {state.loading && <Spinner />} Cambiar contraseña
      </button>
    </form>
  )
}
