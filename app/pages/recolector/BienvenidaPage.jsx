/**
 * VISTA: Bienvenida del recolector (primer inicio de sesión)
 * Ruta: /recolector/bienvenida   Rol: RECOLECTOR (si aún no tiene zona preferida o tiene contraseña provisional)
 * Pasos: 1) crear su contraseña (solo si la cuenta la creó administración) · 2) elegir zona preferida
 * HU: HU-07.06 (asignación por zona)
 *
 * ZONAS DINÁMICAS
 *  [Z1] Zonas disponibles con sus CP ..... GET /api/recolector/preferencias → zonas
 *  [Z2] Barrios de cada CP ............... GET /api/catalogo/codigos-postales
 *
 * ACCIONES
 *  [A1] Crear su contraseña ............. PUT /api/perfil/password-inicial (sustituye a la provisional)
 *  [A2] Guardar zona preferida ........... PUT /api/recolector/preferencias/zona (solo la primera vez)
 */
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useApi, useAction } from '../../hooks/useApi'
import { recolectorService } from '../../api/recolectorService'
import { configService } from '../../api/configService'
import { perfilService } from '../../api/perfilService'
import Async, { Skeleton } from '../../components/ui/Async'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import { isStrongPassword } from '../../utils/validators'
import Icon from '../../components/ui/Icon'

export default function BienvenidaPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const prefs = useApi(() => recolectorService.getPreferencias(), [])
  const cps = useApi(() => configService.getCodigosPostales(), [])
  const [zonaId, setZonaId] = useState(null)
  const [guardar, state] = useAction(recolectorService.elegirZonaInicial)

  if (user?.zonaPreferida && !user?.debeCambiarPassword) return <Navigate to="/recolector" replace />
  if (user?.debeCambiarPassword) return <CrearPassword nombre={user.nombre} pasoFinal={Boolean(user.zonaPreferida)} />

  const barrio = (cp) => cps.data?.find((c) => c.cp === cp)?.barrio

  const confirmar = async () => {
    try {
      await guardar(zonaId)
      await refreshUser()
      navigate('/recolector', { replace: true })
    } catch {
      /* error debajo */
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto">
      <div className="text-center flex flex-col items-center gap-2 pt-2">
        <span className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="waving_hand" className="text-[34px] text-primary" />
        </span>
        <h1 className="text-2xl font-bold">¡Bienvenido/a, {user?.nombre}!</h1>
        <p className="text-xs font-semibold text-primary">Paso 2 de 2</p>
        <p className="text-on-surface-variant">¿En qué zona de Málaga prefieres recoger? Administración la tendrá en cuenta al asignarte los días.</p>
      </div>

      {/* ⚡ ZONA DINÁMICA Z1 / Z2 — GET /api/recolector/preferencias · GET /api/catalogo/codigos-postales */}
      <div data-dyn="Z1 · GET /recolector/preferencias" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Async state={prefs} fallback={<Skeleton className="h-64 sm:col-span-2" />}>
          {(p) =>
            p.zonas.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setZonaId(z.id)}
                className={`card text-left flex flex-col gap-2 border-2 transition-colors ${zonaId === z.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-surface-container-low'}`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-bold">{z.nombre}</span>
                  <Icon name={zonaId === z.id ? 'radio_button_checked' : 'radio_button_unchecked'} className={zonaId === z.id ? 'text-primary' : 'text-outline'} />
                </span>
                <span className="text-sm text-on-surface-variant">
                  {z.codigosPostales.map((cp) => `${cp}${barrio(cp) ? ` ${barrio(cp)}` : ''}`).join(' · ')}
                </span>
              </button>
            ))
          }
        </Async>
      </div>

      {state.error && <Alert>{state.error.message}</Alert>}
      {/* ⚡ ACCIÓN A2 — PUT /api/recolector/preferencias/zona */}
      <button type="button" className="btn btn-primary btn-lg self-center" disabled={!zonaId || state.loading} onClick={confirmar}>
        {state.loading && <Spinner />} Guardar y empezar
      </button>
      <p className="text-xs text-center text-on-surface-variant">Más adelante podrás pedir un cambio de zona desde «Ajustes» (el engranaje de arriba).</p>
    </div>
  )
}

/** Paso 1: la cuenta tiene una contraseña provisional dada por administración */
function CrearPassword({ nombre, pasoFinal }) {
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nueva: '', repetir: '' })
  const [errors, setErrors] = useState({})
  const [crear, state] = useAction(perfilService.crearPasswordInicial)

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!isStrongPassword(form.nueva)) v.nueva = 'Mínimo 8 caracteres, con letras y números'
    if (form.repetir !== form.nueva) v.repetir = 'No coincide'
    setErrors(v)
    if (Object.keys(v).length) return
    try {
      updateUser(await crear(form.nueva))
      if (pasoFinal) navigate('/recolector', { replace: true })
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors)
    }
  }

  return (
    // ⚡ ACCIÓN A1 — PUT /api/perfil/password-inicial
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 max-w-md mx-auto w-full">
      <div className="text-center flex flex-col items-center gap-2 pt-2">
        <span className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon name="key" className="text-[34px] text-primary" />
        </span>
        <h1 className="text-2xl font-bold">¡Hola, {nombre}!</h1>
        {!pasoFinal && <p className="text-xs font-semibold text-primary">Paso 1 de 2</p>}
        <p className="text-on-surface-variant">Has entrado con una contraseña provisional. Crea la tuya para seguir.</p>
      </div>
      <div className="card flex flex-col gap-3">
        <FormField label="Nueva contraseña" type="password" autoComplete="new-password" value={form.nueva} onChange={(e) => setForm((f) => ({ ...f, nueva: e.target.value }))} error={errors.nueva} hint="Mínimo 8 caracteres, con letras y números" />
        <FormField label="Repite la contraseña" type="password" autoComplete="new-password" value={form.repetir} onChange={(e) => setForm((f) => ({ ...f, repetir: e.target.value }))} error={errors.repetir} />
        {state.error && !state.error.fieldErrors && <Alert>{state.error.message}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={state.loading}>
          {state.loading && <Spinner />} {pasoFinal ? 'Guardar y entrar' : 'Continuar'}
        </button>
      </div>
    </form>
  )
}
