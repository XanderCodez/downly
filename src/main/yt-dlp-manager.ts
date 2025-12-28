import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';
import { YtDlpOptions } from '../types/yt-dlp';

// Platform specific binary name
const IS_WINDOWS = process.platform === 'win32';
const BINARY_NAME = IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp';

// Path resolution
const getBinaryPath = () => {
  const platformDir = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux';

  // In production: resources/yt-dlp/...
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'yt-dlp', platformDir, BINARY_NAME);
  }

  // In development: project_root/resources/yt-dlp/...
  // We are in src/main/yt-dlp-manager.ts -> ../../resources
  const devPath = path.resolve(__dirname, '../../resources/yt-dlp', platformDir, BINARY_NAME);
  return devPath;
};

export class YtDlpManager extends EventEmitter {
  private activeDownloads: Map<string, ChildProcess> = new Map();

  constructor() {
    super();
  }

  async checkBinary(): Promise<boolean> {
    const binaryPath = getBinaryPath();
    console.log('Checking binary at:', binaryPath);
    try {
      await import('fs/promises').then(fs => fs.access(binaryPath));
      return true;
    } catch (e) {
      console.error('Binary check failed:', e);
      return false;
    }
  }

  async getInfo(url: string): Promise<import('../types/yt-dlp').YtDlpInfo> {
    const binaryPath = getBinaryPath();
    const args = ['-J', '--flat-playlist', '--no-playlist', url];

    return new Promise((resolve, reject) => {
      const child = spawn(binaryPath, args, {
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', d => stdout += d);
      child.stderr.on('data', d => stderr += d);

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const json = JSON.parse(stdout);
            resolve({
              id: json.id,
              title: json.title,
              formats: json.formats || [],
              thumbnail: json.thumbnail,
              duration: json.duration,
            });
          } catch (e) {
            reject(new Error('Failed to parse yt-dlp JSON output'));
          }
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async startDownload(id: string, options: YtDlpOptions) {
    const binaryPath = getBinaryPath();
    console.log(`Starting download [${id}] with binary: ${binaryPath}`);

    const args = this.buildArgs(options);

    let finalFilePath: string | null = null;
    try {
      // Inherit PATH so it can find ffmpeg if it's in the system path
      // Also explicitly set ffmpeg location if possible
      const child = spawn(binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' } // Ensure basic PATH for mac/linux
      });

      this.activeDownloads.set(id, child);

      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');

      child.stdout?.on('data', (data: string) => {
        const lines = data.split('\n').filter(Boolean);
        for (const line of lines) {
          this.emit('log', id, line);
          this.parseProgress(id, line);

          // Capture filename from logs
          // 1. Simple download: [download] Destination: /path/to/file.mp4
          // 2. Merged: [Merger] Merging formats into "/path/to/file.mp4"
          // 3. Already downloaded: [download] /path/to/file.mp4 has already been downloaded
          if (line.includes('[download] Destination: ')) {
            const parts = line.split('[download] Destination: ');
            if (parts.length > 1) finalFilePath = parts[1]!.trim();
          } else if (line.includes('[Merger] Merging formats into')) {
            const match = line.match(/Merging formats into "(.*)"/);
            if (match && match[1]) finalFilePath = match[1];
          } else if (line.includes('has already been downloaded')) {
            const match = line.match(/\[download\] (.*) has already been downloaded/);
            if (match && match[1]) finalFilePath = match[1];
          }
        }
      });

      child.stderr?.on('data', (data: string) => {
        // yt-dlp prints some info to stderr headers, pass as log
        this.emit('log', id, `[stderr] ${data}`);
      });

      child.on('close', (code) => {
        this.activeDownloads.delete(id);
        if (code === 0) {
          // Use parsed path, or fallback to template (technically incorrect but better than null) if parsing failed
          this.emit('complete', id, finalFilePath || options.outputTemplate);
        } else if (code !== null) { // code is null if killed
          this.emit('error', id, `Process exited with code ${code}`);
        }
      });

      child.on('error', (err) => {
        this.activeDownloads.delete(id);
        this.emit('error', id, `Spawn error: ${err.message}`);
      });

    } catch (e: any) {
      this.emit('error', id, e.message);
    }
  }

  cancelDownload(id: string) {
    const child = this.activeDownloads.get(id);
    if (child) {
      child.kill('SIGKILL'); // Force kill
      this.activeDownloads.delete(id);
      this.emit('cancelled', id);
    }
  }

  private buildArgs(options: YtDlpOptions): string[] {
    const args: string[] = [];

    // Explicit ffmpeg location if known. For now, on Mac we know it's often /usr/local/bin/ffmpeg
    // or we can rely on PATH env var modification above.
    // Adding it explicitly is safer if we know it.
    if (process.platform === 'darwin') {
      args.push('--ffmpeg-location', '/usr/local/bin/ffmpeg');
    }

    args.push('--newline'); // Critical for parsing
    args.push('--no-playlist'); // MVP requirement
    args.push('--no-warnings');
    args.push('--force-overwrites'); // User request: override existing files

    // Strict format selection
    if (options.format_id) {
      args.push('-f', options.format_id);
    }

    // Output template
    args.push(options.outputTemplate); // e.g. /path/to/%(title)s.%(ext)s

    args.push(options.url);

    return args;
  }

  private parseProgress(id: string, line: string) {
    // Regex for standard yt-dlp progress
    // [download]  12.3% of 10.00MiB at 2.00MiB/s ETA 00:05
    // Handle approximate sizes with ~
    const progressRegex = /\[download\]\s+(\d+\.?\d*)%\s+of\s+~?(\d+\.?\d*)([KMGTP]?i?B)/;
    const speedRegex = /at\s+(\d+\.?\d*)([KMGTP]?i?B)\/s/;
    const etaRegex = /ETA\s+(\d+:\d+)/;

    const match = line.match(progressRegex); // Focus on percent and total first

    if (match) {
      const percent = parseFloat(match[1]!);
      const sizeVal = parseFloat(match[2]!);
      const sizeUnit = match[3] || 'MiB'; // Default assumption if missing, though regex requires it

      const totalBytes = this.parseBytes(sizeVal, sizeUnit);

      // Extract Speed
      let speed = '?';
      const speedMatch = line.match(speedRegex);
      if (speedMatch && speedMatch[1] && speedMatch[2]) {
        speed = `${speedMatch[1]} ${speedMatch[2]}/s`;
      }

      // Extract ETA
      let eta = '?';
      const etaMatch = line.match(etaRegex);
      if (etaMatch && etaMatch[1]) {
        eta = etaMatch[1];
      }

      this.emit('progress', id, {
        percent,
        totalBytes, // Send raw bytes
        totalStr: `${match[2]}${match[3] || ''}`, // Keep original string for display fallback
        speed,
        eta,
        status: 'downloading'
      });
    }
    // Handle Merge/Fixup stages
    else if (line.startsWith('[Merger]') || line.startsWith('[Fixup]') || line.startsWith('[ffmpeg]')) {
      this.emit('progress', id, {
        percent: 99.9, // Hold at near 100%
        totalBytes: 0,
        totalStr: '',
        speed: '',
        eta: '',
        status: 'merging'
      });
    }
  }

  private parseBytes(value: number, unit: string): number {
    const units: { [key: string]: number } = {
      'B': 1,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024,
      'TiB': 1024 * 1024 * 1024 * 1024,
      'KB': 1000,
      'MB': 1000 * 1000,
      'GB': 1000 * 1000 * 1000,
    };
    return value * (units[unit] || 1);
  }
}

export const ytDlpManager = new YtDlpManager();
