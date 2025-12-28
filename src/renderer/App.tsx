import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Tabs from '@components/Tabs';
import DownloadForm from '@components/DownloadForm';
import LogConsole from '@components/LogConsole';
import Settings from '@components/Settings';
import { TabId, Direction, Language } from '@constants/enums';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>(TabId.DOWNLOADS);
  const [isYtDlpMissing, setIsYtDlpMissing] = useState(false);

  useEffect(() => {
    // Sync initial settings
    if (window.api) {
      window.api.getSettings().then((settings) => {
        // Settings sync
      });

      // Check dependencies
      window.api.checkDependencies().then((exists: boolean) => {
        setIsYtDlpMissing(!exists);
      });
    } else {
      console.warn('window.api not found. Running in browser?');
    }
  }, []);

  useEffect(() => {
    // Set direction based on language
    const dir = i18n.language === Language.ARABIC ? Direction.RTL : Direction.LTR;
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="flex flex-col h-full bg-background text-gray-200 font-sans selection:bg-primary/30">
      {/* Draggable Header Area */}
      <div className="flex-none p-6 border-b border-white/5 bg-surface/30 backdrop-blur-md z-10 draggable">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Downly
          </h1>
          {isYtDlpMissing && (
            <div className="flex items-center text-sm font-medium text-danger bg-danger/10 px-4 py-2 rounded-full border border-danger/20 animate-pulse">
              {t('app.missingDep')}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-none px-6 pt-6 pb-2">
        <div className="max-w-4xl mx-auto">
          <Tabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-48 relative custom-scrollbar">
        <div className="max-w-4xl mx-auto h-full">
          <div className={`transition-all duration-300 ${activeTab === TabId.DOWNLOADS ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}`}>
            <DownloadForm />
          </div>
          <div className={`transition-all duration-300 ${activeTab === TabId.SETTINGS ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}`}>
            <Settings />
          </div>
          <div className={`transition-all duration-300 ${activeTab === TabId.LOGS ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}`}>
            <LogConsole />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
