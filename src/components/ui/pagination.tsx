type PaginationProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1)

  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <button
        className="rounded border px-2 py-1 disabled:opacity-50"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        Précédent
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={`rounded px-2 py-1 ${p === page ? 'bg-slate-900 text-white' : 'border'}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="rounded border px-2 py-1 disabled:opacity-50"
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page === pageCount}
      >
        Suivant
      </button>
    </div>
  )
}
