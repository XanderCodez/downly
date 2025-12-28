import { DownloadStatus } from '../constants/enums';

export type DownloadItem = {
  id: string;
  url: string;
  title: string;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: string;
  size: string;
  error?: string;
};

// TabId is now an enum in constants/enums, checking if anything else needs it
// If we want to keep the export here for compatibility or clearer imports:
export { TabId } from '../constants/enums';
