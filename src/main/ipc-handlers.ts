import { ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { IpcChannels } from '../constants/ipc-channels';
import { settingsManager } from './services/settings-manager';
import { ytDlpManager } from './yt-dlp-manager';
// import { YtFormat } from '../types/yt-dlp'; // removed

export const registerIpcHandlers = (mainWindow: Electron.BrowserWindow) => {

  // Settings
  ipcMain.handle(IpcChannels.GET_SETTINGS, () => {
    return settingsManager.getSettings();
  });

  ipcMain.handle(IpcChannels.SET_SETTINGS, async (_, settings) => {
    return await settingsManager.saveSettings(settings);
  });

  ipcMain.handle(IpcChannels.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.on(IpcChannels.OPEN_EXTERNAL, async (_, url) => {
    try {
      if (url.startsWith('http')) {
        await shell.openExternal(url);
      } else {
        // Handle file:// prefix if present
        const cleanPath = url.replace('file://', '');
        const error = await shell.openPath(cleanPath);
        if (error) {
          console.error('Failed to open path:', cleanPath, error);
        }
      }
    } catch (e) {
      console.error('Error opening external:', e);
    }
  });

  ipcMain.handle(IpcChannels.CHECK_DEPENDENCIES, async () => {
    return await ytDlpManager.checkBinary();
  });

  ipcMain.handle(IpcChannels.GET_VIDEO_INFO, async (_, url) => {
    return await ytDlpManager.getInfo(url);
  });

  // Downloads
  ipcMain.on(IpcChannels.START_DOWNLOAD, async (_, { url, id, format_id, outputTemplate: userTemplate }) => {
    const settings = settingsManager.getSettings();
    // Use user provided template or default to setting path
    const outputTemplate = userTemplate || path.join(settings.downloadPath, '%(title)s.%(ext)s');

    // Trigger start event
    mainWindow.webContents.send(IpcChannels.DOWNLOAD_START, { id, url });

    try {
      await ytDlpManager.startDownload(id, {
        url,
        format_id: format_id || 'best',
        outputTemplate,
      });
    } catch (e: any) {
      mainWindow.webContents.send(IpcChannels.DOWNLOAD_ERROR, { id, message: e.message });
    }
  });

  ipcMain.on(IpcChannels.CANCEL_DOWNLOAD, (_, id) => {
    ytDlpManager.cancelDownload(id);
  });

  // Wire up YtDlpManager events to WebContents
  ytDlpManager.on('progress', (id, progress) => {
    // Add id to progress object
    mainWindow.webContents.send(IpcChannels.DOWNLOAD_PROGRESS, { id, ...progress });
  });

  ytDlpManager.on('complete', (id, filePath) => {
    mainWindow.webContents.send(IpcChannels.DOWNLOAD_COMPLETE, { id, filePath });
  });

  ytDlpManager.on('error', (id, message) => {
    mainWindow.webContents.send(IpcChannels.DOWNLOAD_ERROR, { id, message });
  });

  ytDlpManager.on('cancelled', (id) => {
    // Send error with specific message for cancellation if UI treats it as such, or a separate status event
    // For MVP, using ERROR with 'Cancelled' message is fine, or update status logic in UI
    mainWindow.webContents.send(IpcChannels.DOWNLOAD_ERROR, { id, message: 'Cancelled by user' });
  });

  ytDlpManager.on('log', (id, line) => {
    mainWindow.webContents.send(IpcChannels.DOWNLOAD_LOG, { id, line });
  });
}
