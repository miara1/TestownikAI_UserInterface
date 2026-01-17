import { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = {
  isOpen: boolean
  onToggle: () => void
  title?: string
  value: string
  className?: string
  widthPx?: number
  children: React.ReactNode
}

export function RightJsonSidebar({
  isOpen,
  onToggle,
  title = 'Odpowiedź backendu (JSON)',
  value,
  className,
  widthPx = 420,
  children
}: Props) {
  const widthClass = useMemo(() => `w-[${widthPx}px]`, [widthPx])

  return (
    <aside
      className={twMerge(
        'h-[calc(100vh)] border-l border-slate-800 bg-slate-950',
        'flex flex-col overflow-hidden',
        // zwijanie: gdy zamknięty, zostawiamy wąski "uchwyt"
        isOpen ? widthClass : 'w-[44px]',
        className
      )}
    >
      {/* header */}
      <div className="shrink-0 flex items-center gap-2 p-3 border-b border-slate-800">
        {/* Tytuł chowamy gdy zwinięty */}
        <div className={twMerge('font-semibold truncate', !isOpen && 'hidden')}>{title}</div>

        <div className="ml-auto flex items-center gap-2">
          {/* Copy tylko gdy otwarty */}
          {isOpen && (
            <button
              onClick={() => navigator.clipboard.writeText(value)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
              title="Kopiuj JSON do schowka"
            >
              Copy
            </button>
          )}

          <button
            onClick={onToggle}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            title={isOpen ? 'Zwiń panel' : 'Rozwiń panel'}
          >
            {isOpen ? '▸' : '◂'}
          </button>
        </div>
      </div>

      {/* body */}
      <div className={twMerge('flex-1 min-h-0 p-3', !isOpen && 'hidden')}>
        <div className="h-full min-h-0">{children}</div>
      </div>

      {/* uchwyt gdy zwinięty */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="h-full w-full flex items-center justify-center
                     text-slate-200 hover:bg-slate-900"
          title="Otwórz panel JSON"
        >
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-widest text-xs">
            JSON
          </span>
        </button>
      )}
    </aside>
  )
}
