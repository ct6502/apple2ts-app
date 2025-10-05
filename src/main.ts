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
  // In development: apple2ts-dist is in the project root
  // In production: apple2ts-dist is in app.getPath('userData') or as extraResource
  let apple2tsDistPath: string;
  let apple2tsSourcePath: string;
  
  if (app.isPackaged) {
    // In packaged app, extraResource files are in the resources directory
    const resourcesPath = process.resourcesPath;
    apple2tsDistPath = path.join(resourcesPath, 'apple2ts-dist', 'dist', 'index.html');
    apple2tsSourcePath = path.join(resourcesPath, 'apple2ts-dist', 'index.html');
  } else {
    // In development, files are relative to the project root
    apple2tsDistPath = path.join(__dirname, '../../apple2ts-dist/dist/index.html');
    apple2tsSourcePath = path.join(__dirname, '../../apple2ts-dist/index.html');
  }
  
  // Check for files in priority order: built -> source
  let apple2tsPath: string | null = null;
  
  console.log('App packaged status:', app.isPackaged);
  console.log('Checking Apple2TS paths:');
  console.log('  Built path:', apple2tsDistPath);
  console.log('  Source path:', apple2tsSourcePath);
  
  if (fs.existsSync(apple2tsDistPath)) {
    apple2tsPath = apple2tsDistPath;
    console.log('✅ Loading Apple2TS from built files:', apple2tsPath);
  } else if (fs.existsSync(apple2tsSourcePath)) {
    apple2tsPath = apple2tsSourcePath;
    console.log('✅ Loading Apple2TS from source files:', apple2tsPath);
  } else {
    console.log('❌ Apple2TS files not found at either location');
    if (app.isPackaged) {
      console.log('📦 In packaged mode - checking resources path:', process.resourcesPath);
    }
  }
  
  if (apple2tsPath) {
    console.log('Loading Apple2TS from:', apple2tsPath);
    
    // Load the file directly
    mainWindow.loadFile(apple2tsPath);
  } else {
    console.error('Apple2TS files not found at any of:');
    console.error('  Built:', apple2tsDistPath);
    console.error('  Source:', apple2tsSourcePath);
    console.error('Please run: npm run download-apple2ts');
    
    // Fallback: in development use dev server, in production use default page
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      console.log('Falling back to development server');
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      console.log('Falling back to default page');
      mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      );
    }
  }

  // Only open DevTools if explicitly in development mode and Apple2TS failed to load
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL && !apple2tsPath) {
    mainWindow.webContents.openDevTools();
  }
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
