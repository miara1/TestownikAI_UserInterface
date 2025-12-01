import { Content, RootLayout, Sidebar } from '@/components'

function App() {
  return (
    <RootLayout>
      <Content className="border-r bg-zinc-900/30 border-r-white-20">
        Pole na wyswietlanie pytan i udzielanie odpowiedzi + recenzje pytan
      </Content>
      <Sidebar className="p-2">Pasek na dodawanie plikow, komunikacje z RAG'iem</Sidebar>
    </RootLayout>
  )
}

export default App
