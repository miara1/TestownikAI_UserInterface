import { contextBridge } from 'electron'
// import { ElectronAPI } from '@electron-toolkit/preload'

if (!process.contextIsolated) {
  throw new Error('Context isolation is not enabled')
}

try {
  contextBridge.exposeInMainWorld('context', {
    // TODO
  })
} catch (error) {
  console.error(error)
}
