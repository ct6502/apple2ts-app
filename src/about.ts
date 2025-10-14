import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Apple2TSConfig } from './config'

// Helper function to create custom About dialog
export const createAboutWindow = (parentWindow?: BrowserWindow | null, config?: Apple2TSConfig) => {
  const aboutWindow = new BrowserWindow({
    width: 520,
    height: 680,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: parentWindow || undefined,
    backgroundColor: '#212121',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Get package.json version
  const packagePath = path.join(__dirname, '../../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  const appVersion = packageJson.version

  // Get Apple2TS build information (if available)
  let apple2tsBuildDate = 'Unknown'
  
  // Get image paths and load as base64 for embedding
  let appIconDataURL = ''
  let appTitleDataURL = ''
  
  // Use config-aware asset loading
  let appIconPath: string
  let appTitlePath: string
  
  if (config && config.name && config.name !== 'Apple2TS') {
    // Look for custom game assets next to config file
    if (app.isPackaged) {
      // In packaged app, look next to the executable
      if (process.platform === 'darwin') {
        // On macOS, go up from Apple2TS.app/Contents/MacOS/Apple2TS to find assets next to .app
        appIconPath = path.join(process.execPath, '../../../../about-icon.png')
        appTitlePath = path.join(process.execPath, '../../../../about-name.png')
      } else if (process.platform === 'win32') {
        // On Windows, look next to the .exe file
        appIconPath = path.join(path.dirname(process.execPath), 'about-icon.png')
        appTitlePath = path.join(path.dirname(process.execPath), 'about-name.png')
      } else {
        // On Linux, look next to the executable
        appIconPath = path.join(path.dirname(process.execPath), 'about-icon.png')
        appTitlePath = path.join(path.dirname(process.execPath), 'about-name.png')
      }
    } else {
      // In development, look in the project root (next to where config would be)
      appIconPath = path.join(__dirname, '../../about-icon.png')
      appTitlePath = path.join(__dirname, '../../about-name.png')
    }
    
    // If custom assets don't exist, fall back to default
    if (!fs.existsSync(appIconPath)) {
      appIconPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'assets', 'apple2ts-about_icon.png')
        : path.join(__dirname, '../../assets/apple2ts-about_icon.png')
    }
    
    if (!fs.existsSync(appTitlePath)) {
      appTitlePath = app.isPackaged 
        ? path.join(process.resourcesPath, 'assets', 'apple2ts-name.png') 
        : path.join(__dirname, '../../assets/apple2ts-name.png')
    }
  } else {
    // Use default Apple2TS assets
    appIconPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'assets', 'apple2ts-about_icon.png')
      : path.join(__dirname, '../../assets/apple2ts-about_icon.png')
    
    appTitlePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'assets', 'apple2ts-name.png') 
      : path.join(__dirname, '../../assets/apple2ts-name.png')
  }

  // Load images as base64
  try {
    if (fs.existsSync(appIconPath)) {
      const iconBuffer = fs.readFileSync(appIconPath)
      const iconBase64 = iconBuffer.toString('base64')
      appIconDataURL = `data:image/png;base64,${iconBase64}`
    }
  } catch (error) {
    console.log('Could not load app icon:', error)
  }

  try {
    if (fs.existsSync(appTitlePath)) {
      const titleBuffer = fs.readFileSync(appTitlePath)
      const titleBase64 = titleBuffer.toString('base64')
      appTitleDataURL = `data:image/png;base64,${titleBase64}`
    }
  } catch (error) {
    console.log('Could not load app title image:', error)
  }

  try {
    const apple2tsPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'apple2ts-dist', 'dist')
      : path.join(__dirname, '../../apple2ts-dist/dist')
    
    // Try to get build info from Apple2TS files
    const apple2tsIndexPath = path.join(apple2tsPath, 'index.html')
    if (fs.existsSync(apple2tsIndexPath)) {
      const stats = fs.statSync(apple2tsIndexPath)
      apple2tsBuildDate = stats.mtime.toLocaleDateString()
    }
  } catch (error) {
    console.log('Could not get Apple2TS build info:', error)
  }

  // Load CSS content
  let aboutCSSPath: string
  if (app.isPackaged) {
    aboutCSSPath = path.join(process.resourcesPath, 'src', 'about.css')
  } else {
    // In development, go from .vite/build back to src
    aboutCSSPath = path.join(__dirname, '../../src/about.css')
  }
  
  let aboutCSS = ''
  try {
    if (fs.existsSync(aboutCSSPath)) {
      aboutCSS = fs.readFileSync(aboutCSSPath, 'utf8')
    }
  } catch (error) {
    console.log('Could not load about CSS:', error)
  }

  // Generate content based on whether we have custom about info
  let contentHTML = ''
  
  if (config && config.about) {
    // Use custom about content from config
    contentHTML = `
      <div class="app-subtitle">${config.about.subtitle || 'Game'}</div>
      
      ${config.about.description ? `<div class="game-description">${config.about.description}</div>` : ''}
      
      <div class="version-info">
        ${config.about.version ? `
          <div class="version-row">
            <span class="version-label">Game Version:</span>
            <span class="version-value">${config.about.version}</span>
          </div>
        ` : ''}
        ${config.about.author ? `
          <div class="version-row">
            <span class="version-label">Author:</span>
            <span class="version-value">${config.about.author}</span>
          </div>
        ` : ''}
        <div class="version-row">
          <span class="version-label">App Version:</span>
          <span class="version-value">v${appVersion}</span>
        </div>
      </div>

      <div class="links">
        ${config.about.website ? `
          <a href="${config.about.website}" class="link">
            🌐 Game Website
          </a>
        ` : ''}
        ${config.about.repository ? `
          <a href="${config.about.repository}" class="link">
            📁 Game Repository
          </a>
        ` : ''}
        <a href="https://github.com/ct6502/apple2ts-app" class="link">
          📱 Apple2TS App
        </a>
      </div>
    `
  } else {
    // Use default Apple2TS about content
    contentHTML = `
      <div class="app-subtitle">Apple II Emulator for Desktop</div>
      
      <div class="version-info">
        <div class="version-row">
          <span class="version-label">App Version:</span>
          <span class="version-value">v${appVersion}</span>
        </div>
        <div class="version-row">
          <span class="version-label">Apple2TS Build:</span>
          <span class="version-value">${apple2tsBuildDate}</span>
        </div>
        <div class="version-row">
          <span class="version-label">Platform:</span>
          <span class="version-value">${process.platform} ${process.arch}</span>
        </div>
        <div class="version-row">
          <span class="version-label">Electron:</span>
          <span class="version-value">${process.versions.electron}</span>
        </div>
        <div class="version-row">
          <span class="version-label">Node.js:</span>
          <span class="version-value">${process.versions.node}</span>
        </div>
      </div>

      <div class="links">
        <a href="https://github.com/ct6502/apple2ts-app" class="link">
          📱 Apple2TS App Repository
        </a>
        <a href="https://github.com/ct6502/apple2ts" class="link">
          💻 Apple2TS Emulator Repository  
        </a>
        <a href="https://github.com/ct6502/apple2ts-app/releases" class="link">
          📦 Download Latest Release
        </a>
      </div>

      <div class="copyright">
        © 2025 CT6502
      </div>
    `
  }

  const aboutHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${aboutCSS}
      </style>
    </head>
    <body>
      <div class="app-icon">
        ${appIconDataURL ? `<img src="${appIconDataURL}" alt="Apple2TS Icon" />` : '🍎'}
      </div>
      <div class="app-title">
        ${appTitleDataURL ? `<img src="${appTitleDataURL}" alt="apple2ts" />` : '<span style="font-size: 28px; font-weight: 600;">apple2ts</span>'}
      </div>
      
      ${contentHTML}
    </body>
    </html>
  `

  console.log('About HTML length:', aboutHTML.length)
  console.log('App icon loaded:', !!appIconDataURL)
  console.log('App title loaded:', !!appTitleDataURL)
  
  // Use data URL approach with smaller images
  aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutHTML)}`)
  
  // Debug: check for load errors
  aboutWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('About window failed to load:', errorCode, errorDescription)
  })
  
  aboutWindow.webContents.once('did-finish-load', () => {
    console.log('About window loaded successfully')
  })
  
  // Handle external link opening using webContents navigation events
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Handle links that try to navigate the window
  aboutWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })

  // Auto-close when window loses focus (clicked outside)
  aboutWindow.on('blur', () => {
    aboutWindow.close()
  })

  aboutWindow.setMenu(null)
  aboutWindow.show()
}