import { app, BrowserWindow, screen, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Set app name FIRST, before any other app operations
app.setName('Apple2TS');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Set dock icon for development (macOS)
if (process.platform === 'darwin') {
  const dockIconPath = path.join(__dirname, '../../assets/apple2ts.png');
  if (fs.existsSync(dockIconPath)) {
    app.dock.setIcon(dockIconPath);
  }
}

const createWindow = () => {
  // Get the primary display's work area (excludes dock/taskbar)
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Use 95% of the screen size to leave some margin
  const windowWidth = Math.floor(width * 0.95);
  const windowHeight = Math.floor(height * 0.95);
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    title: 'Apple2TS',
    icon: path.join(__dirname, '../../assets/apple2ts.png'), // Use PNG for development
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
  
  createWindow();
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
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
