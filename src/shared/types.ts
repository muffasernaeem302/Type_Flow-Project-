/**
 * Shared Type Definitions for TypeFlow
 * Clean, strict typing used across main, preload, renderer, engine, and stats.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type TestDuration = 15 | 30 | 60 | 120;
export type WordCount = 10 | 25 | 50 | 100;
export type TestMode = 'time' | 'words' | 'zen' | 'dictation';
export type CaretStyle = 'line' | 'block' | 'underline';
export type ThemeMode =
  | 'cyberpunk'
  | 'deep_ocean'
  | 'forest'
  | 'midnight'
  | 'light'
  | 'system';
export type SoundProfile = 'mechanical' | 'typewriter' | 'linear_thock' | 'soft' | 'muted';
export type FontSize = 'compact' | 'standard' | 'large';
export type GhostMode = 'off' | 'pb' | '60' | '80' | '100';
export type DictationVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
export type ChallengeMode = 'none' | 'sudden_death' | 'min_wpm';
export type WallpaperId =
  | 'none'
  | 'cyber_city'
  | 'deep_ocean'
  | 'misty_forest'
  | 'midnight_cosmos'
  | 'custom';

export interface AiTrendAnalysis {
  headline: string;
  bottleneck: string;
  actionPlan: string[];
  recommendedMode: 'weak_keys' | 'words' | 'time' | 'dictation';
  focusKeys: string[];
}

export interface Passage {
  id: string;
  title: string;
  author: string;
  difficulty: Difficulty;
  content: string;
  category?: 'literature' | 'speech' | 'philosophy' | 'code' | 'custom' | 'words' | 'dictation';
}

export interface CharacterState {
  char: string;
  status: 'correct' | 'wrong' | 'pending';
  typedChar?: string;
}

export interface SecondSnapshot {
  second: number;
  wpm: number;
  rawWpm: number;
  errors: number;
}

export interface WordLatencyEntry {
  word: string;
  avgMs: number;
  totalMs: number;
  hasError: boolean;
}

export interface CharacterReviewItem {
  char: string;
  status: 'correct' | 'wrong' | 'pending';
  typedChar?: string;
}

export interface TestResult {
  id: string;
  timestamp: number;
  mode: TestMode;
  duration?: TestDuration;
  targetWords?: WordCount;
  difficulty: Difficulty;
  passageTitle: string;
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  totalTypedChars: number;
  correctChars: number;
  consistency: number;
  timeline: SecondSnapshot[];
  missedKeys?: Record<string, number>; // character -> error count
  characterReview?: CharacterReviewItem[];
  slowestWords?: WordLatencyEntry[];
  isPersonalBest?: boolean;
  challengeMode?: ChallengeMode;
  challengeFailed?: boolean;
  challengeFailureReason?: string;
}

export interface PersonalBestRecord {
  netWpm: number;
  accuracy: number;
  date: number;
  testId: string;
}

export type PersonalBestsMap = Record<string, PersonalBestRecord>; // key: `${mode}-${difficulty}-${duration_or_words}`

export interface AppSettings {
  theme: ThemeMode;
  fontSize: FontSize;
  caretStyle: CaretStyle;
  soundProfile: SoundProfile;
  soundVolume: number; // 0 to 1
  congratsSound: boolean;
  focusMode: boolean;
  liveStatsVisible: boolean;
  ghostMode: GhostMode;
  dailyGoal: number;
  challengeMode: ChallengeMode;
  minWpmFloor: number;
  stopOnError: boolean;
  wallpaper?: WallpaperId;
  customWallpaper?: string;
  wallpaperDim?: number; // 0.25 to 0.90
  wallpaperBlur?: number; // 0 to 16 px
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

export interface TypeflowStoreData {
  settings: AppSettings;
  history: TestResult[];
  personalBests: PersonalBestsMap;
  windowState?: WindowState;
  customPassages?: Passage[];
}

export interface TypeflowProfileBackup {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  history: TestResult[];
  personalBests: PersonalBestsMap;
}

export interface TypeflowAPI {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getHistory: () => Promise<TestResult[]>;
  saveResult: (result: Omit<TestResult, 'id' | 'timestamp'>) => Promise<TestResult>;
  clearHistory: () => Promise<boolean>;
  getPersonalBests: () => Promise<PersonalBestsMap>;
  exportHistoryCSV: () => Promise<{ success: boolean; filePath?: string; content?: string }>;
  exportProfileJSON: () => Promise<{ success: boolean; filePath?: string; content?: string }>;
  importProfileJSON: (rawJson: string) => Promise<{ success: boolean; importedRuns: number; error?: string }>;
  toggleFullscreen: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isElectron: () => boolean;
  onShortcut: (callback: (command: string) => void) => () => void;
}

declare global {
  interface Window {
    typeflowAPI?: TypeflowAPI;
  }
}
