import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcRenderer } from 'electron'; // Direct Access for types if needed, but we use window.api
import { DownloadProgress, DownloadStatus } from '../types/ipc';
import { YtDlpFormat, YtDlpInfo } from '../types/yt-dlp';
import { AlertCircle, CheckCircle, Download, XCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Props = {};

const DownloadForm: React.FC<Props> = () => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [fetchStatusMessage, setFetchStatusMessage] = useState('');
  const [videoInfo, setVideoInfo] = useState<YtDlpInfo | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');

  // Single active download state for MVP
  const [activeDownload, setActiveDownload] = useState<{
    id: string;
    progress: DownloadProgress | null;
    status: DownloadStatus;
    filePath?: string;
  }>({
    id: '',
    progress: null,
    status: DownloadStatus.IDLE
  });

  // Stable progress state
  const [downloadState, setDownloadState] = useState<{
    totalExpectedBytes: number;
    accumulatedBytes: number;
    currentFileBytes: number;
    lastPercent: number;
  }>({ totalExpectedBytes: 0, accumulatedBytes: 0, currentFileBytes: 0, lastPercent: 0 });

  // Fetch video info when URL changes (debounced)
  // Fetch video info when URL changes (debounced)
  useEffect(() => {
    // Reset state on URL change
    setActiveDownload({ id: '', progress: null, status: DownloadStatus.IDLE });
    setSelectedFormatId(''); // Explicitly reset selection
    setDownloadState({ totalExpectedBytes: 0, accumulatedBytes: 0, currentFileBytes: 0, lastPercent: 0 });

    // Immediately clear previous video info to disable keys/UI
    setVideoInfo(null);

    if (!url || !url.startsWith('http')) {
      setIsFetchingInfo(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingInfo(true);
      try {
        const info = await window.api.getVideoInfo(url);

        // Sort formats: Best quality first (Resolution DESC, Bitrate DESC)
        // Filter out 'storyboard' or no-media formats if necessary, but -J usually gives valid ones.
        // We prioritizing standard video formats over 'none' codecs.
        if (info.formats) {
          info.formats.sort((a: YtDlpFormat, b: YtDlpFormat) => {
            const heightA = a.height || 0;
            const heightB = b.height || 0;
            if (heightA !== heightB) return heightB - heightA; // Descending resolution

            const tbrA = a.tbr || 0;
            const tbrB = b.tbr || 0;
            return tbrB - tbrA; // Descending bitrate
          });
        }

        setVideoInfo(info);

        // Default to best format (now the first one)
        if (info.formats && info.formats.length > 0) {
          setSelectedFormatId(info.formats[0].format_id); // Pick top (best)
        }
      } catch (e) {
        console.error("Failed to fetch info", e);
        setVideoInfo(null);
      } finally {
        setIsFetchingInfo(false);
      }
    }, 1000); // 1s debounce

    // return () => clearTimeout(timer);
  }, [url]);

  // Rotating messages for fetch duration - 10+ levels, non-repeatable
  useEffect(() => {
    let interval: any;
    const messages = [
      "Establishing connection to YouTube...",
      "Handshaking with video server...",
      "Analyzing video metadata...",
      "Parsing streaming manifests...",
      "Checking available video codecs...",
      "Verifying audio track quality...",
      "Calculating file sizes...",
      "This is taking a bit longer than usual...",
      "Must be a large video or playlist...",
      "Still processing, please wait...",
      "Finalizing download options...",
      "Almost ready, preparing formats..."
    ];

    if (isFetchingInfo) {
      setFetchStatusMessage(messages[0] || '');
      let index = 0;
      interval = setInterval(() => {
        index++;
        // Stop at the last message, do not repeat
        if (index < messages.length) {
          setFetchStatusMessage(messages[index] || '');
        }
      }, 1500); // Change every 1.5s to cycle through them
    } else {
      setFetchStatusMessage('');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFetchingInfo]);


  useEffect(() => {
    if (!window.api) return;
    const setupListeners = () => {
      const u1 = window.api.onDownloadStart(({ id }) => {
        setActiveDownload(prev => ({ ...prev, id, status: DownloadStatus.PREPARING }));
        // Reset progress tracking
        setDownloadState(prev => ({ ...prev, accumulatedBytes: 0, currentFileBytes: 0, lastPercent: 0 }));
      });

      const u2 = window.api.onDownloadProgress((progress) => {
        setDownloadState(prevState => {
          const { percent, totalBytes } = progress; // From updated backend

          // Detect file switch (percent drop significant or complete reset)
          // If percent < lastPercent - 10 (heuristic for jump back), assume new file
          // Safer: Just accumulate bytes.

          let newAccumulated = prevState.accumulatedBytes;
          let currentBytesFn = 0;

          if (totalBytes) {
            currentBytesFn = (percent / 100) * totalBytes;

            // If we didn't have an expected total, use this one (approximate)
            if (prevState.totalExpectedBytes === 0) {
              return {
                ...prevState,
                totalExpectedBytes: totalBytes,
                accumulatedBytes: newAccumulated,
                currentFileBytes: currentBytesFn,
                lastPercent: percent
              };
            }
          }

          // Simple Monotonic Logic:
          // If percent dropped significantly (e.g. 100 -> 0 or 80 -> 5), we switched files.
          // Bank the previous file's MAX known progress.
          if (percent < prevState.lastPercent && prevState.lastPercent > 50) {
            newAccumulated += prevState.currentFileBytes;
          }

          // Total progress for UI
          const totalDownloadedSoFar = newAccumulated + currentBytesFn;
          let uiPercent = 0;

          // UI Logic
          const totalToUse = prevState.totalExpectedBytes > 0 ? prevState.totalExpectedBytes : (totalBytes || 0);

          if (totalToUse > 0) {
            uiPercent = (totalDownloadedSoFar / totalToUse) * 100;
            // Cap at 100% just in case
            if (uiPercent > 99.9) uiPercent = 99.9;
          } else {
            // Fallback if no total expectation
            uiPercent = percent;
          }

          // Update UI
          setActiveDownload(prev => {
            // Prevent race condition: If already completed or failed, ignore late progress
            if (prev.status === DownloadStatus.COMPLETED || prev.status === DownloadStatus.ERROR) {
              return prev;
            }

            return {
              ...prev,
              progress: {
                ...progress,
                percent: uiPercent,
                // Format readable bytes
                downloaded: formatBytes(totalDownloadedSoFar),
                total: totalToUse > 0 ? formatBytes(totalToUse) : '' // Empty string if unknown, consistent with removal of '...'
              },
              status: DownloadStatus.DOWNLOADING
            };
          });

          return {
            ...prevState,
            // Update total expected if we found a bigger total (e.g. merging files)
            totalExpectedBytes: totalToUse > prevState.totalExpectedBytes ? totalToUse : prevState.totalExpectedBytes,
            accumulatedBytes: newAccumulated,
            currentFileBytes: currentBytesFn,
            lastPercent: percent
          };
        });
      });

      const u3 = window.api.onDownloadComplete(({ id, filePath }) => {
        // Snap to 100%
        setActiveDownload(prev => ({
          ...prev,
          status: DownloadStatus.COMPLETED,
          filePath: filePath,
          progress: {
            ...prev.progress!,
            percent: 100,
            downloaded: prev.progress?.total || prev.progress?.downloaded || '', // Ensure consistancy
            message: t('status.saved', { path: filePath })
          } as any
        }));
      });

      const u4 = window.api.onDownloadError(({ id, message }) => {
        setActiveDownload(prev => ({ ...prev, status: DownloadStatus.ERROR, progress: { ...prev.progress!, message } as any }));
      });

      return () => { u1(); u2(); u3(); u4(); };
    };
    const cleanup = setupListeners();
    return cleanup;
  }, []); // Note: dependency array empty means we use functional state updates

  const handleDownload = () => {
    if (!url || !selectedFormatId || !videoInfo) return;
    const id = Date.now().toString();
    setActiveDownload({ id, progress: null, status: DownloadStatus.PREPARING });

    // Auto-merge logic: if video-only, merge with best audio
    let format_id = selectedFormatId;
    const selectedFormat = videoInfo.formats.find(f => f.format_id === selectedFormatId);

    // Calculate expected size
    let expectedSize = selectedFormat?.filesize || selectedFormat?.filesize_approx || 0;

    // Check if video-only 
    if (selectedFormat && selectedFormat.vcodec !== 'none' && selectedFormat.acodec === 'none') {
      format_id += '+bestaudio';
      // Try to find best audio size to add to total
      const bestAudio = videoInfo.formats.find(f => f.format_id === '140' || (f.acodec !== 'none' && f.vcodec === 'none'));
      if (bestAudio) {
        expectedSize += (bestAudio.filesize || bestAudio.filesize_approx || 0);
      }
    }

    // Initialize expectation
    setDownloadState(prev => ({ ...prev, totalExpectedBytes: expectedSize }));

    window.api.download(url, { id, format_id });
  };

  const handleCancel = () => {
    if (activeDownload.id) {
      window.api.cancelDownload(activeDownload.id);
    }
  };

  // Helper for bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '...'; // Don't show 0 B logic for total here
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = Math.floor(Math.log(bytes) / Math.log(k));

    // Force GB for sizes > 1000 MB (1,048,576,000 bytes)
    if (i === 2 && bytes >= 1000 * 1024 * 1024) {
      i = 3;
    }

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isDownloading = activeDownload.status === DownloadStatus.PREPARING || activeDownload.status === DownloadStatus.DOWNLOADING;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Input Card */}
      <div className="bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">{t('download.urlLabel')}</label>
          <div className="relative group">
            <input
              type="text"
              placeholder={t('download.urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isDownloading}
              className="w-full h-16 bg-black/40 border-2 border-white/10 rounded-2xl px-6 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:shadow-glow-lg transition-all duration-300 disabled:opacity-50"
            />
            {isFetchingInfo && (
              <div className="absolute right-5 top-5">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </div>
          <div className="h-6 mt-2 pl-1">
            {isFetchingInfo && <p className="text-sm text-primary font-medium animate-pulse">{fetchStatusMessage}</p>}
          </div>
        </div>

        {/* Thumbnail Preview */}
        {videoInfo?.thumbnail && (
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-lg group">
            <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-sm font-bold px-3 py-1.5 rounded-lg text-white border border-white/10">
              {videoInfo.duration ? new Date(videoInfo.duration * 1000).toISOString().substr(11, 8) : ''}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-20 text-white font-bold text-xl drop-shadow-md line-clamp-2">
              {videoInfo.title}
            </div>
          </div>
        )}

        {/* Format Selection - Only show if info loaded */}
        {videoInfo && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">{t('download.formatLabel')}</label>
            <div className="relative">
              <select
                value={selectedFormatId}
                onChange={(e) => setSelectedFormatId(e.target.value)}
                disabled={isDownloading}
                className="w-full h-16 appearance-none bg-surface/50 border-2 border-white/10 rounded-2xl px-6 pr-12 text-lg text-white focus:outline-none focus:border-primary focus:shadow-glow transition-all disabled:opacity-50 cursor-pointer hover:bg-white/5"
              >
                {videoInfo.formats.map(f => {
                  const isVideoOnly = f.vcodec !== 'none' && f.acodec === 'none';
                  return (
                    <option key={f.format_id} value={f.format_id} className="bg-surface text-lg py-2">
                      {f.resolution || 'Audio'} • {f.ext.toUpperCase()}
                      {f.filesize ? ` • ${formatBytes(f.filesize)}` : ''}
                      {isVideoOnly ? ' (High Quality + Audio)' : ''}
                      {f.format_note ? ` • ${f.format_note}` : ''}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ArrowDownCircle className="w-6 h-6" />
              </div>
            </div>

          </div>
        )}

        <div className="pt-4 flex items-center justify-end">
          <button
            onClick={handleDownload}
            disabled={!url || isDownloading || !videoInfo}
            className="w-full h-16 bg-primary hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xl font-bold rounded-full transition-all duration-300 shadow-glow hover:shadow-glow-lg active:scale-[0.98] flex items-center justify-center uppercase tracking-wider"
          >
            {isDownloading ? (
              <span className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>{t('download.downloading')}</span>
              </span>
            ) : (
              <span className="flex items-center space-x-3">
                <span>{t('download.button')}</span>
                <Download className="w-6 h-6" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Download Card */}
      {activeDownload.status !== DownloadStatus.IDLE && (
        <div className="bg-surface/80 backdrop-blur-xl mb-24 mt-12 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className={clsx("p-3 rounded-2xl shadow-inner", {
                'bg-blue-500/20 text-primary': activeDownload.status === DownloadStatus.DOWNLOADING || activeDownload.status === DownloadStatus.PREPARING,
                'bg-green-500/20 text-green-400': activeDownload.status === DownloadStatus.COMPLETED,
                'bg-red-500/20 text-red-400': activeDownload.status === DownloadStatus.ERROR || activeDownload.status === DownloadStatus.CANCELLED,
              })}>
                {activeDownload.status === DownloadStatus.COMPLETED ? <CheckCircle className="w-8 h-8" /> :
                  activeDownload.status === DownloadStatus.ERROR ? <AlertCircle className="w-8 h-8" /> :
                    <ArrowDownCircle className={clsx("w-8 h-8", { "animate-bounce": activeDownload.status === DownloadStatus.DOWNLOADING })} />}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-white truncate">{videoInfo?.title || url}</div>
                <div className="text-base text-gray-300 flex items-center space-x-3 mt-1 font-medium">
                  {/* Stable Progress Display */}
                  {activeDownload.status === DownloadStatus.COMPLETED ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-green-400 font-bold">{t('status.completed')}</span>
                    </div>
                  ) : activeDownload.status === DownloadStatus.PREPARING ? (
                    <span className="animate-pulse text-primary">Preparing download...</span>
                  ) : activeDownload.progress?.status === 'merging' ? (
                    <span className="text-gemini-purple animate-pulse flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Merging video and audio...</span>
                  ) : (
                    <>
                      <span className="text-white">{activeDownload.progress?.downloaded || '0 B'} / {activeDownload.progress?.total || ''}</span>
                      <span className="text-white/20 text-xs">•</span>
                      <span className="text-gray-300">{activeDownload.progress?.speed || '0 B/s'}</span>
                      <span className="text-white/20 text-xs">•</span>
                      <span className="text-gray-300">{activeDownload.progress?.eta || '--:--'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {isDownloading && (
              <button onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <XCircle className="w-8 h-8" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative h-4 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              className={clsx("absolute top-0 left-0 h-full transition-all duration-300 rounded-full", {
                'bg-primary shadow-[0_0_15px_rgba(79,148,255,0.6)]': activeDownload.status === DownloadStatus.DOWNLOADING,
                'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]': activeDownload.status === DownloadStatus.COMPLETED,
                'bg-red-500': activeDownload.status === DownloadStatus.ERROR,
                'bg-blue-400/30 animate-pulse': activeDownload.status === DownloadStatus.PREPARING
              })}
              style={{ width: `${activeDownload.progress?.percent || 0}%` }}
            />
          </div>
          <div className="mt-3 text-sm font-medium text-right text-gray-400">
            {activeDownload.status === DownloadStatus.ERROR ? activeDownload.progress?.message :
              activeDownload.status === DownloadStatus.COMPLETED ? <span className="text-green-400">{t('status.completed')}</span> :
                `${Math.round(activeDownload.progress?.percent || 0)}%`}
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadForm;
