import { contextBridge, ipcRenderer } from 'electron'

// Expose Electron-specific APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  saveDiskImage: (filePath: string, data: number[]) => 
    ipcRenderer.invoke('save-disk-image', filePath, data)
})
