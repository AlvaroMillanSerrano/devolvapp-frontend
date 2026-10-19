/**
 * VISTA: Registro de ciudadano
 * Ruta: /registro   Acceso: público
 * HU: HU-01.01
 *
 * ACCIONES CONTRA EL SERVIDOR
 *  [A1] Crear cuenta ... POST /api/auth/registro
 *       body: { nombre, apellidos, dni, telefono, email, password,
 *               direccion: { tipoVia, nombreVia, numero, piso, letra, codigoPostal, ciudad }, aceptaPrivacidad }
 *       201 → cuenta creada con ROLE_CIUDADANO
 *       400 VALIDATION_ERROR (fieldErrors) · 409 DUPLICATE_* (email / teléfono / DNI ya registrados)
 *
 * Las validaciones de cliente (DNI/NIE con letra de control, email, teléfono, CP, campos
 * obligatorios de dirección) son solo UX: Spring debe repetirlas.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { authService } from '../../api/authService'
import { Alert, FormField, Spinner } from '../../components/ui/FormField'
import Icon from '../../components/ui/Icon'
import { isStrongPassword, isValidDniNie, isValidEmail, isValidPhoneES } from '../../utils/validators'
import DireccionFields from '../../components/DireccionFields'
import { DIRECCION_VACIA, erroresDireccion, limpiarDireccion, validarDireccion } from '../../utils/direccion'

const INITIAL = {
  nombre: '',
  apellidos: '',
  dni: '',
  telefono: '',
  email: '',
  password: '',
  password2: '',
  aceptaPrivacidad: false,
}

function validate(f) {
  const e = {}
  if (!f.nombre.trim()) e.nombre = 'Obligatorio'
  if (!f.apellidos.trim()) e.apellidos = 'Obligatorio'
  if (!isValidDniNie(f.dni)) e.dni = 'DNI/NIE con formato no válido (revisa la letra)'
  if (!isValidPhoneES(f.telefono)) e.telefono = 'Teléfono no válido (9 dígitos)'
  if (!isValidEmail(f.email)) e.email = 'Correo electrónico no válido'
  if (!isStrongPassword(f.password)) e.password = 'Mínimo 8 caracteres, con letras y números'
  if (f.password2 !== f.password) e.password2 = 'Las contraseñas no coinciden'
  if (!f.aceptaPrivacidad) e.aceptaPrivacidad = 'Debes aceptar la política de privacidad'
  return e
}

export default function RegistroPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [direccion, setDireccion] = useState(DIRECCION_VACIA)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate(form)
    const vd = validarDireccion(direccion, { codigoPostalOpcional: true })
    setErrors({ ...v, direccion: vd })
    if (Object.keys(v).length || Object.keys(vd).length) {
      setServerError('Revisa los campos marcados en rojo.')
      return
    }
    setLoading(true)
    setServerError(null)
    try {
      await authService.registro({
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        dni: form.dni.toUpperCase().replace(/[\s-]/g, ''),
        telefono: form.telefono.replace(/[\s-]/g, ''),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        direccion: limpiarDireccion(direccion),
        aceptaPrivacidad: true,
      })
      navigate('/login', { replace: true, state: { email: form.email.trim().toLowerCase(), notice: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' } })
    } catch (err) {
      setErrors({ ...(err.fieldErrors ?? {}), direccion: erroresDireccion(err.fieldErrors) })
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell wide>
      <form onSubmit={handleSubmit} noValidate className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1">
          <Link to="/login" className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit">
            <Icon name="arrow_back" className="text-[16px]" /> Volver al inicio de sesión
          </Link>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-1">Crear cuenta de ciudadano</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Necesitamos tu dirección completa: es donde pasará el recolector a por tus bolsas.
          </p>
        </div>

        {serverError && <Alert>{serverError}</Alert>}

        <fieldset className="flex flex-col gap-space-md">
          <legend className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-semibold mb-space-sm flex items-center gap-1">
            <Icon name="badge" className="text-[16px] text-primary" /> Datos personales
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <FormField label="Nombre" value={form.nombre} onChange={set('nombre')} error={errors.nombre} autoComplete="given-name" />
            <FormField label="Apellidos" value={form.apellidos} onChange={set('apellidos')} error={errors.apellidos} autoComplete="family-name" />
            <FormField label="DNI / NIE" icon="id_card" value={form.dni} onChange={set('dni')} error={errors.dni} placeholder="12345678Z" />
            <FormField label="Teléfono" icon="call" type="tel" value={form.telefono} onChange={set('telefono')} error={errors.telefono} autoComplete="tel" placeholder="612 345 678" />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-space-md">
          <legend className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-semibold mb-space-sm flex items-center gap-1">
            <Icon name="lock" className="text-[16px] text-primary" /> Acceso
          </legend>
          <FormField label="Correo electrónico" icon="mail" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <FormField label="Contraseña" type="password" value={form.password} onChange={set('password')} error={errors.password} hint="Mínimo 8 caracteres, con letras y números" autoComplete="new-password" />
            <FormField label="Repite la contraseña" type="password" value={form.password2} onChange={set('password2')} error={errors.password2} autoComplete="new-password" />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-space-md">
          <legend className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-semibold mb-space-sm flex items-center gap-1">
            <Icon name="home_pin" className="text-[16px] text-primary" /> Dirección de recogida
          </legend>
          <DireccionFields value={direccion} onChange={setDireccion} errors={errors.direccion} codigoPostalOpcional />
        </fieldset>

        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-space-sm p-space-md rounded-xl bg-surface-container-low cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-primary" checked={form.aceptaPrivacidad} onChange={set('aceptaPrivacidad')} />
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              He leído y acepto la <a href="#" className="text-primary font-semibold hover:underline">Política de Privacidad (RGPD)</a> y las condiciones de
              retorno de envases.
            </span>
          </label>
          {errors.aceptaPrivacidad && <span className="font-body-sm text-body-sm text-error">{errors.aceptaPrivacidad}</span>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] rounded-xl bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-70"
        >
          {loading ? <Spinner /> : <Icon name="how_to_reg" className="text-[20px]" />}
          {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
        </button>
      </form>
    </AuthShell>
  )
}
