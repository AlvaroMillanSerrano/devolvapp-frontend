/** Icono de Material Symbols Outlined */
export default function Icon({ name, className = '', filled = false, ...props }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`} {...props}>
      {name}
    </span>
  )
}
