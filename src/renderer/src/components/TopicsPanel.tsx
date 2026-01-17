// src/renderer/src/components/TopicsPanel.tsx
import { useEffect, useMemo, useState } from 'react'
import { deleteTopics, getTopicsSummary, type TopicSummary } from '../utils/questionsDb'

type Props = {
  onOpenTopic: (topic: string) => void
}

export function TopicsPanel({ onOpenTopic }: Props) {
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await getTopicsSummary()
      setTopics(res)

      // usuń z selekcji topiki, które zniknęły
      setSelected((prev) => {
        const next: Record<string, boolean> = {}
        for (const t of res) {
          if (prev[t.topic]) next[t.topic] = true
        }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const onUpdated = () => refresh()
    window.addEventListener('questions-updated', onUpdated)
    return () => window.removeEventListener('questions-updated', onUpdated)
  }, [])

  const selectedTopics = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  )

  const allTopics = useMemo(() => topics.map((t) => t.topic), [topics])
  const allSelected = useMemo(
    () => allTopics.length > 0 && allTopics.every((t) => selected[t]),
    [allTopics, selected]
  )

  const toggle = (topic: string) => {
    setSelected((prev) => ({ ...prev, [topic]: !prev[topic] }))
  }

  const selectAll = () => {
    const next: Record<string, boolean> = {}
    for (const t of topics) next[t.topic] = true
    setSelected(next)
  }

  const clearSelection = () => setSelected({})

  const removeSelected = async () => {
    if (selectedTopics.length === 0) return
    const ok = window.confirm(`Usunąć zaznaczone foldery (${selectedTopics.length})?`)
    if (!ok) return
    await deleteTopics(selectedTopics)
    setSelected({})
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-semibold">Foldery (topic)</h3>

        <button
          onClick={allSelected ? clearSelection : selectAll}
          className="ml-auto px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
          title={allSelected ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
          disabled={topics.length === 0}
        >
          {allSelected ? 'Odznacz wszystko' : 'Zaznacz wszystko'}
        </button>

        <button
          onClick={removeSelected}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm disabled:opacity-50"
          disabled={selectedTopics.length === 0}
          title="Usuń tylko zaznaczone foldery"
        >
          Usuń zaznaczone
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="text-sm text-slate-400">Ładowanie…</div>
        ) : topics.length === 0 ? (
          <div className="text-sm text-slate-400">
            Brak zapisanych pytań. Wygeneruj MCQ/YN w lewym panelu.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {topics.map((t) => {
              const checked = !!selected[t.topic]
              return (
                <label
                  key={t.topic}
                  className="rounded border border-slate-800 bg-slate-950 p-3 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggle(t.topic)}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.topic}</div>
                      <div className="text-xs text-slate-400 mt-1">Pytań: {t.count}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Ostatnie: {new Date(t.lastTimestamp).toLocaleString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onOpenTopic(t.topic)
                        }}
                        className="ml-auto px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs"
                        title="Otwórz folder i odpowiadaj na pytania"
                      >
                        Otwórz
                      </button>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
