import { app, BrowserWindow, screen, Menu, ipcMain, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createAboutWindow } from './about'
import { createSplashWindow, handleSplashCompletion } from './splash'
import { loadConfig, getAssetPath, getDiskImagePath } from './config'
import { debug } from './debug'
import Store from 'electron-store'
import { isRunningFromQuarantine, showQuarantineWarning } from './utilities'
import { checkForUpdates } from './updateChecker'


// Handle Squirrel events for Windows installer
// This prevents the app from starting during installation/update
// @ts-expect-error -> In vite there are no types for the following line. Electron forge error
import started from "electron-squirrel-startup"
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) app.quit()


// Load store to persist menu item state
const store = new Store()

// Load configuration first
const config = loadConfig()

// Set app name from config
app.setName(config.name || 'Apple2TS')

const getCliArgValue = (flag: string): string | null => {
  const prefixed = `${flag}=`
  for (let i = 0; i < process.argv.length; i += 1) {
    const arg = process.argv[i]
    if (arg === flag) {
      const value = process.argv[i + 1]
      if (value && !value.startsWith('-')) {
        return value
      }
      return null
    }
    if (arg.startsWith(prefixed)) {
      return arg.slice(prefixed.length)
    }
  }
  return null
}

const automationMode = process.argv.includes('--automation')
const allowMultiInstance = automationMode || process.argv.includes('--allow-multi-instance')
const cliUserDataDir = getCliArgValue('--user-data-dir')

if (cliUserDataDir) {
  const resolvedUserDataDir = path.resolve(cliUserDataDir)
  fs.mkdirSync(resolvedUserDataDir, { recursive: true })
  app.setPath('userData', resolvedUserDataDir)
}

// Configure app for macOS keychain access
if (process.platform === 'darwin') {
  // Set a consistent app path for keychain access
  if (!cliUserDataDir) {
    app.setPath('userData', path.join(app.getPath('appData'), config.name || 'Apple2TS'))
  }
  
  // Disable keychain access for development to avoid errors
  if (!app.isPackaged) {
    app.commandLine.appendSwitch('use-fake-keychain')
  }
}

// Note: Auto-updater functionality removed to reduce bundle size

// Set dock icon for development (macOS) - use config-aware asset loading
if (process.platform === 'darwin') {
  const dockIconPath = getAssetPath(config, 'App.png') // Use App.png for dock icon
  if (app.dock && fs.existsSync(dockIconPath)) {
    app.dock.setIcon(dockIconPath)
  }
}

let mainWindow: BrowserWindow | null = null
let pendingFileToOpen: string | null = null
let pendingParameters: Record<string, string> | null = null
let pendingFragment: string | null = null
let lastDiskLoadAckAt = 0

// Check for --debug flag in command line arguments
const debugMode = process.argv.includes('--debug')
const fullscreenMode = process.argv.includes('--fullscreen')
const noSplashMode = process.argv.includes('--no-splash') || automationMode
if (automationMode) {
  // Avoid black-window captures in some Windows automation sessions.
  app.disableHardwareAcceleration()
}
if (debugMode) {
  debug.log('Debug mode enabled via command line')
}

// Helper function to send parameters to emulator without reloading
const sendParameters = (params: Record<string, string>) => {
  if (mainWindow && mainWindow.webContents) {
    debug.log('📱 Sending parameters to Apple2TS (no reload):', params)
    
    // Send message directly to Apple2TS via postMessage (no page reload)
    mainWindow.webContents.executeJavaScript(`
      (function() {
        console.log('🔧 [Main Process] Sending parameters to Apple2TS:', ${JSON.stringify(params)});
        window.postMessage({
          type: 'updateParameters',
          params: ${JSON.stringify(params)}
        }, '*');
      })();
    `).catch(error => {
      debug.log('❌ Error sending parameters:', error)
    })
  }
}

// Helper function to load a disk image in the emulator
const loadDiskImage = (filePath: string) => {
  debug.log('Loading disk image:', filePath)
  
  if (mainWindow && mainWindow.webContents) {
    try {
      // Read the file as a buffer
      const fileBuffer = fs.readFileSync(filePath)
      const filename = path.basename(filePath)
      const messageType = filename.toLowerCase().endsWith('.a2ts') ? 'loadState' : 'loadDisk'
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      console.log(`[AUTOMATION] disk-load-requested ${filename}`)

      debug.log('📱 Sending disk image to renderer:', filename, `(${fileBuffer.length} bytes)`)

      // Message payload transported over Electron IPC to avoid huge executeJavaScript strings.
      const payload = {
        type: messageType,
        requestId,
        filename,
        filePath,
        data: Array.from(fileBuffer),
        dataBase64: fileBuffer.toString('base64'),
      }

      mainWindow.webContents.send('apple2ts-window-message', { type: 'showProgress' })

      // Dispatch until renderer confirms disk/state load to avoid startup listener races.
      const retryMs = noSplashMode ? 5000 : 500
      const maxDispatchMs = noSplashMode ? 30000 : 10000
      const startedAt = Date.now()
      const initialAckAt = lastDiskLoadAckAt
      let timer: NodeJS.Timeout | null = null

      const stopDispatch = () => {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
      }

      const dispatchPayload = () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
          stopDispatch()
          return
        }

        if (lastDiskLoadAckAt > initialAckAt) {
          console.log(`[AUTOMATION] disk-load-dispatched ${filename} (acknowledged)`)
          stopDispatch()
          return
        }

        mainWindow.webContents.send('apple2ts-window-message', payload)

        if (Date.now() - startedAt >= maxDispatchMs) {
          console.log(`[AUTOMATION] disk-load-dispatch-timeout ${filename}`)
          stopDispatch()
        }
      }

      timer = setInterval(dispatchPayload, retryMs)
      dispatchPayload()
      
      mainWindow.show()
      mainWindow.focus()
    } catch (error) {
      debug.log('❌ Error reading disk image:', error)
      console.error('🔧 [Main Process] Error reading disk image:', error)
    }
  } else {
    // Window not ready yet, store for later
    debug.log('Window not ready, storing file path for later:', filePath)
    pendingFileToOpen = filePath
  }
}



const createWindow = async (): Promise<void> => {
  // Check for quarantine before creating the window
  if (isRunningFromQuarantine()) {
    await showQuarantineWarning()
  }
  // Get the primary display's work area (excludes dock/taskbar)
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  
  // Use 1.4:1 aspect ratio (width:height), fitting to 95% of the smaller dimension
  const aspectRatio = 1.35
  let windowWidth: number
  let windowHeight: number
  
  // Determine which dimension is limiting
  if (width / height > aspectRatio) {
    // Height is the limiting dimension
    windowHeight = Math.floor(height * 0.95)
    windowWidth = Math.floor(windowHeight * aspectRatio)
  } else {
    // Width is the limiting dimension
    windowWidth = Math.floor(width * 0.95)
    windowHeight = Math.floor(windowWidth / aspectRatio)
  }
  
  // Create the browser window (initially hidden)
  // Use App.png for window icon (cross-platform compatible)
  const windowIcon = 'App.png' // PNG works on all platforms for window icons
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    title: config.name || 'Apple2TS',
    icon: getAssetPath(config, windowIcon),
    show: false, // Don't show until ready
    fullscreen: fullscreenMode,
    autoHideMenuBar: fullscreenMode,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox for compatibility
      webSecurity: false, // Allow local file access
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Load Apple2TS files
  // After cleanup, apple2ts-dist only contains the dist folder
  let apple2tsPath: string
  
  if (app.isPackaged) {
    // In packaged app, extraResource files are in the resources directory
    const resourcesPath = process.resourcesPath
    apple2tsPath = path.join(resourcesPath, 'apple2ts-dist', 'dist', 'index.html')
  } else {
    // In automation, prefer the sibling repo dist so the renderer includes
    // the current automation signaling hooks while keeping the same launch path.
    const siblingDistPath = path.join(__dirname, '../../../apple2ts/dist/index.html')
    const bundledDistPath = path.join(__dirname, '../../apple2ts-dist/dist/index.html')
    apple2tsPath = process.argv.includes('--automation') && fs.existsSync(siblingDistPath)
      ? siblingDistPath
      : bundledDistPath
  }
  
  debug.log('Loading Apple2TS from:', apple2tsPath)
  
  if (!fs.existsSync(apple2tsPath)) {
    debug.log('❌ Apple2TS dist files not found at:', apple2tsPath)
    if (app.isPackaged) {
      debug.log('📦 In packaged mode - checking resources path:', process.resourcesPath)
      // List what's actually in the resources directory for debugging
      try {
        const resourceContents = fs.readdirSync(process.resourcesPath)
        debug.log('📁 Resources directory contents:', resourceContents)
        const apple2tsDir = path.join(process.resourcesPath, 'apple2ts-dist')
        if (fs.existsSync(apple2tsDir)) {
          const apple2tsContents = fs.readdirSync(apple2tsDir)
          debug.log('📁 apple2ts-dist contents:', apple2tsContents)
        }
      } catch (error) {
        debug.log('❌ Error checking resources:', error)
      }
    }
    return
  }
  
  // Convert file path to file:// URL and add parameters from config
  const apple2tsUrl = new URL(`file://${apple2tsPath}`)

  // Handle menu options
  // @ts-expect-error - electron-store typing issue  
  if (store.get('gameMode')) {
    apple2tsUrl.searchParams.set('appMode', 'game')
  }
  
  // Add config parameters to URL
  if (config.parameters) {
    Object.entries(config.parameters).forEach(([key, value]) => {
      apple2tsUrl.searchParams.set(key, value)
    })
  }
  
  // Auto-load disk image if specified in config
  const diskImagePath = getDiskImagePath(config)
  if (diskImagePath) {
    apple2tsUrl.hash = diskImagePath
    debug.log('Auto-loading disk image from config:', diskImagePath)
  }
  
  // Store the URL to load after splash
  let urlToLoad = apple2tsUrl.toString()
  debug.log('📱 Final URL being sent to Apple2TS emulator:', urlToLoad)

  const loadMainWindow = () => {
    if (pendingFragment) {
      urlToLoad += "#" + pendingFragment
      pendingFragment = null
    }
    mainWindow?.loadURL(urlToLoad)
    
    // Show and focus window once emulator loads
    mainWindow?.webContents.once('did-finish-load', () => {
      console.log('[AUTOMATION] window-ready')
      if (mainWindow) {
        console.log(`[AUTOMATION] page-url ${mainWindow.webContents.getURL()}`)
      }
      if (process.argv.includes('--automation') && mainWindow) {
        mainWindow.webContents.on('console-message', (_event, level, message) => {
          console.log(`[AUTOMATION][renderer:${level}] ${message}`)
        })
      }
      // Restore saved zoom level
      // @ts-expect-error - electron-store typing issue
      const savedZoomLevel = store.get('zoomLevel', 0) as number
      if (savedZoomLevel !== 0 && mainWindow) {
        mainWindow.webContents.setZoomLevel(savedZoomLevel)
        debug.log(`🔍 Restored zoom level: ${savedZoomLevel}`)
      }
      
      // Listen for zoom changes and save them
      if (mainWindow) {
        mainWindow.webContents.on('zoom-changed', (event, zoomDirection) => {
          const currentZoomLevel = mainWindow?.webContents.getZoomLevel() || 0
          // @ts-expect-error - electron-store typing issue
          store.set('zoomLevel', currentZoomLevel)
          debug.log(`🔍 Zoom ${zoomDirection}, saved level: ${currentZoomLevel}`)
        })
      }
      
      mainWindow?.show()
      mainWindow?.focus()
      if (fullscreenMode) {
        mainWindow?.setFullScreen(true)
      }
      if (mainWindow) {
        const b = mainWindow.getBounds()
        console.log(`[AUTOMATION] window-bounds ${JSON.stringify(b)}`)
      }
      
      // Open DevTools if debug mode is enabled
      if (debugMode) {
        mainWindow?.webContents.openDevTools()
      }

      // Load disk from URL fragment (disk name or URL)
      // if (pendingFragment && mainWindow) {
      //   debug.log('Loading disk from fragment: ', pendingFragment)
      //   const fragment = pendingFragment
      //   pendingFragment = null
      //   const getCurrentURL = (): string | null => {
      //     return mainWindow?.webContents.getURL() || null
      //   }
      //   const currentUrl = getCurrentURL()
      //   if (currentUrl) {
      //     const finalUrl = currentUrl + "#" + fragment
      //     debug.log('final URL: ', finalUrl)
      //     mainWindow.loadURL(finalUrl)
      //     setTimeout(() => {mainWindow.loadURL(finalUrl)}, 700)
      //   }
      // }

      // Send any pending parameters that were passed via command line
      if (pendingParameters) {
        debug.log('Sending pending parameters after window ready:', pendingParameters)
        const params = pendingParameters
        pendingParameters = null
        
        setTimeout(() => {
          sendParameters(params)
        }, 1000)
      }
      
      // Load any pending file that was opened before window was ready
      if (pendingFileToOpen) {
        debug.log('Loading pending file after window ready:', pendingFileToOpen)
        const filePath = pendingFileToOpen
        pendingFileToOpen = null

        // In automation/no-splash mode the renderer is ready sooner.
        const pendingFileDelayMs = noSplashMode ? 200 : 2000
        setTimeout(() => {
          loadDiskImage(filePath)
        }, pendingFileDelayMs)
      }
    })
  }

  if (noSplashMode) {
    loadMainWindow()
  } else {
    // Wait for splash to complete before loading emulator
    handleSplashCompletion(loadMainWindow)
  }
}

// Add IPC handler for saving disk images
ipcMain.handle('save-disk-image', async (event, filePath: string, data: number[]) => {
  debug.log('💾 IPC: Received save-disk-image request for:', filePath, `(${data.length} bytes)`)
  try {
    const buffer = Buffer.from(data)
    fs.writeFileSync(filePath, buffer)
    debug.log('✅ IPC: Successfully saved disk image:', filePath, `(${buffer.length} bytes)`)
    return { success: true }
  } catch (error) {
    debug.log('❌ IPC: Error saving disk image:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('automation-event', async (event, details: { eventName?: string, payload?: unknown }) => {
  const eventName = String(details?.eventName || 'unknown')
  const payload = details?.payload
  if (eventName === 'disk-loaded' || eventName === 'state-loaded') {
    lastDiskLoadAckAt = Date.now()
  }
  try {
    console.log(`[AUTOMATION] ${eventName}`, payload ? JSON.stringify(payload) : '')
  } catch {
    console.log(`[AUTOMATION] ${eventName}`)
  }
  return { ok: true }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set up the application menu
  const appName = config.name || 'Apple2TS'
  
  // Common menu items to avoid duplication
  const aboutMenuItem: Electron.MenuItemConstructorOptions = { 
    label: `About ${appName}`,
    click: () => {
      createAboutWindow(mainWindow, config)
    }
  }
  
  const reloadMenuItem: Electron.MenuItemConstructorOptions = { 
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click: () => {
      mainWindow?.reload()
    }
  }
  
  const gameModeMenuItem: Electron.MenuItemConstructorOptions = { 
    label: 'Game Mode',
    type: 'checkbox',
    // @ts-expect-error - electron-store typing issue  
    checked: store.get('gameMode', false),
    click: (menuItem) => {
      const isChecked = menuItem.checked
      // @ts-expect-error - electron-store typing issue  
      store.set('gameMode', isChecked)
      sendParameters({ appMode: isChecked ? 'game' : '' })
    }
  }
  
  const devToolsMenuItem: Electron.MenuItemConstructorOptions = { 
    label: 'Toggle Developer Tools',
    accelerator: 'F12',
    click: () => {
      mainWindow?.webContents.toggleDevTools()
    }
  }
  
  const checkUpdatesMenuItem: Electron.MenuItemConstructorOptions = { 
    label: 'Check for Updates...',
    click: () => {
      checkForUpdates(true)
    }
  }
  
  const reportIssueMenuItem: Electron.MenuItemConstructorOptions = { 
    label: 'Report an Issue...',
    click: () => {
      shell.openExternal('https://github.com/ct6502/apple2ts-app/issues')
    }
  }
  
  const editMenu: Electron.MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
    ]
  }
  
  if (process.platform === 'darwin') {
    // macOS menu
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: appName,
        submenu: [
          aboutMenuItem,
          { type: 'separator' },
          reloadMenuItem,
          gameModeMenuItem,
          { type: 'separator' },
          devToolsMenuItem,
          { type: 'separator' },
          checkUpdatesMenuItem,
          { type: 'separator' },
          { label: `Hide ${appName}`, accelerator: 'Command+H', role: 'hide' },
          { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideOthers' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          { 
            label: `Quit ${appName}`, 
            accelerator: 'Command+Q', 
            click: () => {
              app.quit()
            }
          }
        ]
      },
      editMenu,
      {
        label: 'View',
        submenu: [
          { label: 'Zoom In', accelerator: 'CommandOrControl+=', role: 'zoomIn' },
          { label: 'Zoom Out', accelerator: 'CommandOrControl+-', role: 'zoomOut' },
          { label: 'Reset Zoom', accelerator: 'CommandOrControl+0', role: 'resetZoom' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          reportIssueMenuItem
        ]
      }
    ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  } else {
    // Windows/Linux menu
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          reloadMenuItem,
          { type: 'separator' },
          { 
            label: 'Exit',
            accelerator: 'Alt+F4',
            click: () => {
              app.quit()
            }
          }
        ]
      },
      editMenu,
      {
        label: 'View',
        submenu: [
          gameModeMenuItem,
          { type: 'separator' },
          { label: 'Zoom In', accelerator: 'CommandOrControl+=', role: 'zoomIn' },
          { label: 'Zoom Out', accelerator: 'CommandOrControl+-', role: 'zoomOut' },
          { label: 'Reset Zoom', accelerator: 'CommandOrControl+0', role: 'resetZoom' },
          { type: 'separator' },
          devToolsMenuItem
        ]
      },
      {
        label: 'Help',
        submenu: [
          checkUpdatesMenuItem,
          { type: 'separator' },
          reportIssueMenuItem,
          { type: 'separator' },
          aboutMenuItem
        ]
      }
    ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }
  
  if (noSplashMode) {
    createWindow()
  } else {
    // Show splash screen first
    createSplashWindow(config)

    // Create main window after a short delay (gives splash time to appear)
    setTimeout(() => {
      createWindow()
    }, 100)
  }

  // Check for updates after app starts (only in production)
  if (app.isPackaged) {
    // Wait 3 seconds after app starts to check for updates
    setTimeout(() => {
      checkForUpdates(false)
    }, 3000)
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!noSplashMode) {
      createSplashWindow(config)
    }
    setTimeout(() => {
      createWindow()
    }, 100)
  }
})

const supportedExtensions = ['.a2ts', '.woz', '.dsk', '.do', '.2mg', '.hdv', '.po']

// Handle file opening on macOS (when user double-clicks a file)
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  debug.log('open-file event received:', filePath)
  
  // Verify it's a supported file type
  const ext = path.extname(filePath).toLowerCase()
  
  if (supportedExtensions.includes(ext)) {
    loadDiskImage(filePath)
  } else {
    debug.log('Unsupported file type:', ext)
  }
})

// Handle file opening and parameters via command line arguments (all platforms)
// Check if a file or parameters were passed on startup
const args = process.argv.slice(app.isPackaged ? 1 : 2)
// Filter out flags like --debug
const nonFlagArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'))

// Collect parameters (key=value pairs) and file paths
const cmdLineParams: Record<string, string> = {}
let cmdLineFilePath: string | null = null

nonFlagArgs.forEach(arg => {
  // Check if it's a key=value parameter
  if (arg.includes('=')) {
    const [key, value] = arg.split('=', 2)
    if (key.toLowerCase() === "text" || key.toLowerCase() === "basic") {
      // Decode URI component for text/basic parameters
      cmdLineParams[key] = decodeURIComponent(value)
    } else {
      cmdLineParams[key] = value
    }
    debug.log('📋 Command line parameter:', key, '=', value)
  } else {
    // It's potentially a file path
    let filePath = arg.replace(/\\ /g, ' ') // Remove escaped spaces
    filePath = path.resolve(filePath) // Resolve to absolute path
    const ext = path.extname(filePath).toLowerCase()
    
    if (supportedExtensions.includes(ext) && fs.existsSync(filePath)) {
      debug.log('✅ File passed as argument:', filePath)
      cmdLineFilePath = filePath
    } else {
      debug.log('📋 Treating as URL fragment (disk name or URL):', arg)
      // Pass as fragment - could be a disk name from collections or a URL
      pendingFragment = arg
    }
  }
})

// Store file for later loading
if (cmdLineFilePath) {
  pendingFileToOpen = cmdLineFilePath
}

// Store parameters to send after window loads
if (Object.keys(cmdLineParams).length > 0) {
  debug.log('📋 Parameters to send after load:', cmdLineParams)
  pendingParameters = cmdLineParams
}

// Handle second-instance for Windows/Linux (when app is already running)
if (!allowMultiInstance) {
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine) => {
      debug.log('second-instance event received')
      
      // Someone tried to run a second instance, focus our window
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        
        // Check if a file was passed
        const args = commandLine.slice(app.isPackaged ? 1 : 2)
        // Filter out flags to find the actual file path
        const fileArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'))
        if (fileArgs.length > 0) {
          const filePath = fileArgs[0]
          const ext = path.extname(filePath).toLowerCase()
          
          if (supportedExtensions.includes(ext) && fs.existsSync(filePath)) {
            debug.log('Loading file from second instance:', filePath)
            loadDiskImage(filePath)
          }
        }
      }
    })
  }
} else {
  debug.log('Multi-instance mode enabled; skipping single-instance lock')
}
