/**
 * TypeFlow API Bridge
 * Connects renderer to Electron main IPC via window.typeflowAPI when in native desktop,
 * and transparently falls back to local storage and browser primitives when run in web preview.
 */

import {
  AppSettings,
  TestResult,
  PersonalBestsMap,
  TypeflowAPI,
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
  wallpaper: 'none',
  wallpaperDim: 0.65,
  wallpaperBlur: 2,
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

    const pbKey =
      resultData.mode === 'words'
        ? `words-${resultData.targetWords || 25}`
        : resultData.mode === 'zen'
        ? 'zen'
        : resultData.mode === 'dictation'
        ? `dictation-${resultData.difficulty}`
        : `time-${resultData.difficulty}-${resultData.duration || 30}`;
    const currentPb = pbs[pbKey] || (resultData.mode === 'time' ? pbs[`${resultData.difficulty}-${resultData.duration}`] : undefined);
    const isPb = !resultData.challengeFailed && (!currentPb || resultData.netWpm > currentPb.netWpm);

    const fullResult: TestResult = {
      ...resultData,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      isPersonalBest: isPb,
    };

    // Keep last 50 tests (retain detailed characterReview on the 10 most recent runs)
    const updatedHistory = [fullResult, ...history].slice(0, 50).map((item, idx) =>
      idx < 10 ? item : { ...item, characterReview: undefined }
    );
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
      r.mode === 'words'
        ? `${r.targetWords} words`
        : r.mode === 'zen'
        ? 'Zen'
        : r.mode === 'dictation'
        ? 'Dictation'
        : `${r.duration}s`,
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

  async exportProfileJSON(): Promise<{ success: boolean; filePath?: string; content?: string }> {
    const [settings, history, personalBests] = await Promise.all([
      this.getSettings(),
      this.getHistory(),
      this.getPersonalBests(),
    ]);

    const backup: TypeflowProfileBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      history,
      personalBests,
    };

    const jsonContent = JSON.stringify(backup, null, 2);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `typeflow_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return { success: true, content: jsonContent };
  }

  async importProfileJSON(
    rawJson: string
  ): Promise<{ success: boolean; importedRuns: number; error?: string }> {
    try {
      const parsed = JSON.parse(rawJson) as Partial<TypeflowProfileBackup>;
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, importedRuns: 0, error: 'Invalid JSON backup structure.' };
      }

      const hasHistory = Array.isArray(parsed.history);
      const hasSettings = Boolean(parsed.settings && typeof parsed.settings === 'object');
      const hasPbs = Boolean(parsed.personalBests && typeof parsed.personalBests === 'object');

      if (!hasHistory && !hasSettings && !hasPbs) {
        return {
          success: false,
          importedRuns: 0,
          error: 'File does not look like a TypeFlow profile backup.',
        };
      }

      const validRuns: TestResult[] = [];
      if (hasHistory && parsed.history) {
        for (const item of parsed.history) {
          if (
            item &&
            typeof item === 'object' &&
            typeof item.netWpm === 'number' &&
            typeof item.timestamp === 'number' &&
            typeof item.passageTitle === 'string'
          ) {
            validRuns.push({
              ...item,
              id: typeof item.id === 'string' && item.id ? item.id : `imported_${item.timestamp}_${Math.random().toString(36).slice(2, 6)}`,
              mode: item.mode || 'time',
              difficulty: item.difficulty || 'medium',
              rawWpm: typeof item.rawWpm === 'number' ? item.rawWpm : item.netWpm,
              accuracy: typeof item.accuracy === 'number' ? item.accuracy : 100,
              errors: typeof item.errors === 'number' ? item.errors : 0,
              totalTypedChars: typeof item.totalTypedChars === 'number' ? item.totalTypedChars : 0,
              correctChars: typeof item.correctChars === 'number' ? item.correctChars : 0,
              consistency: typeof item.consistency === 'number' ? item.consistency : 100,
              timeline: Array.isArray(item.timeline) ? item.timeline : [],
            });
          }
        }
        if (parsed.history.length > 0 && validRuns.length === 0) {
          return {
            success: false,
            importedRuns: 0,
            error: 'Backup contains no recognizable typing session records.',
          };
        }
      }

      if (hasSettings && parsed.settings) {
        const sanitized: Partial<AppSettings> = {};
        const allowedThemes = new Set([
          'cyberpunk',
          'deep_ocean',
          'forest',
          'midnight',
          'light',
          'system',
        ]);
        if (parsed.settings.theme && allowedThemes.has(parsed.settings.theme)) {
          sanitized.theme = parsed.settings.theme;
        }
        if (parsed.settings.fontSize) sanitized.fontSize = parsed.settings.fontSize;
        if (parsed.settings.caretStyle) sanitized.caretStyle = parsed.settings.caretStyle;
        if (parsed.settings.soundProfile) sanitized.soundProfile = parsed.settings.soundProfile;
        if (typeof parsed.settings.soundVolume === 'number') {
          sanitized.soundVolume = Math.max(0, Math.min(1, parsed.settings.soundVolume));
        }
        if (typeof parsed.settings.congratsSound === 'boolean') {
          sanitized.congratsSound = parsed.settings.congratsSound;
        }
        if (typeof parsed.settings.focusMode === 'boolean') {
          sanitized.focusMode = parsed.settings.focusMode;
        }
        if (typeof parsed.settings.liveStatsVisible === 'boolean') {
          sanitized.liveStatsVisible = parsed.settings.liveStatsVisible;
        }
        if (parsed.settings.ghostMode) sanitized.ghostMode = parsed.settings.ghostMode;
        if (typeof parsed.settings.dailyGoal === 'number' && parsed.settings.dailyGoal >= 1) {
          sanitized.dailyGoal = parsed.settings.dailyGoal;
        }
        if (parsed.settings.challengeMode) {
          sanitized.challengeMode = parsed.settings.challengeMode;
        }
        if (typeof parsed.settings.minWpmFloor === 'number' && parsed.settings.minWpmFloor >= 10) {
          sanitized.minWpmFloor = parsed.settings.minWpmFloor;
        }
        if (typeof parsed.settings.stopOnError === 'boolean') {
          sanitized.stopOnError = parsed.settings.stopOnError;
        }
        const allowedWallpapers = new Set([
          'none',
          'cyber_city',
          'deep_ocean',
          'misty_forest',
          'midnight_cosmos',
          'custom',
        ]);
        if (parsed.settings.wallpaper && allowedWallpapers.has(parsed.settings.wallpaper)) {
          sanitized.wallpaper = parsed.settings.wallpaper;
        }
        if (
          typeof parsed.settings.customWallpaper === 'string' &&
          parsed.settings.customWallpaper.startsWith('data:image/') &&
          parsed.settings.customWallpaper.length <= 2_500_000
        ) {
          sanitized.customWallpaper = parsed.settings.customWallpaper;
        }
        if (typeof parsed.settings.wallpaperDim === 'number' && Number.isFinite(parsed.settings.wallpaperDim)) {
          sanitized.wallpaperDim = Math.max(0.25, Math.min(0.9, parsed.settings.wallpaperDim));
        }
        if (typeof parsed.settings.wallpaperBlur === 'number' && Number.isFinite(parsed.settings.wallpaperBlur)) {
          sanitized.wallpaperBlur = Math.max(0, Math.min(16, Math.round(parsed.settings.wallpaperBlur)));
        }
        await this.saveSettings(sanitized);
      }

      const existingHistory = await this.getHistory();
      const mergedById = new Map<string, TestResult>();
      for (const run of existingHistory) {
        mergedById.set(run.id, run);
      }
      for (const run of validRuns) {
        mergedById.set(run.id, run);
      }

      const mergedHistory = Array.from(mergedById.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50)
        .map((item, idx) => (idx < 10 ? item : { ...item, characterReview: undefined }));

      try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(mergedHistory));
      } catch {
        // Ignore storage errors
      }

      const existingPbs = await this.getPersonalBests();
      const mergedPbs: PersonalBestsMap = { ...existingPbs };
      if (hasPbs && parsed.personalBests) {
        for (const [key, rec] of Object.entries(parsed.personalBests)) {
          if (
            rec &&
            typeof rec === 'object' &&
            typeof rec.netWpm === 'number' &&
            typeof rec.accuracy === 'number' &&
            typeof rec.date === 'number'
          ) {
            const current = mergedPbs[key];
            if (!current || rec.netWpm > current.netWpm) {
              mergedPbs[key] = rec;
            }
          }
        }
      }

      try {
        localStorage.setItem(STORAGE_KEYS.PERSONAL_BESTS, JSON.stringify(mergedPbs));
      } catch {
        // Ignore storage errors
      }

      return { success: true, importedRuns: validRuns.length };
    } catch {
      return { success: false, importedRuns: 0, error: 'Unable to parse JSON backup file.' };
    }
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
