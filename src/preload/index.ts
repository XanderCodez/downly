import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IpcChannels } from '../constants/ipc-channels';
import { DownloadProgress, DownloadCompletePayload, DownloadErrorPayload, Settings } from '../types/ipc';

console.log('Preload script running!');

const api = {
  // Actions
  download: (url: string, options: any) => ipcRenderer.send(IpcChannels.START_DOWNLOAD, { url, ...options }),
  cancelDownload: (id: string) => ipcRenderer.send(IpcChannels.CANCEL_DOWNLOAD, id),
  selectFolder: () => ipcRenderer.invoke(IpcChannels.SELECT_FOLDER),
  getSettings: () => ipcRenderer.invoke(IpcChannels.GET_SETTINGS),
  setSettings: (settings: Settings) => ipcRenderer.invoke(IpcChannels.SET_SETTINGS, settings),
  openExternal: (url: string) => ipcRenderer.send(IpcChannels.OPEN_EXTERNAL, url),
  checkDependencies: () => ipcRenderer.invoke(IpcChannels.CHECK_DEPENDENCIES),
  getVideoInfo: (url: string) => ipcRenderer.invoke(IpcChannels.GET_VIDEO_INFO, url),

  // Events
  onDownloadStart: (callback: (payload: any) => void) => {
    const subscription = (_event: IpcRendererEvent, payload: any) => callback(payload);
    ipcRenderer.on(IpcChannels.DOWNLOAD_START, subscription);
    return () => ipcRenderer.removeListener(IpcChannels.DOWNLOAD_START, subscription);
  },
  onDownloadProgress: (callback: (payload: DownloadProgress) => void) => {
    const subscription = (_event: IpcRendererEvent, payload: DownloadProgress) => callback(payload);
    ipcRenderer.on(IpcChannels.DOWNLOAD_PROGRESS, subscription);
    return () => ipcRenderer.removeListener(IpcChannels.DOWNLOAD_PROGRESS, subscription);
  },
  onDownloadComplete: (callback: (payload: DownloadCompletePayload) => void) => {
    const subscription = (_event: IpcRendererEvent, payload: DownloadCompletePayload) => callback(payload);
    ipcRenderer.on(IpcChannels.DOWNLOAD_COMPLETE, subscription);
    return () => ipcRenderer.removeListener(IpcChannels.DOWNLOAD_COMPLETE, subscription);
  },
  onDownloadError: (callback: (payload: DownloadErrorPayload) => void) => {
    const subscription = (_event: IpcRendererEvent, payload: DownloadErrorPayload) => callback(payload);
    ipcRenderer.on(IpcChannels.DOWNLOAD_ERROR, subscription);
    return () => ipcRenderer.removeListener(IpcChannels.DOWNLOAD_ERROR, subscription);
  },
  onLog: (callback: (payload: { id: string, line: string }) => void) => {
    const subscription = (_event: IpcRendererEvent, payload: any) => callback(payload);
    ipcRenderer.on(IpcChannels.DOWNLOAD_LOG, subscription);
    return () => { ipcRenderer.removeListener(IpcChannels.DOWNLOAD_LOG, subscription); };
  },

  // Clean up all checks
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners(IpcChannels.DOWNLOAD_PROGRESS);
    ipcRenderer.removeAllListeners(IpcChannels.DOWNLOAD_COMPLETE);
    ipcRenderer.removeAllListeners(IpcChannels.DOWNLOAD_ERROR);
    ipcRenderer.removeAllListeners(IpcChannels.DOWNLOAD_LOG);
  }
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
