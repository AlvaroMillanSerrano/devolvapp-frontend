/** Paginación para respuestas Page<T> de Spring (`number` empieza en 0). */
export default function Paginacion({ page, onChange }) {
  if (!page || page.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-3 p-3">
      <button type="button" className="btn btn-secondary btn-sm" disabled={page.number === 0} onClick={() => onChange(page.number - 1)}>
        Anterior
      </button>
      <span className="text-sm text-on-surface-variant">
        {page.number + 1} de {page.totalPages}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={page.number + 1 >= page.totalPages} onClick={() => onChange(page.number + 1)}>
        Siguiente
      </button>
    </div>
  )
}
