import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

// Splash window state
let splashWindow: BrowserWindow | null = null
let splashStartTime = 0

// Constants
const SPLASH_MIN_DURATION = 4000 // 4 seconds minimum

// Helper function to create splash window
export const createSplashWindow = () => {
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
  let splashImagePath: string
  let splashCSSPath: string
  
  if (app.isPackaged) {
    // In packaged app, assets should be in the resources directory
    splashImagePath = path.join(process.resourcesPath, 'assets', 'splash.jpg')
    splashCSSPath = path.join(process.resourcesPath, 'src', 'splash.css')
  } else {
    // In development, __dirname points to .vite/build, so we need to go up more levels
    splashImagePath = path.join(__dirname, '../../assets/splash.jpg')
    splashCSSPath = path.join(__dirname, '../../src/splash.css')
  }
  
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