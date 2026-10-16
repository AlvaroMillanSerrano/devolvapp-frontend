import { Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon'

const YEAR = new Date().getFullYear()

const PASOS = [
  { icon: 'shopping_bag', titulo: 'Llena tus bolsas', texto: 'Latas, botellas de plástico, briks o vidrio.' },
  { icon: 'event_available', titulo: 'Elige día y hora', texto: 'Un recolector pasa a recogerlas por tu casa.' },
  { icon: 'savings', titulo: 'Cobra', texto: 'Por cada envase válido recibes dinero en tu monedero.' },
]

/**
 * Marco visual de las pantallas de acceso: columna de marca + panel de formulario.
 */
export default function AuthShell({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-12">
      <aside className="hidden lg:flex lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-primary to-primary-container text-on-primary p-margin flex-col justify-between">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -left-16 bottom-24 w-72 h-72 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none" />

        <Link to="/login" className="relative z-10 flex items-center gap-space-sm w-fit">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Icon name="recycling" className="text-[26px] text-secondary-fixed" />
          </span>
          <span className="flex flex-col">
            <span className="font-headline-sm text-headline-sm leading-none tracking-tight">DevolvUp</span>
          </span>
        </Link>

        <div className="relative z-10 flex flex-col gap-space-lg max-w-md">
          <div className="flex flex-col gap-space-sm">
            <h1 className="font-display-lg-mobile text-display-lg-mobile xl:font-display-lg xl:text-display-lg tracking-tight">
              Recogemos tus envases en casa y te pagamos por ellos.
            </h1>
          </div>
          <ul className="flex flex-col gap-space-sm">
            {PASOS.map((p) => (
              <li key={p.titulo} className="flex items-start gap-space-sm p-space-sm rounded-xl bg-white/10">
                <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon name={p.icon} className="text-[20px] text-secondary-fixed" />
                </span>
                <span className="flex flex-col">
                  <span className="font-title-md text-title-md">{p.titulo}</span>
                  <span className="font-body-sm text-body-sm text-white/80">{p.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 font-label-sm text-label-sm text-white/60 flex items-center gap-1">
          <Icon name="verified_user" className="text-[14px]" /> © {YEAR} DevolvUp Technologies S.L.
        </p>
      </aside>

      <section className="lg:col-span-7 flex flex-col items-center justify-center px-gutter-mobile sm:px-gutter py-space-xl">
        <Link to="/login" className="lg:hidden flex items-center gap-space-sm mb-space-lg">
          <span className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Icon name="recycling" className="text-[22px] text-secondary-fixed" />
          </span>
          <span className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary leading-none">DevolvUp</span>
          </span>
        </Link>
        <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div>
      </section>
    </div>
  )
}
