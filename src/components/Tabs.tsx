import React from 'react';
import { useTranslation } from 'react-i18next';
import { TabId } from '@constants/enums';
import clsx from 'clsx';
import { Download, Settings, Terminal } from 'lucide-react';

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const Tabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const tabs = [
    { id: TabId.DOWNLOADS, label: t('tabs.downloads'), icon: Download },
    // { id: TabId.SETTINGS, label: t('tabs.settings'), icon: Settings },
    { id: TabId.LOGS, label: t('tabs.logs'), icon: Terminal },
  ] as const;

  return (
    <div className="flex space-x-2 bg-surface/50 p-2 rounded-full border border-white/5 backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'flex items-center justify-center flex-1 px-6 py-4 text-lg font-medium rounded-full transition-all duration-300 outline-none focus:ring-4 focus:ring-primary/20',
              isActive
                ? 'bg-primary text-white shadow-glow transform scale-[1.02]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <Icon className={clsx("w-6 h-6 mr-3", isActive ? "animate-pulse" : "")} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
