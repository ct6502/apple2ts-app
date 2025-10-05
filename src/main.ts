import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load Apple2TS files
  const apple2tsDistPath = path.join(__dirname, '../../apple2ts-dist/dist/index.html');
  const apple2tsSourcePath = path.join(__dirname, '../../apple2ts-dist/index.html');
  
  // Check for files in priority order: built -> source
  let apple2tsPath: string | null = null;
  if (fs.existsSync(apple2tsDistPath)) {
    apple2tsPath = apple2tsDistPath;
    console.log('Loading Apple2TS from built files:', apple2tsPath);
  } else if (fs.existsSync(apple2tsSourcePath)) {
    apple2tsPath = apple2tsSourcePath;
    console.log('Loading Apple2TS from source files:', apple2tsPath);
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
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
