// Raw format object from yt-dlp -J
export interface YtDlpFormat {
  format_id: string;
  format_note?: string;
  ext: string;
  acodec: string;
  vcodec: string;
  url: string;
  width?: number;
  height?: number;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number; // bitrate
  resolution?: string;
}

export interface YtDlpInfo {
  id: string;
  title: string;
  formats: YtDlpFormat[];
  thumbnail?: string;
  duration?: number;
}

export type YtDlpOptions = {
  url: string;
  format_id: string; // Specific format ID
  outputTemplate: string;
};

