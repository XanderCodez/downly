import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { Settings } from '../../types/ipc';

const SETTINGS_FILE = 'settings.json';

const DEFAULT_SETTINGS: Settings = {
  downloadPath: app.getPath('downloads'),
  alwaysAskPath: false,
  showRawLogs: false,
};

export class SettingsManager {
  private settingsPath: string;
  private currentSettings: Settings;

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), SETTINGS_FILE);
    this.currentSettings = { ...DEFAULT_SETTINGS };
  }

  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      // If file doesn't exist or is invalid, use defaults and save
      await this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  getSettings(): Settings {
    return this.currentSettings;
  }

  async saveSettings(newSettings: Partial<Settings>): Promise<Settings> {
    this.currentSettings = { ...this.currentSettings, ...newSettings };
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(this.currentSettings, null, 2));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    return this.currentSettings;
  }
}

export const settingsManager = new SettingsManager();
