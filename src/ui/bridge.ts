/**
 * TypeFlow API Bridge
 * Connects renderer to Electron main IPC via window.typeflowAPI when in native desktop,
 * and transparently falls back to local storage and browser primitives when run in web preview.
 */

import { AppSettings, TestResult, PersonalBestsMap, TypeflowAPI } from '../shared/types.ts';

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

const STORAGE_KEYS = {
  SETTINGS: 'typeflow_settings',
  HISTORY: 'typeflow_history',
  PERSONAL_BESTS: 'typeflow_pbs',
};

class FallbackWebBridge implements TypeflowAPI {
  async getSettings(): Promise<AppSettings> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Corrupted storage fallback
    }
    return { ...DEFAULT_SETTINGS };
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    } catch {
      // Storage quota or private browsing exception
    }
    return updated;
  }

  async getHistory(): Promise<TestResult[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 50);
        }
      }
    } catch {
      // Return empty array on parse error
    }
    return [];
  }

  async saveResult(resultData: Omit<TestResult, 'id' | 'timestamp'>): Promise<TestResult> {
    const history = await this.getHistory();
    const pbs = await this.getPersonalBests();

    const pbKey = `${resultData.difficulty}-${resultData.duration}`;
    const currentPb = pbs[pbKey];
    const isPb = !currentPb || resultData.netWpm > currentPb.netWpm;

    const fullResult: TestResult = {
      ...resultData,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      isPersonalBest: isPb,
    };

    // Keep last 50 tests
    const updatedHistory = [fullResult, ...history].slice(0, 50);
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    } catch {
      // Ignore storage errors
    }

    if (isPb) {
      pbs[pbKey] = {
        netWpm: fullResult.netWpm,
        accuracy: fullResult.accuracy,
        date: fullResult.timestamp,
        testId: fullResult.id,
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PERSONAL_BESTS, JSON.stringify(pbs));
      } catch {
        // Ignore
      }
    }

    return fullResult;
  }

  async clearHistory(): Promise<boolean> {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
      localStorage.removeItem(STORAGE_KEYS.PERSONAL_BESTS);
      return true;
    } catch {
      return false;
    }
  }

  async getPersonalBests(): Promise<PersonalBestsMap> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PERSONAL_BESTS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Return empty record on failure
    }
    return {};
  }

  async exportHistoryCSV(): Promise<{ success: boolean; filePath?: string; content?: string }> {
    const history = await this.getHistory();
    if (history.length === 0) {
      return { success: false };
    }

    const headers = [
      'Date',
      'Mode',
      'Difficulty',
      'Duration (s) / Target',
      'Passage Title',
      'Net WPM',
      'Raw WPM',
      'Accuracy (%)',
      'Errors',
      'Consistency (%)',
      'Total Keystrokes',
    ];

    const rows = history.map((r) => [
      new Date(r.timestamp).toISOString(),
      r.mode || 'time',
      r.difficulty,
      r.mode === 'words' ? `${r.targetWords} words` : r.mode === 'zen' ? 'Zen' : `${r.duration}s`,
      `"${r.passageTitle.replace(/"/g, '""')}"`,
      r.netWpm,
      r.rawWpm,
      r.accuracy,
      r.errors,
      r.consistency,
      r.totalTypedChars,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Trigger browser download
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `typeflow_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return { success: true, content: csvContent };
  }

  async toggleFullscreen(): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      return true;
    } else {
      await document.exitFullscreen().catch(() => {});
      return false;
    }
  }

  async minimizeWindow(): Promise<void> {
    // In web preview, display minimal feedback
  }

  async maximizeWindow(): Promise<void> {
    this.toggleFullscreen();
  }

  async closeWindow(): Promise<void> {
    // In web preview, no-op
  }

  isElectron(): boolean {
    return false;
  }

  onShortcut(_callback: (command: string) => void): () => void {
    return () => {};
  }
}

const fallbackBridge = new FallbackWebBridge();

export const api: TypeflowAPI =
  typeof window !== 'undefined' && window.typeflowAPI
    ? window.typeflowAPI
    : fallbackBridge;
