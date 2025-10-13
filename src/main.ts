import { app, BrowserWindow, screen, Menu, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { createAboutWindow } from './about';
import { createSplashWindow, handleSplashCompletion } from './splash';

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

let mainWindow: BrowserWindow | null = null;

// Helper function to get current URL with parameters
const getCurrentURL = (): string | null => {
  return mainWindow?.webContents.getURL() || null;
};

// Helper function to add URL parameters to Apple2TS
const addURLParameters = (baseUrl: string, params: Record<string, string>): string => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

// Helper function to add URL fragment parameters
const addURLFragment = (baseUrl: string, diskPath: string): string => {
  const url = new URL(baseUrl);
  url.hash = diskPath;
  return url.toString();
};

// Helper function to navigate with parameters
const navigateWithParameters = (params: Record<string, string>) => {
  if (mainWindow) {
    const currentUrl = getCurrentURL();
    if (currentUrl) {
      const baseUrl = currentUrl.split('?')[0].split('#')[0];
      const currentFragment = currentUrl.includes('#') ? currentUrl.split('#')[1] : '';
      
      // Add parameters as URL parameters and preserve fragment
      const newUrl = addURLParameters(baseUrl, params);
      const finalUrl = currentFragment ? `${newUrl}#${currentFragment}` : newUrl;
      console.log('Navigating with parameters to:', finalUrl);
      mainWindow.loadURL(finalUrl);
    }
  }
};

// Helper function to load disk images
const loadDiskImage = (diskName: string) => {
  const diskPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'assets', diskName)
    : path.join(__dirname, '../../assets', diskName);
  
  if (fs.existsSync(diskPath)) {
    console.log('Loading disk image:', diskName, 'from:', diskPath);
    
    // Use disk path directly as fragment
    const currentUrl = getCurrentURL();
    if (currentUrl && mainWindow) {
      const baseUrl = currentUrl.split('?')[0].split('#')[0];
      const newUrl = addURLFragment(baseUrl, diskPath);
      console.log('Loading with fragment:', newUrl);
      mainWindow.loadURL(newUrl);
    }
  } else {
    console.error('Disk image not found:', diskPath);
  }
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
      webSecurity: false, // Allow local file access
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
  
  // Always load Apple2TS files when available, with URL parameters
  console.log('Loading Apple2TS from file:', apple2tsPath);
  
  // Convert file path to file:// URL and add parameters
  const apple2tsUrl = new URL(`file://${apple2tsPath}`);
  
  // Add default color parameter
  // apple2tsUrl.searchParams.set('color', 'green');
  
  // Load Nox Archaist using URL fragment (hash)
  // const noxDiskPath = app.isPackaged 
  //   ? path.join(process.resourcesPath, 'assets', 'NoxArchaist_v137.hdv')
  //   : path.join(__dirname, '../../assets/NoxArchaist_v137.hdv');
  
  // if (fs.existsSync(noxDiskPath)) {
  //   // Use URL fragment with just the disk path (no encoding)
  //   apple2tsUrl.hash = noxDiskPath;
  //   console.log('Loading with Nox Archaist disk image via fragment');
  // }
  
  console.log('Loading Apple2TS URL:', apple2tsUrl.toString());
  mainWindow.loadURL(apple2tsUrl.toString());

  // When the main window is ready to show, hide splash and show main window
  mainWindow.once('ready-to-show', () => {
    handleSplashCompletion(() => {
      // Show main window
      mainWindow?.show();
      
      // Focus the main window
      if (mainWindow) {
        mainWindow.focus();
      }
    });
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
          { 
            label: 'About Apple2TS',
            click: () => {
              createAboutWindow(mainWindow);
            }
          },
          { type: 'separator' },
          { 
            label: 'Reload',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              mainWindow?.reload();
            }
          },
          { 
            label: 'Load with Green Screen',
            click: () => {
              navigateWithParameters({ color: 'green' });
            }
          },
          { 
            label: 'Load Nox Archaist',
            click: () => {
              loadDiskImage('NoxArchaist_v137.hdv');
            }
          },
          { 
            label: 'Clear Fragment',
            click: () => {
              const currentUrl = getCurrentURL();
              if (currentUrl) {
                const baseUrl = currentUrl.split('#')[0];
                mainWindow?.loadURL(baseUrl);
              }
            }
          },
          { 
            label: 'Reset Parameters',
            click: () => {
              navigateWithParameters({});
            }
          },
          { type: 'separator' },
          { 
            label: 'Toggle Developer Tools',
            accelerator: 'F12',
            click: () => {
              mainWindow?.webContents.toggleDevTools();
            }
          },
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
