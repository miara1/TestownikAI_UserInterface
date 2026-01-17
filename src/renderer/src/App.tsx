// src/renderer/src/App.tsx
import { useState } from 'react'
import { Content, RootLayout, Sidebar } from './components/AppLayout'
import { RagSidebar } from './components/RagSidebar'
import { ResponseViewer } from './components/ResponseViewer'
import { RightJsonSidebar } from './components/RightJsonSidebar'
import { TopicQuizView } from './components/TopicQuizView'
import { TopicsPanel } from './components/TopicsPanel'

function App() {
  const [output, setOutput] = useState(
    '// Uruchom zapytanie z panelu po lewej, aby zobaczyć odpowiedź backendu.'
  )

  const [activeTopic, setActiveTopic] = useState<string | null>(null)

  const [isJsonOpen, setIsJsonOpen] = useState(true)

  return (
    <RootLayout className="bg-slate-900 text-slate-100">
      <Sidebar className="bg-slate-950 border-r border-slate-800 p-4">
        <RagSidebar onOutput={setOutput} />
      </Sidebar>

      <Content className="p-4 flex flex-col gap-2 min-h-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Panel główny</h2>
        </div>

        <div className="text-slate-300">
          Wysyłaj zapytania z lewego panelu. Podgląd JSON jest po prawej.
        </div>

        <div className="flex-1 min-h-0">
          {activeTopic ? (
            <TopicQuizView topic={activeTopic} onBack={() => setActiveTopic(null)} />
          ) : (
            <TopicsPanel onOpenTopic={(t) => setActiveTopic(t)} />
          )}
        </div>
      </Content>

      {/* Prawy zwijalny sidebar */}
      <RightJsonSidebar
        isOpen={isJsonOpen}
        onToggle={() => setIsJsonOpen((v) => !v)}
        value={output}
      >
        <ResponseViewer value={output} />
      </RightJsonSidebar>
    </RootLayout>
  )
}

export default App
