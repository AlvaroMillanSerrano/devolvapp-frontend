import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLE_META } from '../config/roles'
import Icon from '../components/ui/Icon'

/**
 * Selector de perfil para usuarios MULTIROL (no aparece si el usuario tiene un único rol).
 * Cambia el rol activo y navega a la home de ese rol. No pide nada al servidor:
 * el token ya contiene todas las authorities del usuario.
 */
export default function RoleSwitcher() {
  const { roles, activeRole, selectRole } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (roles.length < 2) return null
  const current = ROLE_META[activeRole]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-9 pl-2.5 pr-2 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center gap-1 text-sm font-semibold"
        title="Cambiar de perfil"
      >
        <Icon name={current?.icon ?? 'swap_horiz'} className="text-[18px] text-primary" />
        <span className="hidden sm:inline">{current?.label}</span>
        <Icon name="expand_more" className="text-[18px] text-on-surface-variant" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-lowest shadow-xl p-1.5 z-[60]">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-on-surface-variant">Entrar como</p>
          {roles.map((role) => {
            const meta = ROLE_META[role]
            const active = role === activeRole
            return (
              <button
                key={role}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setOpen(false)
                  selectRole(role)
                  navigate(meta.home)
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left ${active ? 'bg-primary/10' : 'hover:bg-surface-container-low'}`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center ${active ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary'}`}>
                  <Icon name={meta.icon} className="text-[20px]" />
                </span>
                <span className="flex-1 font-semibold text-sm">{meta.label}</span>
                {active && <Icon name="check" className="text-[18px] text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
