import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsType } from '../types/ipc';
import { Language } from '@constants/enums';

type Props = {};

const Settings: React.FC<Props> = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SettingsType | null>(null);

  const loadSettings = async () => {
    if (!window.api) {
      console.warn('window.api not found, cannot load settings');
      return;
    }
    const s = await window.api.getSettings();
    setSettings(s);
  };
  useEffect(() => {
    loadSettings();
  }, []);
  const updateSetting = async (key: keyof SettingsType, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await window.api.setSettings(newSettings);
  };

  const handleBrowse = async () => {
    const path = await window.api.selectFolder();
    if (path) {
      updateSetting('downloadPath', path);
    }
  };

  if (!settings) return <div className="p-4">{t('settings.loading')}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-surface/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl space-y-8">

        <div className="space-y-8">
          {/* Download Location */}
          <div>
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">{t('settings.downloadLocation')}</label>
            <div className="flex space-x-4">
              <input
                type="text"
                readOnly
                value={settings.downloadPath}
                className="flex-1 h-16 bg-black/40 border-2 border-white/10 rounded-2xl px-6 text-xl text-gray-300 focus:outline-none focus:border-primary focus:shadow-glow transition-all duration-300"
              />
              <button
                onClick={handleBrowse}
                className="h-16 px-8 bg-surface/50 hover:bg-white/10 border-2 border-white/10 text-white font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
              >
                {t('settings.changeButton')}
              </button>
            </div>
          </div>

          {/* Language Selection (Hidden for now as requested) */}
          {/* 
          <div>
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">{t('settings.language')}</label>
            <div className="relative">
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="w-full h-16 appearance-none bg-surface/50 border-2 border-white/10 rounded-2xl px-6 pr-12 text-lg text-white focus:outline-none focus:border-primary focus:shadow-glow transition-all cursor-pointer hover:bg-white/5"
              >
                <option value={Language.ENGLISH} className="bg-surface py-2">English</option>
                <option value={Language.ARABIC} className="bg-surface py-2">العربية</option>
              </select>
            </div>
          </div>
          */}

          {/* Developer Options */}
          {/* <div className="pt-6 border-t border-white/5">
            <label className="flex items-center space-x-4 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.showRawLogs}
                  onChange={(e) => updateSetting('showRawLogs', e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-14 h-8 bg-black/40 border-2 border-white/10 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary/50 peer-checked:after:bg-white peer-checked:border-primary"></div>
              </div>
              <span className="text-lg font-medium text-gray-300 group-hover:text-white transition-colors">{t('settings.showLogs')}</span>
            </label>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default Settings;
