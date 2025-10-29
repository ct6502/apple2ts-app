// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron')
const fs = require('fs').promises
const fsSync = require('fs')

// Expose file system API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: async (path) => {
    const data = await fs.readFile(path)
    return new Uint8Array(data)
  },
  writeFile: async (path, data) => {
    await fs.writeFile(path, Buffer.from(data))
  },
  watchFile: (path, callback) => {
    const watcher = fsSync.watch(path, (eventType) => {
      if (eventType === 'change') {
        callback()
      }
    })
    return () => watcher.close()
  },
  showOpenDialog: async (options) => {
    return await ipcRenderer.invoke('show-open-dialog', options)
  },
  showSaveDialog: async (options) => {
    return await ipcRenderer.invoke('show-save-dialog', options)
  },
  resolvePath: async (relativePath) => {
    return await ipcRenderer.invoke('resolve-path', relativePath)
  },
  createWriteable: async (path) => {
    // Create a writable file handle that mimics the File System Access API
    let fileHandle = null
    
    return {
      write: async (data) => {
        if (!fileHandle) {
          fileHandle = await fs.open(path, 'w')
        }
        await fileHandle.write(Buffer.from(data))
      },
      close: async () => {
        if (fileHandle) {
          await fileHandle.close()
          fileHandle = null
        }
      }
    }
  }
})
