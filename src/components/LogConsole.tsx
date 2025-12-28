import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LogConsole: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.api) return;
    // Subscribe to logs
    const cleanup = window.api.onLog(({ line }) => {
      setLogs((prev) => [...prev, line]);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black/50 rounded-lg border border-surface overflow-hidden">
      <div className="px-4 py-2 bg-surface text-xs font-mono text-gray-400 border-b border-white/5">
        {t('logs.title')}
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-green-400/90 space-y-1">
        {logs.length === 0 && <div className="text-gray-600 italic">{t('logs.empty')}</div>}
        {logs.map((log, i) => (
          <div key={i} className="break-all whitespace-pre-wrap">{log}</div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default LogConsole;
