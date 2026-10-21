/**
 * VISTA: Usuarios
 * Ruta: /admin/usuarios   Rol: ADMIN
 * HU: HU-07.02 (consultar cuentas por rol, ver su estado, suspender), HU-01.03 (roles)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Lista de usuarios (búsqueda y filtro por rol) ... GET /api/admin/usuarios?q=&rol=&page=
 *  [Z2] Ficha del usuario ............................... GET /api/admin/usuarios/{id}
 *
 * ACCIONES
 *  [A0] Editar datos y dirección ........................ PUT  /api/admin/usuarios/{id}
 *  [A1] Suspender cuenta ................................ POST /api/admin/usuarios/{id}/suspender
 *  [A2] Reactivar cuenta ................................ POST /api/admin/usuarios/{id}/reactivar
 *  [A3] Dar de alta un recolector ....................... POST /api/admin/recolectores (devuelve su contraseña provisional)
 *  [A4] Generar contraseña provisional .................. POST /api/admin/usuarios/{id}/password-provisional
 *  [A5] Modificar roles .................................. PUT /api/admin/usuarios/{id}/roles
 */
import { useEffect, useState } from 'react'
import { useApi, useAction } from '../../hooks/useApi'
import { adminService } from '../../api/adminService'
import Async, { EmptyState, Skeleton } from '../../components/ui/Async'
import Estado from '../../components/ui/Estado'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import Modal from '../../components/ui/Modal'
import Paginacion from '../../components/ui/Paginacion'
import { useToast } from '../../components/ui/toastContext'
import { ROLE_META } from '../../config/roles'
import { formatCo2, formatDate, formatDireccion } from '../../utils/format'
import DireccionFields from '../../components/DireccionFields'
import { direccionAForm, erroresDireccion, limpiarDireccion, validarDireccion } from '../../utils/direccion'
import { isValidDniNie, isValidEmail, isValidPhoneES } from '../../utils/validators'
import { combinarUsuario, usuarioAForm } from '../../utils/usuario'

const ROLES_FILTRO = [
  ['', 'Todos'],
  ['CIUDADANO', 'Ciudadanos'],
  ['RECOLECTOR', 'Recolectores'],
  ['ADMIN', 'Administración'],
]

export default function UsuariosPage() {
  const [q, setQ] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState('')
  const [page, setPage] = useState(0)
  const lista = useApi(() => adminService.getUsuarios({ q: busqueda || undefined, rol: rol || undefined, page, size: 10 }), [busqueda, rol, page])
  const [abierto, setAbierto] = useState(null)
  const [alta, setAlta] = useState(false)

  // Búsqueda con un pequeño retardo para no pedir en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(q.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAlta(true)}>
          <Icon name="person_add" className="text-[18px]" /> Recolector
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline" />
          <input className="input !pl-10" placeholder="Buscar por nombre, correo o DNI" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {ROLES_FILTRO.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip ${rol === value ? 'chip-active' : ''}`}
              onClick={() => {
                setRol(value)
                setPage(0)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ⚡ ZONA DINÁMICA Z1 — GET /api/admin/usuarios */}
      <div data-dyn="Z1 · GET /admin/usuarios" className="card !p-0 overflow-hidden">
        <Async state={lista} fallback={<Skeleton className="h-72" />}>
          {(p) =>
            p.content.length ? (
              <>
                {p.content.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setAbierto(u.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-container-low border-b border-surface-container last:border-0"
                  >
                    <span className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-bold text-primary shrink-0">
                      {u.nombre.charAt(0)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{u.nombre}</span>
                      <span className="block text-sm text-on-surface-variant truncate">{u.email}</span>
                    </span>
                    <span className="hidden sm:flex gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="h-6 px-2 rounded-full bg-surface-container text-xs font-semibold flex items-center">
                          {ROLE_META[r]?.label ?? r}
                        </span>
                      ))}
                    </span>
                    {u.estado === 'SUSPENDIDA' && <Estado estado="SUSPENDIDA" />}
                  </button>
                ))}
                <Paginacion page={p} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon="person_search" title="Ningún usuario coincide" className="!rounded-none" />
            )
          }
        </Async>
      </div>

      {abierto && <FichaUsuario id={abierto} onClose={() => setAbierto(null)} onChanged={lista.reload} />}
      <AltaRecolectorModal
        open={alta}
        onClose={() => setAlta(false)}
        onDone={() => {
          setAlta(false)
          lista.reload()
        }}
      />
    </div>
  )
}

function FichaUsuario({ id, onClose, onChanged }) {
  const toast = useToast()
  const usuario = useApi(() => adminService.getUsuario(id), [id])
  const [confirmar, setConfirmar] = useState(false)
  const [editando, setEditando] = useState(false)
  const [editandoRoles, setEditandoRoles] = useState(false)
  const [credenciales, setCredenciales] = useState(null)
  const [restablecer, restablecerState] = useAction(adminService.restablecerPassword)
  const [cambiar, state] = useAction((u) => (u.estado === 'ACTIVA' ? adminService.suspenderUsuario(u.id) : adminService.reactivarUsuario(u.id)))

  const handle = async () => {
    try {
      const u = await cambiar(usuario.data)
      usuario.setData(u)
      setConfirmar(false)
      toast(u.estado === 'SUSPENDIDA' ? 'Cuenta suspendida' : 'Cuenta reactivada')
      onChanged()
    } catch {
      /* error debajo */
    }
  }

  return (
    <Modal open onClose={onClose} title="Usuario" panelClassName="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl p-5 shadow-xl max-h-[92vh] overflow-y-auto">
      {/* ⚡ ZONA DINÁMICA Z2 — GET /api/admin/usuarios/{id} */}
      <div data-dyn="Z2 · GET /admin/usuarios/{id}">
        <Async state={usuario} fallback={<Skeleton className="h-64" />}>
          {(u) =>
            credenciales ? (
              <Credenciales titulo="Nueva contraseña provisional" email={credenciales.email} password={credenciales.passwordProvisional} onCerrar={() => setCredenciales(null)} />
            ) : editando ? (
              <EditarUsuario
                u={u}
                onCancel={() => setEditando(false)}
                onSaved={(nuevo) => {
                  usuario.setData((actual) => combinarUsuario(actual, nuevo))
                  toast('Datos actualizados')
                  onChanged()
                }}
              />
            ) : editandoRoles ? (
              <EditarRoles
                u={u}
                onCancel={() => setEditandoRoles(false)}
                onSaved={(nuevo) => {
                  usuario.setData(nuevo)
                  setEditandoRoles(false)
                  toast('Roles actualizados')
                  onChanged()
                }}
              />
            ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">{u.nombre}</p>
                  <p className="text-sm text-on-surface-variant">{u.roles.map((r) => ROLE_META[r]?.label ?? r).join(' · ')}</p>
                </div>
                <Estado estado={u.estado} />
              </div>
              <dl className="flex flex-col gap-2 text-sm">
                <Fila label="Correo" value={u.email} />
                <Fila label="Teléfono" value={u.telefono} />
                <Fila label="DNI/NIE" value={u.dni} />
                {u.direccion && <Fila label="Dirección" value={formatDireccion(u.direccion)} />}
                {u.zona && <Fila label="Zona" value={u.zona} />}
                {u.roles.includes('CIUDADANO') && <Fila label="Pedidos" value={u.pedidos} />}
                {u.roles.includes('RECOLECTOR') && <Fila label="Zona preferida" value={u.zonaPreferida ?? 'Sin elegir (primer inicio)'} />}
                {u.roles.includes('RECOLECTOR') && <Fila label="Zonas que recoge" value={u.zonasAsignadas.join(', ') || 'Ninguna'} />}
                {u.co2EvitadoKg != null && <Fila label="CO₂ evitado" value={<strong className="text-primary">{formatCo2(u.co2EvitadoKg)}</strong>} />}
                <Fila label="Alta" value={formatDate(u.altaEn)} />
              </dl>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setEditando(true)}>
                  <Icon name="edit" className="text-[18px]" /> Editar datos{u.direccion ? ' y dirección' : ''}
                </button>
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setEditandoRoles(true)}>
                  <Icon name="admin_panel_settings" className="text-[18px]" /> Modificar roles
                </button>
                {/* ⚡ ACCIÓN A4 — POST /api/admin/usuarios/{id}/password-provisional */}
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  disabled={restablecerState.loading}
                  onClick={async () => {
                    try {
                      setCredenciales(await restablecer(u.id))
                    } catch {
                      /* error debajo */
                    }
                  }}
                >
                  {restablecerState.loading ? <Spinner /> : <Icon name="key" className="text-[18px]" />} Contraseña provisional
                </button>
              </div>
              {restablecerState.error && <Alert>{restablecerState.error.message}</Alert>}

              {confirmar ? (
                <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col gap-3">
                  <p className="text-sm">
                    {u.estado === 'ACTIVA'
                      ? `${u.nombre.split(' ')[0]} no podrá iniciar sesión mientras la cuenta esté suspendida.`
                      : `${u.nombre.split(' ')[0]} podrá volver a iniciar sesión.`}
                  </p>
                  {state.error && <Alert>{state.error.message}</Alert>}
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary flex-1" onClick={() => setConfirmar(false)}>
                      Volver
                    </button>
                    <button type="button" className={`btn flex-1 ${u.estado === 'ACTIVA' ? 'btn-danger' : 'btn-primary'}`} disabled={state.loading} onClick={handle}>
                      {state.loading && <Spinner />} Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                // ⚡ ACCIONES A1 / A2 — POST /api/admin/usuarios/{id}/suspender | /reactivar
                <button type="button" className={`btn ${u.estado === 'ACTIVA' ? 'btn-danger' : 'btn-primary'}`} onClick={() => setConfirmar(true)}>
                  <Icon name={u.estado === 'ACTIVA' ? 'block' : 'check_circle'} className="text-[18px]" />
                  {u.estado === 'ACTIVA' ? 'Suspender cuenta' : 'Reactivar cuenta'}
                </button>
              )}
            </div>
            )
          }
        </Async>
      </div>
    </Modal>
  )
}

/** Edición de un usuario por administración (HU-07.02) */
function EditarUsuario({ u, onCancel, onSaved }) {
  const [datos, setDatos] = useState(() => usuarioAForm(u))
  const [direccion, setDireccion] = useState(() => direccionAForm(u.direccion))
  const [errors, setErrors] = useState({})
  const [guardar, state] = useAction(adminService.editarUsuario)
  const set = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const vd = u.direccion ? validarDireccion(direccion) : {}
    setErrors({ direccion: vd })
    if (Object.keys(vd).length) return
    try {
      const actualizado = await guardar(u.id, { ...datos, ...(u.direccion ? { direccion: limpiarDireccion(direccion) } : {}) })
      setDatos(usuarioAForm(actualizado, datos))
      if (u.direccion || actualizado?.direccion) {
        setDireccion(direccionAForm({ ...direccion, ...actualizado?.direccion }))
      }
      setErrors({})
      onSaved(actualizado)
    } catch (err) {
      if (err.fieldErrors) setErrors({ ...err.fieldErrors, direccion: erroresDireccion(err.fieldErrors) })
    }
  }

  return (
    // ⚡ ACCIÓN A0 — PUT /api/admin/usuarios/{id}
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nombre" value={datos.nombre} onChange={set('nombre')} error={errors.nombre} />
        <FormField label="Apellidos" value={datos.apellidos} onChange={set('apellidos')} error={errors.apellidos} />
        <FormField label="Correo" value={datos.email} onChange={set('email')} error={errors.email} />
        <FormField label="Teléfono" value={datos.telefono} onChange={set('telefono')} error={errors.telefono} />
      </div>
      {u.direccion && (
        <>
          <p className="label">Dirección de recogida</p>
          <DireccionFields value={direccion} onChange={setDireccion} errors={errors.direccion} />
        </>
      )}
      {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={state.loading}>
          {state.loading && <Spinner />} Guardar
        </button>
      </div>
    </form>
  )
}

function EditarRoles({ u, onCancel, onSaved }) {
  const [roles, setRoles] = useState(u.roles)
  const [guardar, state] = useAction(adminService.actualizarRoles)
  const alternar = (role) => setRoles((actuales) =>
    actuales.includes(role) ? actuales.filter((r) => r !== role) : [...actuales, role],
  )

  const submit = async (e) => {
    e.preventDefault()
    try {
      onSaved(await guardar(u.id, roles))
    } catch {
      /* error debajo */
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="label mb-2">Roles de la cuenta</legend>
        {Object.entries(ROLE_META).map(([role, meta]) => (
          <label key={role} className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
            <input type="checkbox" checked={roles.includes(role)} onChange={() => alternar(role)} />
            <span className="flex-1">
              <span className="block font-semibold">{meta.label}</span>
              <span className="block text-sm text-on-surface-variant">{meta.descripcion}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-on-surface-variant">
        Los permisos del servidor cambian al guardar. Si esta cuenta tiene una sesión abierta, puede necesitar recargarla para actualizar sus menús.
      </p>
      {state.error && <Alert>{state.error.message}</Alert>}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={state.loading || roles.length === 0}>
          {state.loading && <Spinner />} Guardar roles
        </button>
      </div>
    </form>
  )
}

const Fila = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-on-surface-variant shrink-0">{label}</dt>
    <dd className="text-right">{value}</dd>
  </div>
)

const VACIO = { nombre: '', apellidos: '', email: '', telefono: '', dni: '' }

function AltaRecolectorModal({ open, onClose, onDone }) {
  const toast = useToast()
  const [form, setForm] = useState(VACIO)
  const [errors, setErrors] = useState({})
  const [crear, state] = useAction(adminService.crearRecolector)
  const [creado, setCreado] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!form.nombre.trim()) v.nombre = 'Obligatorio'
    if (!form.apellidos.trim()) v.apellidos = 'Obligatorio'
    if (!isValidEmail(form.email)) v.email = 'Correo no válido'
    if (!isValidPhoneES(form.telefono)) v.telefono = 'Teléfono no válido'
    if (!isValidDniNie(form.dni)) v.dni = 'DNI/NIE no válido'
    setErrors(v)
    if (Object.keys(v).length) return
    try {
      setCreado(await crear(form))
      toast('Recolector dado de alta')
      setForm(VACIO)
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (creado) onDone()
        else onClose()
        setCreado(null)
      }}
      title="Alta de recolector"
    >
      {creado ? (
        <Credenciales
          titulo={`${creado.nombre} ya tiene cuenta`}
          email={creado.email}
          password={creado.passwordProvisional}
          onCerrar={() => {
            setCreado(null)
            onDone()
          }}
        />
      ) : (
      /* ⚡ ACCIÓN A3 — POST /api/admin/recolectores */
      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombre" value={form.nombre} onChange={set('nombre')} error={errors.nombre} />
          <FormField label="Apellidos" value={form.apellidos} onChange={set('apellidos')} error={errors.apellidos} />
        </div>
        <FormField label="Correo" type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Teléfono" inputMode="tel" value={form.telefono} onChange={set('telefono')} error={errors.telefono} />
          <FormField label="DNI/NIE" value={form.dni} onChange={set('dni')} error={errors.dni} />
        </div>
        {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
        <p className="text-xs text-on-surface-variant">Se le creará una contraseña provisional. Al entrar elegirá su contraseña y su zona preferida.</p>
        <button type="submit" className="btn btn-primary btn-lg" disabled={state.loading}>
          {state.loading && <Spinner />} Dar de alta
        </button>
      </form>
      )}
    </Modal>
  )
}

/** Datos de acceso para entregar al usuario (la contraseña provisional solo se muestra aquí) */
function Credenciales({ titulo, email, password, onCerrar }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`Usuario: ${email}\nContraseña provisional: ${password}`)
      setCopiado(true)
    } catch {
      /* el navegador no deja copiar: se copia a mano */
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="font-semibold flex items-center gap-2">
        <Icon name="check_circle" className="text-primary" /> {titulo}
      </p>
      <div className="rounded-2xl bg-surface-container-low p-4 flex flex-col gap-2 text-sm">
        <p>
          Usuario: <strong className="font-mono">{email}</strong>
        </p>
        <p>
          Contraseña provisional: <strong className="font-mono text-lg">{password}</strong>
        </p>
      </div>
      <Alert variant="warning">Apúntala o cópiala ahora: no se vuelve a mostrar. Al entrar tendrá que crear su propia contraseña.</Alert>
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" onClick={copiar}>
          <Icon name={copiado ? 'check' : 'content_copy'} className="text-[18px]" /> {copiado ? 'Copiado' : 'Copiar'}
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={onCerrar}>
          Hecho
        </button>
      </div>
    </div>
  )
}
