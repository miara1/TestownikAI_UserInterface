// src/renderer/src/App.tsx
import { useState } from 'react'
import { Content, RootLayout, Sidebar } from './components/AppLayout'
import { RagSidebar } from './components/RagSidebar'
import { ResponseViewer } from './components/ResponseViewer'

function App() {
  const [output, setOutput] = useState(
    '// Uruchom zapytanie z panelu po lewej, aby zobaczyć odpowiedź backendu.'
  )

  return (
    <RootLayout className="bg-slate-900 text-slate-100">
      <Sidebar className="bg-slate-950 border-r border-slate-800 p-4">
        <RagSidebar onOutput={setOutput} />
      </Sidebar>

      <Content className="p-4 flex flex-col gap-2">
        <h2 className="text-xl font-semibold mb-2">Odpowiedź backendu (JSON)</h2>
        <ResponseViewer value={output} />
      </Content>
    </RootLayout>
  )
}

export default App
