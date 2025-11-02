import { BrowserWindow } from 'electron'
import fs from 'node:fs'
import { Apple2TSConfig, getAssetPath } from './config'
import { debug } from './debug'

// Splash window state
let splashWindow: BrowserWindow | null = null
let splashStartTime = 0

// Constants
const SPLASH_MIN_DURATION = 3000 // milliseconds minimum

// Helper function to create splash window
export const createSplashWindow = (config?: Apple2TSConfig) => {
  splashStartTime = Date.now() // Record when splash starts
  
  splashWindow = new BrowserWindow({
    width: 630,  // Slightly wider to account for potential scrollbar space
    height: 365, // Slightly taller to account for potential scrollbar space
    frame: false,
    alwaysOnTop: true,
    transparent: false, // Make it solid, not transparent
    resizable: false,
    modal: true, // Make it modal to ensure it's visible
    useContentSize: false, // Try without content size to see if that helps
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow any content
    },
  })
  
  // Embed CSS directly instead of loading from file
  const splashCSS = `
    /* Reset all margins and padding, hide scroll bars */
    html,
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
    /* Splash screen styles for the main image display */
    .splash-image {
      margin: 0;
      padding: 0;
      background: #ccc;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      box-sizing: border-box;
      border-radius: 10px;
    }
    .splash-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 10px;
    }
  `
  
  // Use config-aware asset loading for splash image
  const splashImagePath = getAssetPath(config, 'splash.jpg')

  // Load the splash screen
  if (fs.existsSync(splashImagePath)) {
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
      debug.log('❌ Error loading splash image:', error)
    }
  } else {
    debug.log('❌ Splash image not found')
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