import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Detect if running in development by checking if we're in the unpacked/asar structure
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'SRPHS Grading App',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);

  if (isDev) {
    win.loadURL('http://127.0.0.1:3000');
  } else {
    // In packaged app, dist is one level up from electron/
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('__dirname:', __dirname);
    console.log('Loading file:', indexPath);
    win.loadFile(indexPath).catch(err => {
      console.error('Failed to load file:', err);
    });
  }

  // Open dev tools for debugging (remove in production if desired)
  if (process.env.DEBUG_ELECTRON === 'true') {
    win.webContents.openDevTools();
  }

  win.webContents.on('crashed', () => {
    console.error('Renderer process crashed');
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorCode, errorDescription);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
