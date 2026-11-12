/**
 * Preload Script for TypeFlow Desktop
 * Exposes a strictly typed, validated bridge to the renderer via contextBridge.
 * Enforces context isolation and zero Node.js integration in the renderer.
 */

import { TypeflowAPI, AppSettings, TestResult, PersonalBestsMap } from '../shared/types.ts';

// In native Electron environment, this module wraps electron.ipcRenderer
// and contextBridge.exposeInMainWorld('typeflowAPI', apiBridge);

export const typeflowBridge: TypeflowAPI = {
  getSettings: async (): Promise<AppSettings> => {
    // ipcRenderer.invoke('get-settings')
    return {
      theme: 'cyberpunk',
      fontSize: 'standard',
      caretStyle: 'line',
      soundProfile: 'mechanical',
      soundVolume: 0.6,
      focusMode: false,
      liveStatsVisible: true,
      ghostMode: 'pb',
    };
  },

  saveSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    // ipcRenderer.invoke('save-settings', settings)
    return {
      theme: 'cyberpunk',
      fontSize: 'standard',
      caretStyle: 'line',
      soundProfile: 'mechanical',
      soundVolume: 0.6,
      focusMode: false,
      liveStatsVisible: true,
      ghostMode: 'pb',
      ...settings,
    };
  },

  getHistory: async (): Promise<TestResult[]> => {
    // ipcRenderer.invoke('get-history')
    return [];
  },

  saveResult: async (resultData: Omit<TestResult, 'id' | 'timestamp'>): Promise<TestResult> => {
    // ipcRenderer.invoke('save-result', resultData)
    return {
      ...resultData,
      id: `test_${Date.now()}`,
      timestamp: Date.now(),
    };
  },

  clearHistory: async (): Promise<boolean> => {
    // ipcRenderer.invoke('clear-history')
    return true;
  },

  getPersonalBests: async (): Promise<PersonalBestsMap> => {
    // ipcRenderer.invoke('get-pbs')
    return {};
  },

  exportHistoryCSV: async (): Promise<{ success: boolean; filePath?: string; content?: string }> => {
    // ipcRenderer.invoke('export-csv')
    return { success: true };
  },

  toggleFullscreen: async (): Promise<boolean> => {
    // ipcRenderer.invoke('toggle-fullscreen')
    return false;
  },

  minimizeWindow: async (): Promise<void> => {
    // ipcRenderer.invoke('minimize-window')
  },

  maximizeWindow: async (): Promise<void> => {
    // ipcRenderer.invoke('maximize-window')
  },

  closeWindow: async (): Promise<void> => {
    // ipcRenderer.invoke('close-window')
  },

  isElectron: (): boolean => {
    return true;
  },

  onShortcut: (_callback: (command: string) => void): (() => void) => {
    // ipcRenderer.on('menu-shortcut', ...)
    return () => {};
  },
};
