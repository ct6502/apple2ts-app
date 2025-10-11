import { app, BrowserWindow, screen, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Set app name FIRST, before any other app operations
app.setName('Apple2TS');

// Note: Auto-updater functionality removed to reduce bundle size

// Set dock icon for development (macOS)
if (process.platform === 'darwin') {
  const dockIconPath = path.join(__dirname, '../../assets/apple2ts.png');
  if (fs.existsSync(dockIconPath)) {
    app.dock.setIcon(dockIconPath);
  }
}

let splashWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let splashStartTime = 0;
const SPLASH_MIN_DURATION = 4000; // 4 seconds minimum

const createSplashWindow = () => {
  splashStartTime = Date.now(); // Record when splash starts
  
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
  });

  // Create a splash screen that displays a JPEG image
  let splashImagePath: string;
  
  if (app.isPackaged) {
    // In packaged app, assets should be in the resources directory
    splashImagePath = path.join(process.resourcesPath, 'assets', 'splash.jpg');
  } else {
    // In development, __dirname points to .vite/build, so we need to go up more levels
    splashImagePath = path.join(__dirname, '../../assets/splash.jpg');
  }
  
  const imageExists = fs.existsSync(splashImagePath);
  
  // Load the splash screen
  if (imageExists) {
    try {
      // Read the image file and convert to base64
      const imageBuffer = fs.readFileSync(splashImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      const imageDataURL = `data:image/jpeg;base64,${imageBase64}`;
      
      const imageHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              overflow: hidden;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          </style>
        </head>
        <body>
          <img src="${imageDataURL}" alt="Apple2TS Splash" />
        </body>
        </html>
      `;
      
      splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(imageHTML)}`);
    } catch (error) {
      console.log('❌ Error loading splash image:', error);
      // Fall back to text splash
      const fallbackHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              overflow: hidden;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
            }
            .title {
              font-size: 32px;
              font-weight: 600;
              margin-bottom: 10px;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            }
            .subtitle {
              font-size: 18px;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="title">🍎 Apple2TS</div>
          <div class="subtitle">Apple II Emulator</div>
        </body>
        </html>
      `;
      
      splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHTML)}`);
    }
  } else {
    console.log('❌ Image not found, using fallback');
    // Use the fallback HTML
    const fallbackHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
          }
          .title {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          }
          .subtitle {
            font-size: 18px;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="title">🍎 Apple2TS</div>
        <div class="subtitle">Apple II Emulator</div>
      </body>
      </html>
    `;
    
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHTML)}`);
  }
  
  // Center the splash window
  splashWindow.center();
  
  // Show splash window
  splashWindow.show();
};

const createWindow = () => {
  // Get the primary display's work area (excludes dock/taskbar)
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Use 95% of the screen size to leave some margin
  const windowWidth = Math.floor(width * 0.95);
  const windowHeight = Math.floor(height * 0.95);
  
  // Create the browser window (initially hidden)
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    title: 'Apple2TS',
    icon: path.join(__dirname, '../../assets/apple2ts.png'), // Use PNG for development
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load Apple2TS files
  // After cleanup, apple2ts-dist only contains the dist folder
  let apple2tsPath: string;
  
  if (app.isPackaged) {
    // In packaged app, extraResource files are in the resources directory
    const resourcesPath = process.resourcesPath;
    apple2tsPath = path.join(resourcesPath, 'apple2ts-dist', 'dist', 'index.html');
  } else {
    // In development, files are relative to the project root
    apple2tsPath = path.join(__dirname, '../../apple2ts-dist/dist/index.html');
  }
  
  console.log('App packaged status:', app.isPackaged);
  console.log('Loading Apple2TS from:', apple2tsPath);
  
  if (!fs.existsSync(apple2tsPath)) {
    console.log('❌ Apple2TS dist files not found at:', apple2tsPath);
    if (app.isPackaged) {
      console.log('📦 In packaged mode - checking resources path:', process.resourcesPath);
      // List what's actually in the resources directory for debugging
      try {
        const resourceContents = fs.readdirSync(process.resourcesPath);
        console.log('📁 Resources directory contents:', resourceContents);
        const apple2tsDir = path.join(process.resourcesPath, 'apple2ts-dist');
        if (fs.existsSync(apple2tsDir)) {
          const apple2tsContents = fs.readdirSync(apple2tsDir);
          console.log('📁 apple2ts-dist contents:', apple2tsContents);
        }
      } catch (error) {
        console.log('❌ Error checking resources:', error);
      }
    }
    return;
  }
  console.log('✅ Apple2TS found, loading...');
  
  // Always load Apple2TS files when available, regardless of dev server
  console.log('Loading Apple2TS from file:', apple2tsPath);
  mainWindow.loadFile(apple2tsPath);

  // When the main window is ready to show, hide splash and show main window
  mainWindow.once('ready-to-show', () => {
    const elapsedTime = Date.now() - splashStartTime;
    const remainingTime = Math.max(0, SPLASH_MIN_DURATION - elapsedTime);
    
    // Wait for the remaining time to ensure splash shows for minimum duration
    setTimeout(() => {
      // Close splash window
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      
      // Show main window
      mainWindow?.show();
      
      // Focus the main window
      if (mainWindow) {
        mainWindow.focus();
      }
    }, remainingTime);
  });

  // Only open DevTools if explicitly in development mode
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  //   mainWindow.webContents.openDevTools();
  // }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set up the application menu for macOS
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Apple2TS',
        submenu: [
          { label: 'About Apple2TS', role: 'about' },
          { type: 'separator' },
          { label: 'Hide Apple2TS', accelerator: 'Command+H', role: 'hide' },
          { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideOthers' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          { 
            label: 'Quit Apple2TS', 
            accelerator: 'Command+Q', 
            click: () => {
              app.quit();
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
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
  
  // Show splash screen first
  createSplashWindow();
  
  // Create main window after a short delay (gives splash time to appear)
  setTimeout(() => {
    createWindow();
  }, 100);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
    setTimeout(() => {
      createWindow();
    }, 100);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
