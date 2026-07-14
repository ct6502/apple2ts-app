import { contextBridge, ipcRenderer } from 'electron'

ipcRenderer.on('apple2ts-window-message', (_, payload: unknown) => {
  // Forward automation messages from Electron main process into the page context.
  window.postMessage(payload, '*')
})

// Expose Electron-specific APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  saveDiskImage: (filePath: string, data: number[]) => 
    ipcRenderer.invoke('save-disk-image', filePath, data),
  reportAutomationEvent: (eventName: string, payload?: unknown) =>
    ipcRenderer.invoke('automation-event', { eventName, payload })
})

ipcRenderer.invoke('automation-event', { eventName: 'preload-ready' }).catch(() => {})
