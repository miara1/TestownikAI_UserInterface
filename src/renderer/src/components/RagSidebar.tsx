// src/renderer/src/components/RagSidebar.tsx
import { ChangeEvent, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  Difficulty,
  QuestionWrapper,
  SourcesRes,
  clearSources,
  genMcq,
  genYn,
  listSources,
  searchRag,
  uploadFiles
} from '../ragApi'

import { upsertQuestion } from '../utils/questionsDb'

type Mode = 'mcq' | 'yn' | 'search'

interface RagSidebarProps {
  onOutput: (text: string) => void
}

export function RagSidebar({ onOutput }: RagSidebarProps) {
  const [mode, setMode] = useState<Mode>('mcq')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  type Provider = 'default' | 'openai' | 'ollama' | 'none'

  const [provider, setProvider] = useState<Provider>(() => {
    return (localStorage.getItem('rag_provider') as Provider) ?? 'default'
  })

  const [count, setCount] = useState<number>(() => {
    const raw = localStorage.getItem('rag_question_count')
    const n = raw ? Number.parseInt(raw, 10) : 1
    return Number.isFinite(n) && n >= 1 ? n : 1
  })

  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [lastUploadInfo, setLastUploadInfo] = useState<string | null>(null)

  const [sources, setSources] = useState<SourcesRes | null>(null)
  const [sourcesLoading, setSourcesLoading] = useState(false)

  const [sourcesOpen, setSourcesOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('rag_provider', provider)
  }, [provider])

  useEffect(() => {
    localStorage.setItem('rag_question_count', String(count))
  }, [count])

  const handleRun = async () => {
    const trimmed = topic.trim()

    if (!trimmed && mode !== 'yn') {
      alert('Podaj temat lub zapytanie.')
      return
    }

    setLoading(true)
    onOutput('// Czekam na odpowiedź backendu…')

    try {
      let data: unknown

      if (mode === 'search') {
        data = await searchRag(trimmed || 'test')
      } else if (mode === 'mcq') {
        data = await genMcq(trimmed || 'przegląd materiału', difficulty, count, provider)
      } else {
        data = await genYn(trimmed || 'przegląd materiału', difficulty, count, provider)
      }

      if (mode === 'mcq' || mode === 'yn') {
        // Backend zwraca albo QuestionWrapper (n=1), albo { items: QuestionWrapper[] } (n>1)
        const maybeMulti = data as { items?: QuestionWrapper[] }

        if (Array.isArray(maybeMulti?.items)) {
          for (const item of maybeMulti.items) {
            await upsertQuestion(item)
          }
        } else {
          await upsertQuestion(data as QuestionWrapper)
        }
      }

      onOutput(JSON.stringify(data, null, 2))
    } catch (err) {
      console.error(err)
      onOutput(`// Błąd: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      setFiles([])
      return
    }
    setFiles(Array.from(e.target.files))
  }

  const handleUpload = async () => {
    if (!files.length) {
      alert('Wybierz pliki do uploadu.')
      return
    }

    setLoading(true)
    onOutput('// Uploaduję i indeksuję pliki…')

    try {
      const res = await uploadFiles(files)
      const totalChunks = res.ingested.reduce((sum, item) => sum + item.chunks, 0)
      setLastUploadInfo(
        `Zaindeksowano ${res.ingested.length} plików, łączna liczba chunków: ${totalChunks}.`
      )
      onOutput(JSON.stringify(res, null, 2))
      await handleRefreshSources()
    } catch (err) {
      console.error(err)
      onOutput(`// Błąd przy uploadzie: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshSources = async (openAfter = false) => {
    setSourcesLoading(true)
    try {
      const res = await listSources(1000, 0)
      setSources(res)
      onOutput(JSON.stringify(res, null, 2))
      if (openAfter) setSourcesOpen(true)
    } catch (err) {
      console.error(err)
      onOutput(`// Błąd przy pobieraniu sources: ${(err as Error).message}`)
    } finally {
      setSourcesLoading(false)
    }
  }

  const handleClearSources = async () => {
    const ok = confirm('Na pewno wyczyścić wszystkie źródła? To usunie pliki i zresetuje bazę RAG.')
    if (!ok) return

    setSourcesLoading(true)
    setLoading(true)
    onOutput('// Czyszczę źródła…')

    try {
      const res = await clearSources()
      setSources(null)
      onOutput(JSON.stringify(res, null, 2))
    } catch (err) {
      console.error(err)
      onOutput(`// Błąd przy czyszczeniu sources: ${(err as Error).message}`)
    } finally {
      setSourcesLoading(false)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Testownik AI – RAG</h1>

      {/* wybór endpointu */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Rodzaj pytań</span>
        <div className="flex flex-col gap-1">
          <button
            className={twMerge(
              'px-2 py-1 text-sm rounded',
              mode === 'mcq' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            )}
            onClick={() => setMode('mcq')}
          >
            Pytania A/B/C/D
          </button>
          <button
            className={twMerge(
              'px-2 py-1 text-sm rounded',
              mode === 'yn' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            )}
            onClick={() => setMode('yn')}
          >
            Pytania Tak/Nie
          </button>
          {/* <button
            className={twMerge(
              'px-2 py-1 text-sm rounded',
              mode === 'search' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            )}
            onClick={() => setMode('search')}
          >
            /search
          </button> */}
        </div>
      </div>

      {/* temat / query */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">
          {mode === 'search' ? 'Zapytanie' : 'Temat pytania'}
        </span>
        <input
          className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={
            mode === 'search'
              ? 'np. "algorytmy przeszukiwania sąsiedztwa"'
              : 'np. "rozdział 2 – innowacje społeczne"'
          }
        />
      </div>

      {/* trudność */}
      {mode !== 'search' && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Trudność wygenerowanych pytań</span>
          <select
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </div>
      )}

      {mode !== 'search' && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Provider (źródło generowania)</span>
          <select
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
          >
            <option value="default">default (z backendu / ENV)</option>
            <option value="openai">openai</option>
            <option value="ollama">ollama</option>
            <option value="none">none (fallback/offline)</option>
          </select>
        </div>
      )}

      {mode !== 'search' && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Liczba pytań w zapytaniu</span>
          <input
            type="number"
            min={1}
            max={50}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
            value={count}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10)
              if (!Number.isFinite(n)) {
                setCount(1)
                return
              }
              setCount(Math.max(1, Math.min(50, n)))
            }}
          />
        </div>
      )}

      <button
        className="mt-1 px-3 py-1.5 bg-emerald-500 text-slate-900 text-sm font-semibold rounded disabled:opacity-50"
        onClick={handleRun}
        disabled={loading}
      >
        {loading ? 'Ładowanie...' : 'Wyślij zapytanie'}
      </button>

      {/* upload plików do RAG */}
      <div className="mt-3 border-t border-slate-800 pt-3 flex flex-col gap-2">
        <span className="text-xs text-slate-400">Upload materiałów do RAG</span>
        <input type="file" multiple onChange={handleFilesChange} className="text-xs" />
        <button
          className="px-3 py-1.5 bg-slate-700 text-slate-100 text-sm rounded disabled:opacity-50"
          onClick={handleUpload}
          disabled={loading || !files.length}
        >
          Wyślij pliki do backendu
        </button>
        {lastUploadInfo && <p className="text-[11px] text-slate-500">{lastUploadInfo}</p>}
      </div>

      {/* sources list + clear */}
      <div className="mt-3 border-t border-slate-800 pt-3 flex flex-col gap-2">
        <span className="text-xs text-slate-400">Źródła (sources) w RAG</span>

        <div className="flex gap-2">
          <button
            className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-100 text-sm rounded disabled:opacity-50"
            onClick={() => handleRefreshSources(true)}
            disabled={sourcesLoading || loading}
          >
            {sourcesLoading ? 'Ładowanie…' : 'Pokaż/odśwież sources'}
          </button>

          <button
            className="px-3 py-1.5 bg-rose-600 text-slate-100 text-sm rounded disabled:opacity-50"
            onClick={handleClearSources}
            disabled={sourcesLoading || loading}
            title="Usuwa pliki i resetuje bazę"
          >
            Wyczyść
          </button>
        </div>

        {sources && (
          <p className="text-[11px] text-slate-500">
            Źródeł: {sources.total} (kliknij „Pokaż”, żeby zobaczyć listę)
          </p>
        )}

        {!sources && (
          <p className="text-[11px] text-slate-500">
            Kliknij „Pokaż/odśwież sources”, aby zobaczyć listę.
          </p>
        )}
      </div>

      {/* <p className="mt-2 text-[11px] text-slate-500">
        Wszystkie wywołania API (upload, wyszukiwanie, generowanie pytań) robi ten sidebar.
        Odpowiedź backendu jest pokazywana w głównym panelu jako surowy JSON.
      </p> */}

      {sourcesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSourcesOpen(false)}
        >
          <div
            className="w-[520px] max-w-[92vw] rounded border border-slate-700 bg-slate-900 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-100">Wgrane pliki (sources)</h2>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-slate-700 text-slate-100 text-xs rounded disabled:opacity-50"
                  onClick={() => handleRefreshSources(false)}
                  disabled={sourcesLoading}
                >
                  {sourcesLoading ? 'Odświeżam…' : 'Odśwież'}
                </button>

                <button
                  className="px-3 py-1 bg-emerald-500 text-slate-900 text-xs font-semibold rounded"
                  onClick={() => setSourcesOpen(false)}
                >
                  Zamknij
                </button>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-auto rounded border border-slate-800 bg-slate-950/40 p-2">
              {!sources?.items?.length ? (
                <p className="text-xs text-slate-400">Brak wgranych źródeł.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {sources.items.map((s) => (
                    <li key={s.id} className="text-xs text-slate-200">
                      {s.filename}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {sources && (
              <p className="mt-2 text-[11px] text-slate-500">
                Łącznie: {sources.total} | pokazuję: {sources.items.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
