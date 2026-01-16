// src/renderer/src/components/RagSidebar.tsx
import { ChangeEvent, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Difficulty, genMcq, genYn, searchRag, uploadFiles } from '../ragApi'

type Mode = 'mcq' | 'yn' | 'search'

interface RagSidebarProps {
  onOutput: (text: string) => void
}

export function RagSidebar({ onOutput }: RagSidebarProps) {
  const [mode, setMode] = useState<Mode>('mcq')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [lastUploadInfo, setLastUploadInfo] = useState<string | null>(null)

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
        data = await genMcq(trimmed || 'przegląd materiału', difficulty)
      } else {
        data = await genYn(trimmed || 'przegląd materiału', difficulty)
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
    } catch (err) {
      console.error(err)
      onOutput(`// Błąd przy uploadzie: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Testownik AI – RAG</h1>

      {/* wybór endpointu */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Endpoint</span>
        <div className="flex flex-col gap-1">
          <button
            className={twMerge(
              'px-2 py-1 text-sm rounded',
              mode === 'mcq' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            )}
            onClick={() => setMode('mcq')}
          >
            /gen/mcq
          </button>
          <button
            className={twMerge(
              'px-2 py-1 text-sm rounded',
              mode === 'yn' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            )}
            onClick={() => setMode('yn')}
          >
            /gen/yn
          </button>
          <button
            className={twMerge(
              'px-2 py-1 text-sm rounded',
              mode === 'search' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'
            )}
            onClick={() => setMode('search')}
          >
            /search
          </button>
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

      <p className="mt-2 text-[11px] text-slate-500">
        Wszystkie wywołania API (upload, wyszukiwanie, generowanie pytań) robi ten sidebar.
        Odpowiedź backendu jest pokazywana w głównym panelu jako surowy JSON.
      </p>
    </div>
  )
}
