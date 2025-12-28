import { DownloadStatus } from '../constants/enums';

export { DownloadStatus };

export type DownloadProgress = {
  id: string;
  percent: number;
  speed: string;
  eta: string;
  downloaded: string; // Human readable
  total?: string;      // Human readable (Legacy field, kept for compatibility if needed, or mapped from totalStr)
  totalStr?: string;   // Explicit string from backend
  totalBytes?: number; // Raw bytes
  message?: string;
  status?: 'downloading' | 'merging' | 'processing';
};

export type DownloadStartPayload = {
  id: string;
  url: string;
  title?: string;
};

export type DownloadCompletePayload = {
  id: string;
  filePath: string;
};

export type DownloadErrorPayload = {
  id: string;
  message: string;
  code?: number;
};

export type Settings = {
  downloadPath: string;
  alwaysAskPath: boolean; // Future proofing
  showRawLogs: boolean;
};

// Type Guards
export const isDownloadStartPayload = (obj: any): obj is DownloadStartPayload => {
  return typeof obj === 'object' && obj !== null && typeof obj.id === 'string' && typeof obj.url === 'string';
}
