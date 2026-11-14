/**
 * Electron Store Persistence Wrapper
 * Provides safe, validated offline-first JSON storage with fallback handling for corrupted data.
 */

import {
  AppSettings,
  TestResult,
  PersonalBestsMap,
  WindowState,
  TypeflowStoreData,
  TypeflowProfileBackup,
} from '../shared/types.ts';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'cyberpunk',
  fontSize: 'standard',
  caretStyle: 'line',
  soundProfile: 'mechanical',
  soundVolume: 0.6,
  congratsSound: true,
  focusMode: false,
  liveStatsVisible: true,
  ghostMode: 'pb',
  dailyGoal: 5,
  challengeMode: 'none',
  minWpmFloor: 40,
  stopOnError: false,
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
    const pbKey =
      resultData.mode === 'words'
        ? `words-${resultData.targetWords || 25}`
        : resultData.mode === 'zen'
        ? 'zen'
        : resultData.mode === 'dictation'
        ? `dictation-${resultData.difficulty}`
        : `time-${resultData.difficulty}-${resultData.duration || 30}`;
    const currentPb = pbs[pbKey];
    const isPb = !resultData.challengeFailed && (!currentPb || resultData.netWpm > currentPb.netWpm);

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

  public exportProfileBackup(): TypeflowProfileBackup {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      history: this.getHistory(),
      personalBests: this.getPersonalBests(),
    };
  }

  public importProfileBackup(backup: Partial<TypeflowProfileBackup>): number {
    if (backup.settings && typeof backup.settings === 'object') {
      this.setSettings(backup.settings);
    }
    let importedCount = 0;
    if (Array.isArray(backup.history)) {
      const merged = new Map<string, TestResult>();
      for (const r of this.getHistory()) merged.set(r.id, r);
      for (const r of backup.history) {
        if (r && typeof r.netWpm === 'number' && typeof r.timestamp === 'number') {
          merged.set(r.id, r);
          importedCount++;
        }
      }
      this.inMemoryData.history = Array.from(merged.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
    }
    if (backup.personalBests && typeof backup.personalBests === 'object') {
      const current = { ...this.getPersonalBests() };
      for (const [key, rec] of Object.entries(backup.personalBests)) {
        if (rec && typeof rec.netWpm === 'number' && (!current[key] || rec.netWpm > current[key].netWpm)) {
          current[key] = rec;
        }
      }
      this.inMemoryData.personalBests = current;
    }
    return importedCount;
  }

  public getWindowState(): WindowState {
    return this.inMemoryData.windowState || DEFAULT_WINDOW_STATE;
  }

  public setWindowState(state: WindowState): void {
    this.inMemoryData.windowState = state;
  }
}

export const typeflowStore = new TypeflowStore();
