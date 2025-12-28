import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { settingsManager } from './services/settings-manager';

let mainWindow: BrowserWindow | null = null;

const createWindow = async () => {
  await settingsManager.init();

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      sandbox: false,
      preload: (() => {
        const p = path.join(__dirname, '../preload/index.js');
        console.log('Preload path:', p);
        return p;
      })(),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Wait for ready-to-show
  });

  // Load renderer
  // In dev, load from vite server. In prod, load index.html.
  const isDev = !app.isPackaged;
  // We can pass process.env.VITE_DEV_SERVER_URL via script if needed, 
  // but for concurrent running, localhost:5173 is standard.
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  registerIpcHandlers(mainWindow);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
