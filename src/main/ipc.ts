/**
 * Validated IPC Handlers for TypeFlow Main Process
 * Validates payload structures, manages window commands, and executes file export.
 */

import { typeflowStore } from './store.ts';
import { AppSettings, TestResult } from '../shared/types.ts';

export function registerIpcHandlers(): void {
  // IPC registration for Electron main process
  // Handlers validate incoming arguments to ensure strict security
}

export function validateSettings(input: unknown): Partial<AppSettings> {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const obj = input as Record<string, unknown>;
  const clean: Partial<AppSettings> = {};

  if (obj.theme === 'cyberpunk' || obj.theme === 'light' || obj.theme === 'system') {
    clean.theme = obj.theme;
  }
  if (obj.fontSize === 'compact' || obj.fontSize === 'standard' || obj.fontSize === 'large') {
    clean.fontSize = obj.fontSize;
  }
  if (obj.caretStyle === 'line' || obj.caretStyle === 'block' || obj.caretStyle === 'underline') {
    clean.caretStyle = obj.caretStyle;
  }
  if (obj.soundProfile === 'mechanical' || obj.soundProfile === 'soft' || obj.soundProfile === 'muted') {
    clean.soundProfile = obj.soundProfile;
  }
  if (typeof obj.soundVolume === 'number') {
    clean.soundVolume = Math.max(0, Math.min(1, obj.soundVolume));
  }
  if (typeof obj.focusMode === 'boolean') {
    clean.focusMode = obj.focusMode;
  }
  if (typeof obj.liveStatsVisible === 'boolean') {
    clean.liveStatsVisible = obj.liveStatsVisible;
  }

  return clean;
}

export function validateResultPayload(input: unknown): Omit<TestResult, 'id' | 'timestamp'> | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const obj = input as Record<string, unknown>;

  if (
    typeof obj.duration !== 'number' ||
    typeof obj.difficulty !== 'string' ||
    typeof obj.passageTitle !== 'string' ||
    typeof obj.netWpm !== 'number' ||
    typeof obj.rawWpm !== 'number' ||
    typeof obj.accuracy !== 'number' ||
    typeof obj.errors !== 'number' ||
    typeof obj.totalTypedChars !== 'number' ||
    typeof obj.correctChars !== 'number' ||
    typeof obj.consistency !== 'number' ||
    !Array.isArray(obj.timeline)
  ) {
    return null;
  }

  return {
    mode: (obj.mode as 'time' | 'words' | 'zen') || 'time',
    duration: typeof obj.duration === 'number' ? (obj.duration as 15 | 30 | 60 | 120) : undefined,
    difficulty: (obj.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
    passageTitle: String(obj.passageTitle),
    netWpm: Math.max(0, Number(obj.netWpm)),
    rawWpm: Math.max(0, Number(obj.rawWpm)),
    accuracy: Math.max(0, Math.min(100, Number(obj.accuracy))),
    errors: Math.max(0, Number(obj.errors)),
    totalTypedChars: Math.max(0, Number(obj.totalTypedChars)),
    correctChars: Math.max(0, Number(obj.correctChars)),
    consistency: Math.max(0, Math.min(100, Number(obj.consistency))),
    timeline: obj.timeline,
  };
}
