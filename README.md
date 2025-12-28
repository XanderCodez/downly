A sleek, cross-platform YouTube downloader built with Electron, React, TypeScript, and yt-dlp.

## Features

- **Downloads**: Support for Video/Audio formats from YouTube.
- **Cross-Platform**: Windows, macOS, Linux.
- **Secure**: Context Isolated, typed IPC, no Node integration in renderer.
- **Dark Mode**: Minimalist, distraction-free UI.
- **Performance**: Real-time progress updates, low resource usage.

## Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. **CRITICAL: Add yt-dlp Binaries**
This app requires `yt-dlp` binaries to be present in the `resources/yt-dlp` folder.
**You must manually download and place the correct binary for your OS.**

- **macOS**: Download `yt-dlp` (macOS universal or x64) -> place in `resources/yt-dlp/mac/yt-dlp`
- **Windows**: Download `yt-dlp.exe` -> place in `resources/yt-dlp/win/yt-dlp.exe`
- **Linux**: Download `yt-dlp` -> place in `resources/yt-dlp/linux/yt-dlp`

*Ensure the binaries have executable permissions (`chmod +x ...`) on macOS/Linux.*

### 3. Development
Run the app in development mode with hot-reloading:
```bash
npm run dev
```

### 4. Build
Build the application for production:
```bash
npm run build
```
Artifacts will be in the `release` (or `dist`) folder.

## Architecture

- **Main Process**: `src/main` - Handles multiple child processes for `yt-dlp`, file dialogs, and settings persistence.
- **Renderer**: `src/renderer` - React + Vite + Tailwind.
- **Preload**: `src/preload` - Secure bridge exposing only specific APIs.
- **IPC**: Typed communication defined in `src/types/ipc.ts`.

## Legal Disclaimer

This tool is designed for downloading content you have the rights to (e.g., your own videos, Creative Commons, or public domain).
Authentication features (cookies/login) are intentionally omitted for MVP.
**You must confirm you have rights to download content in the Settings tab before using.**

## License

MIT
