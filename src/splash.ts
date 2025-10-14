import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Apple2TSConfig } from './config'

// Splash window state
let splashWindow: BrowserWindow | null = null
let splashStartTime = 0

// Constants
const SPLASH_MIN_DURATION = 4000 // 4 seconds minimum

// Helper function to load fallback splash
const loadFallbackSplash = () => {
  if (!splashWindow) return
  
  // Load CSS content for fallback
  let splashCSSPath: string
  if (app.isPackaged) {
    splashCSSPath = path.join(process.resourcesPath, 'src', 'splash.css')
  } else {
    splashCSSPath = path.join(__dirname, '../../src/splash.css')
  }
  
  let splashCSS = ''
  try {
    if (fs.existsSync(splashCSSPath)) {
      splashCSS = fs.readFileSync(splashCSSPath, 'utf8')
    }
  } catch (error) {
    console.log('Could not load splash CSS for fallback:', error)
  }
  
  const fallbackHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${splashCSS}
      </style>
    </head>
    <body class="splash-fallback">
      <div class="title">🍎 Apple2TS</div>
      <div class="subtitle">Apple II Emulator</div>
    </body>
    </html>
  `
  
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHTML)}`)
}

// Helper function to create splash window
export const createSplashWindow = (config?: Apple2TSConfig) => {
  splashStartTime = Date.now() // Record when splash starts
  
  splashWindow = new BrowserWindow({
    width: 616,
    height: 353,
    frame: false,
    alwaysOnTop: true,
    transparent: false, // Make it solid, not transparent
    resizable: false,
    modal: true, // Make it modal to ensure it's visible
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Create a splash screen that displays a JPEG image
  
  // Use config-aware asset loading for splash image
  let splashImagePath: string
  
  if (config && config.name && config.name !== 'Apple2TS') {
    // Look for custom game splash next to config file
    if (app.isPackaged) {
      // In packaged app, look next to the executable
      if (process.platform === 'darwin') {
        // On macOS, go up from Apple2TS.app/Contents/MacOS/Apple2TS to find splash next to .app
        splashImagePath = path.join(process.execPath, '../../../../splash.jpg')
      } else if (process.platform === 'win32') {
        // On Windows, look next to the .exe file
        splashImagePath = path.join(path.dirname(process.execPath), 'splash.jpg')
      } else {
        // On Linux, look next to the executable
        splashImagePath = path.join(path.dirname(process.execPath), 'splash.jpg')
      }
    } else {
      // In development, look in the project root (next to where config would be)
      splashImagePath = path.join(__dirname, '../../splash.jpg')
    }
    
    // If custom splash doesn't exist, fall back to default
    if (!fs.existsSync(splashImagePath)) {
      splashImagePath = app.isPackaged 
        ? path.join(process.resourcesPath, 'assets', 'splash.jpg')
        : path.join(__dirname, '../../assets/splash.jpg')
    }
  } else {
    // Use default Apple2TS splash
    splashImagePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'assets', 'splash.jpg')
      : path.join(__dirname, '../../assets/splash.jpg')
  }
  
  const splashCSSPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'src', 'splash.css')
    : path.join(__dirname, '../../src/splash.css')
  
  const imageExists = fs.existsSync(splashImagePath)
  
  // Load CSS content
  let splashCSS = ''
  try {
    if (fs.existsSync(splashCSSPath)) {
      splashCSS = fs.readFileSync(splashCSSPath, 'utf8')
    }
  } catch (error) {
    console.log('Could not load splash CSS:', error)
  }
  
  // Load the splash screen
  if (imageExists) {
    try {
      // Read the image file and convert to base64
      const imageBuffer = fs.readFileSync(splashImagePath)
      const imageBase64 = imageBuffer.toString('base64')
      const imageDataURL = `data:image/jpeg;base64,${imageBase64}`
      
      const imageHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            ${splashCSS}
          </style>
        </head>
        <body class="splash-image">
          <img src="${imageDataURL}" alt="Apple2TS Splash" />
        </body>
        </html>
      `
      
      splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(imageHTML)}`)
    } catch (error) {
      console.log('❌ Error loading splash image:', error)
      // Fall back to text splash
      loadFallbackSplash()
    }
  } else {
    console.log('❌ Image not found, using fallback')
    loadFallbackSplash()
  }
  
  // Center the splash window
  splashWindow.center()
  
  // Show splash window
  splashWindow.show()
}

// Helper function to handle splash completion and main window showing
export const handleSplashCompletion = (showMainWindow: () => void) => {
  const elapsedTime = Date.now() - splashStartTime
  const remainingTime = Math.max(0, SPLASH_MIN_DURATION - elapsedTime)
  
  // Wait for the remaining time to ensure splash shows for minimum duration
  setTimeout(() => {
    // Close splash window
    if (splashWindow) {
      splashWindow.close()
      splashWindow = null
    }
    
    // Show main window
    showMainWindow()
  }, remainingTime)
}

// Getter for splash window (for external access if needed)
export const getSplashWindow = () => splashWindow