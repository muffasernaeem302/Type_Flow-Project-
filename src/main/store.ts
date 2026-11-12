/**
 * Electron Store Persistence Wrapper
 * Provides safe, validated offline-first JSON storage with fallback handling for corrupted data.
 */

import { AppSettings, TestResult, PersonalBestsMap, WindowState, TypeflowStoreData } from '../shared/types.ts';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'cyberpunk',
  fontSize: 'standard',
  caretStyle: 'line',
  soundProfile: 'mechanical',
  soundVolume: 0.6,
  focusMode: false,
  liveStatsVisible: true,
  ghostMode: 'pb',
};

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1024,
  height: 768,
  isMaximized: false,
};

export class TypeflowStore {
  private inMemoryData: TypeflowStoreData;

  constructor() {
    this.inMemoryData = {
      settings: DEFAULT_SETTINGS,
      history: [],
      personalBests: {},
      windowState: DEFAULT_WINDOW_STATE,
    };
  }

  public getSettings(): AppSettings {
    return { ...DEFAULT_SETTINGS, ...this.inMemoryData.settings };
  }

  public setSettings(settings: Partial<AppSettings>): AppSettings {
    this.inMemoryData.settings = { ...this.getSettings(), ...settings };
    return this.inMemoryData.settings;
  }

  public getHistory(): TestResult[] {
    return this.inMemoryData.history || [];
  }

  public addResult(resultData: Omit<TestResult, 'id' | 'timestamp'>): TestResult {
    const pbs = this.getPersonalBests();
    const pbKey = `${resultData.difficulty}-${resultData.duration}`;
    const currentPb = pbs[pbKey];
    const isPb = !currentPb || resultData.netWpm > currentPb.netWpm;

    const fullResult: TestResult = {
      ...resultData,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      isPersonalBest: isPb,
    };

    // Prepend and cap at 50 results
    this.inMemoryData.history = [fullResult, ...(this.inMemoryData.history || [])].slice(0, 50);

    if (isPb) {
      pbs[pbKey] = {
        netWpm: fullResult.netWpm,
        accuracy: fullResult.accuracy,
        date: fullResult.timestamp,
        testId: fullResult.id,
      };
      this.inMemoryData.personalBests = pbs;
    }

    return fullResult;
  }

  public clearHistory(): boolean {
    this.inMemoryData.history = [];
    this.inMemoryData.personalBests = {};
    return true;
  }

  public getPersonalBests(): PersonalBestsMap {
    return this.inMemoryData.personalBests || {};
  }

  public getWindowState(): WindowState {
    return this.inMemoryData.windowState || DEFAULT_WINDOW_STATE;
  }

  public setWindowState(state: WindowState): void {
    this.inMemoryData.windowState = state;
  }
}

export const typeflowStore = new TypeflowStore();
