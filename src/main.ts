import { app, BrowserWindow, screen, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createAboutWindow } from './about'
import { createSplashWindow, handleSplashCompletion } from './splash'
import { loadConfig, getAssetPath, getDiskImagePath } from './config'
import { debug } from './debug'

// Load configuration first
const config = loadConfig()

// Set app name from config
app.setName(config.name || 'Apple2TS')

// Configure app for macOS keychain access
if (process.platform === 'darwin') {
  // Set a consistent app path for keychain access
  app.setPath('userData', path.join(app.getPath('appData'), config.name || 'Apple2TS'))
  
  // Disable keychain access for development to avoid errors
  if (!app.isPackaged) {
    app.commandLine.appendSwitch('use-fake-keychain')
  }
}

// Note: Auto-updater functionality removed to reduce bundle size

// Set dock icon for development (macOS) - use config-aware asset loading
if (process.platform === 'darwin') {
  const dockIconPath = getAssetPath(config, 'App.png') // Use App.png for dock icon
  if (fs.existsSync(dockIconPath)) {
    app.dock.setIcon(dockIconPath)
  }
}

let mainWindow: BrowserWindow | null = null



// Helper function to get current URL with parameters
const getCurrentURL = (): string | null => {
  return mainWindow?.webContents.getURL() || null
}

// Helper function to add URL parameters to Apple2TS
const addURLParameters = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url.toString()
}



// Helper function to navigate with parameters
const navigateWithParameters = (params: Record<string, string>) => {
  if (mainWindow) {
    const currentUrl = getCurrentURL()
    if (currentUrl) {
      const baseUrl = currentUrl.split('?')[0].split('#')[0]
      const currentFragment = currentUrl.includes('#') ? currentUrl.split('#')[1] : ''
      
      // Add parameters as URL parameters and preserve fragment
      const newUrl = addURLParameters(baseUrl, params)
      const finalUrl = currentFragment ? `${newUrl}#${currentFragment}` : newUrl
      debug.log('Navigating with parameters to:', finalUrl)
      debug.log('📱 Final URL being sent to Apple2TS emulator:', finalUrl)
      mainWindow.loadURL(finalUrl)
    }
  }
}



const createWindow = () => {
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox for compatibility
      webSecurity: false, // Allow local file access
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
    // In development, files are relative to the project root
    apple2tsPath = path.join(__dirname, '../../apple2ts-dist/dist/index.html')
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
  const urlToLoad = apple2tsUrl.toString()
  debug.log('📱 Final URL being sent to Apple2TS emulator:', urlToLoad)
  
  // Wait for splash to complete before loading emulator
  handleSplashCompletion(() => {
    mainWindow?.loadURL(urlToLoad)
    
    // Show and focus window once emulator loads
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.show()
      mainWindow?.focus()
    })
  })

  // Only open DevTools if explicitly in development mode
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  //   mainWindow.webContents.openDevTools()
  // }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set up the application menu for macOS
  if (process.platform === 'darwin') {
    const appName = config.name || 'Apple2TS'
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: appName,
        submenu: [
          { 
            label: `About ${appName}`,
            click: () => {
              createAboutWindow(mainWindow, config)
            }
          },
          { type: 'separator' },
          { 
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              mainWindow?.reload()
            }
          },
          { 
            label: 'Game Mode',
            type: 'checkbox',
            checked: true,
            click: (menuItem) => {
              const isChecked = menuItem.checked
              navigateWithParameters({ appMode: isChecked ? 'game' : '' })
            }
          },
          // { 
          //   label: 'Clear Fragment',
          //   click: () => {
          //     const currentUrl = getCurrentURL()
          //     if (currentUrl) {
          //       const baseUrl = currentUrl.split('#')[0]
          //       mainWindow?.loadURL(baseUrl)
          //     }
          //   }
          // },
          // { 
          //   label: 'Reset Parameters',
          //   click: () => {
          //     navigateWithParameters({})
          //   }
          // },
          { type: 'separator' },
          { 
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              mainWindow?.webContents.toggleDevTools()
            }
          },
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
      {
        label: 'Edit',
        submenu: [
          { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
          { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
        ]
      }
    ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }
  
  // Show splash screen first
  createSplashWindow(config)
  
  // Create main window after a short delay (gives splash time to appear)
  setTimeout(() => {
    createWindow()
  }, 100)

  // if (app.isPackaged && process.platform === 'darwin') {
  //   // Show debug dialog with disk image search directory
  //   const containingDir = path.join(process.execPath, '../../../..')
  //   const diskImagePattern = config.diskImage || '(none)'
  //   let files = []
  //   let matchResult = '(no match)'
  //   let errorMsg = ''
  //   try {
  //     files = fs.readdirSync(containingDir)
  //     // Use same regex logic as in config.ts
  //     const regexPattern = diskImagePattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  //     const regex = new RegExp(`^${regexPattern}$`, 'i')
  //     const matchingFile = files.find(file => regex.test(file))
  //     if (matchingFile) {
  //       matchResult = matchingFile
  //     }
  //   } catch (e) {
  //     files = ['(error reading directory)']
  //     errorMsg = String(e)
  //   }
  //   dialog.showMessageBox({
  //     type: 'info',
  //     title: 'Debug: Disk Image Search',
  //     message:
  //       `Disk image search directory:\n${containingDir}\n\n` +
  //       `Disk image pattern from config:\n${diskImagePattern}\n\n` +
  //       `Files in directory:\n${files.join('\n')}\n\n` +
  //       (errorMsg ? `Error: ${errorMsg}\n\n` : '') +
  //       `Regex match result:\n${matchResult}`
  //   })
  // }
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
    createSplashWindow(config)
    setTimeout(() => {
      createWindow()
    }, 100)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
