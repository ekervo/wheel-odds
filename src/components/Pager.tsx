import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

export const PAGE_SIZE = 10

/** Splits a list into pages of `size`. The page index is clamped when the list shrinks. */
export function usePaged<T>(items: readonly T[], size = PAGE_SIZE) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const safe = Math.min(page, pages - 1)
  return { page: safe, pages, setPage, slice: items.slice(safe * size, safe * size + size), total: items.length, size }
}

/** Page numbers to show: always first and last, plus a window around the current page. */
function pageList(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([0, pages - 1, page - 1, page, page + 1])
  const sorted = [...wanted].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

/** Numbered pager, shown whenever the list has entries, starting at page 1. */
export function Pager({ page, pages, total, size = PAGE_SIZE, onPage }: { page: number; pages: number; total: number; size?: number; onPage: (p: number) => void }) {
  if (total === 0) return null
  const btn = 'grid h-11 min-w-[44px] place-items-center rounded-lg border px-2 text-sm num'
  const from = page * size + 1
  const to = Math.min(total, (page + 1) * size)
  return (
    <nav className="mt-3" aria-label="Pagination">
      <div className="flex items-center justify-center gap-1.5">
        <button className={clsx(btn, 'border-line text-mute hover:text-ink disabled:opacity-30')} onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        {pageList(page, pages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-faint">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p + 1}`}
              className={clsx(btn, p === page ? 'border-gold bg-gold/10 text-gold' : 'border-line text-mute hover:text-ink')}
            >
              {p + 1}
            </button>
          ),
        )}
        <button className={clsx(btn, 'border-line text-mute hover:text-ink disabled:opacity-30')} onClick={() => onPage(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-faint num">
        Showing {from}-{to} of {total}
      </p>
    </nav>
  )
}
