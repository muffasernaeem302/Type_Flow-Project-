/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Header } from './ui/components/Header.tsx';
import { HomeView } from './ui/views/HomeView.tsx';
import { TestView } from './ui/views/TestView.tsx';
import { ResultsView } from './ui/views/ResultsView.tsx';
import { HistoryView } from './ui/views/HistoryView.tsx';
import { SettingsModal } from './ui/views/SettingsModal.tsx';
import { ShortcutsModal } from './ui/components/ShortcutsModal.tsx';
import { CustomPassageModal } from './ui/views/CustomPassageModal.tsx';
import { api } from './ui/bridge.ts';
import {
  AppSettings,
  Difficulty,
  Passage,
  PersonalBestsMap,
  TestDuration,
  WordCount,
  TestMode,
  TestResult,
  AiTrendAnalysis,
} from './shared/types.ts';
import { getThemePalette, isLightTheme, resolveEffectiveTheme } from './shared/themes.ts';
import {
  DEFAULT_WALLPAPER_BLUR,
  DEFAULT_WALLPAPER_DIM,
  resolveWallpaperSrc,
} from './ui/wallpapers.ts';
import { getRandomPassage, generateWeakKeysDrill, generateWordDrill } from './data/texts.ts';
import { soundSynth } from './audio/synth.ts';
import { RotateCcw, AlertTriangle } from 'lucide-react';

type AppView = 'home' | 'test' | 'results' | 'history';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TypeFlow Uncaught Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="p-3 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Something interrupted the test view</h2>
          <p className="text-xs text-slate-400 max-w-md">
            The session state encountered an unexpected error. Your data and settings are safely stored.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            className="mt-2 px-5 py-2.5 rounded-lg bg-tf-accent text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-tf-accent-hover shadow-[0_0_16px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)] transition-transform hover:scale-[1.02]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [settings, setSettings] = useState<AppSettings>({
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
    wallpaperDim: DEFAULT_WALLPAPER_DIM,
    wallpaperBlur: DEFAULT_WALLPAPER_BLUR,
  });

  const [history, setHistory] = useState<TestResult[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBestsMap>({});

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Active test parameters
  const [testMode, setTestMode] = useState<TestMode>('time');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [selectedDuration, setSelectedDuration] = useState<TestDuration>(30);
  const [selectedWordCount, setSelectedWordCount] = useState<WordCount>(25);
  const [customPassage, setCustomPassage] = useState<Passage | null>(null);
  const [dictationAudioSrc, setDictationAudioSrc] = useState<string | null>(null);
  const [dictationBlindMode, setDictationBlindMode] = useState<boolean>(true);

  const [activePassage, setActivePassage] = useState<Passage>(() => getRandomPassage('medium'));
  const [latestResult, setLatestResult] = useState<TestResult | null>(null);
  const [testRunKey, setTestRunKey] = useState<number>(0);
  const [wallpaperError, setWallpaperError] = useState<boolean>(false);

  // Load initial settings and history from Bridge
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedSettings, savedHistory, savedPbs] = await Promise.all([
          api.getSettings(),
          api.getHistory(),
          api.getPersonalBests(),
        ]);

        if (mounted) {
          setSettings(savedSettings);
          setHistory(savedHistory);
          setPersonalBests(savedPbs);
          soundSynth.setConfig(
            savedSettings.soundProfile,
            savedSettings.soundVolume,
            savedSettings.congratsSound ?? true
          );
        }
      } catch (err) {
        console.warn('TypeFlow storage initialization warning:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Sync theme changes with DOM
  useEffect(() => {
    const root = document.documentElement;
    const effective = resolveEffectiveTheme(settings.theme, systemPrefersDark);
    root.dataset.theme = effective;

    if (effective === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [settings.theme, systemPrefersDark]);

  const handleReloadProfile = useCallback(async () => {
    try {
      const [savedSettings, savedHistory, savedPbs] = await Promise.all([
        api.getSettings(),
        api.getHistory(),
        api.getPersonalBests(),
      ]);
      setSettings(savedSettings);
      setHistory(savedHistory);
      setPersonalBests(savedPbs);
      soundSynth.setConfig(
        savedSettings.soundProfile,
        savedSettings.soundVolume,
        savedSettings.congratsSound ?? true
      );
    } catch (err) {
      console.warn('TypeFlow profile reload error:', err);
    }
  }, []);

  // Update and persist settings
  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await api.saveSettings(partial);
    setSettings(updated);
    soundSynth.setConfig(updated.soundProfile, updated.soundVolume, updated.congratsSound ?? true);
  };

  const handleToggleSound = async () => {
    const newProfile = settings.soundProfile === 'muted' ? 'mechanical' : 'muted';
    handleUpdateSettings({ soundProfile: newProfile });
  };

  const handleToggleFocusMode = async () => {
    handleUpdateSettings({ focusMode: !settings.focusMode });
  };

  // Start test handler
  const handleStartTest = useCallback(
    (
      passage: Passage,
      mode: TestMode,
      duration?: TestDuration,
      wordCount?: WordCount,
      difficulty?: Difficulty,
      audioSrc?: string | null,
      blindMode?: boolean
    ) => {
      setActivePassage(passage);
      setTestMode(mode);
      if (duration) setSelectedDuration(duration);
      if (wordCount) setSelectedWordCount(wordCount);
      if (difficulty) setSelectedDifficulty(difficulty);
      if (mode === 'dictation') {
        if (audioSrc !== undefined) setDictationAudioSrc(audioSrc);
        if (blindMode !== undefined) setDictationBlindMode(blindMode);
      } else {
        setDictationAudioSrc(null);
      }
      setTestRunKey((k) => k + 1);
      setCurrentView('test');
    },
    []
  );

  // Complete test handler
  const handleFinishTest = async (resultData: Omit<TestResult, 'id' | 'timestamp'>) => {
    try {
      const saved = await api.saveResult(resultData);
      setLatestResult(saved);
      setHistory((prev) => [saved, ...prev].slice(0, 50));

      const pbKey =
        saved.mode === 'time'
          ? `time-${saved.difficulty}-${saved.duration}`
          : saved.mode === 'words'
          ? `words-${saved.targetWords}`
          : saved.mode === 'dictation'
          ? `dictation-${saved.difficulty}`
          : 'zen';

      if (saved.isPersonalBest) {
        setPersonalBests((prev) => ({
          ...prev,
          [pbKey]: {
            netWpm: saved.netWpm,
            accuracy: saved.accuracy,
            date: saved.timestamp,
            testId: saved.id,
          },
        }));
      }

      if (!saved.challengeFailed) {
        try {
          soundSynth.playCompletionChime(Boolean(saved.isPersonalBest));
        } catch {
          // Ignore audio errors
        }
      }

      setCurrentView('results');
    } catch (err) {
      console.warn('TypeFlow storage save fallback:', err);
      const fallbackResult: TestResult = {
        ...resultData,
        id: `test_${Date.now()}`,
        timestamp: Date.now(),
      };
      if (!fallbackResult.challengeFailed) {
        try {
          soundSynth.playCompletionChime(false);
        } catch {
          // Ignore audio errors
        }
      }
      setLatestResult(fallbackResult);
      setCurrentView('results');
    }
  };

  const handleRetryPassage = useCallback(() => {
    setTestRunKey((k) => k + 1);
    setCurrentView('test');
  }, []);

  const handleNewPassage = useCallback(() => {
    setDictationAudioSrc(null);
    setActivePassage(getRandomPassage(selectedDifficulty, activePassage.id));
    setTestRunKey((k) => k + 1);
    setCurrentView('test');
  }, [selectedDifficulty, activePassage.id]);

  const handlePracticeWeakKeys = useCallback((missedKeys: Record<string, number>) => {
    const drillPassage = generateWeakKeysDrill(missedKeys, 25);
    setDictationAudioSrc(null);
    setActivePassage(drillPassage);
    setTestMode('words');
    setSelectedWordCount(25);
    setSelectedDifficulty('medium');
    setTestRunKey((k) => k + 1);
    setCurrentView('test');
  }, []);

  const handleLaunchRecommendedDrill = useCallback(
    (mode: AiTrendAnalysis['recommendedMode'], focusKeys: string[]) => {
      if (mode === 'weak_keys') {
        const keyMap: Record<string, number> = {};
        for (const rawKey of focusKeys) {
          const clean = rawKey.trim().toLowerCase();
          if (clean.length === 1) {
            keyMap[clean] = (keyMap[clean] || 0) + 5;
          }
        }
        if (Object.keys(keyMap).length === 0) {
          for (const run of history) {
            if (!run.missedKeys) continue;
            for (const [k, count] of Object.entries(run.missedKeys)) {
              keyMap[k] = (keyMap[k] || 0) + count;
            }
          }
        }
        if (Object.keys(keyMap).length === 0) {
          keyMap.e = 5;
          keyMap.t = 5;
          keyMap.a = 5;
        }
        handlePracticeWeakKeys(keyMap);
        return;
      }

      if (mode === 'words') {
        const drill = generateWordDrill(selectedWordCount);
        handleStartTest(drill, 'words', undefined, selectedWordCount, selectedDifficulty);
        return;
      }

      if (mode === 'dictation') {
        setCustomPassage(null);
        setDictationAudioSrc(null);
        setTestMode('dictation');
        setCurrentView('home');
        return;
      }

      const passage = getRandomPassage(selectedDifficulty);
      handleStartTest(passage, 'time', selectedDuration, undefined, selectedDifficulty);
    },
    [history, selectedWordCount, selectedDifficulty, selectedDuration, handlePracticeWeakKeys, handleStartTest]
  );

  const handleClearHistory = async () => {
    await api.clearHistory();
    setHistory([]);
    setPersonalBests({});
  };

  // Keyboard shortcuts (Ctrl/Cmd+N, Ctrl/Cmd+R, Ctrl/Cmd+,, Ctrl/Cmd+H, Esc, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Escape key to close modals or navigate home
      if (e.key === 'Escape') {
        if (isSettingsOpen || isShortcutsOpen || isCustomModalOpen) {
          setIsSettingsOpen(false);
          setIsShortcutsOpen(false);
          setIsCustomModalOpen(false);
          return;
        }
        if (currentView !== 'home' && currentView !== 'test' && currentView !== 'results') {
          setCurrentView('home');
        }
        return;
      }

      // Settings shortcut: Ctrl+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      if (isTextInput || isSettingsOpen || isShortcutsOpen || isCustomModalOpen) {
        return;
      }

      // Shortcuts modal toggle: ? (Shift+/) or F1
      if ((e.key === '?' || e.key === 'F1') && currentView !== 'test') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // History shortcut: Ctrl+H (when not in test)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h' && currentView !== 'test') {
        e.preventDefault();
        setCurrentView((prev) => (prev === 'history' ? 'home' : 'history'));
        return;
      }

      // New test: Ctrl+N
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && currentView !== 'test') {
        e.preventDefault();
        const nextPassage = getRandomPassage(selectedDifficulty);
        handleStartTest(nextPassage, testMode, selectedDuration, selectedWordCount, selectedDifficulty);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isSettingsOpen, isShortcutsOpen, isCustomModalOpen, selectedDifficulty, selectedDuration, selectedWordCount, testMode, handleStartTest]);

  const isDark = !isLightTheme(settings.theme, systemPrefersDark);
  const themePalette = getThemePalette(settings.theme, systemPrefersDark);
  const isModalOpen = isSettingsOpen || isShortcutsOpen || isCustomModalOpen;
  const activeWallpaperSrc = resolveWallpaperSrc(settings);
  const showWallpaper = Boolean(activeWallpaperSrc) && !wallpaperError;
  const wallpaperDim =
    typeof settings.wallpaperDim === 'number' ? settings.wallpaperDim : DEFAULT_WALLPAPER_DIM;
  const wallpaperBlur =
    typeof settings.wallpaperBlur === 'number' ? settings.wallpaperBlur : DEFAULT_WALLPAPER_BLUR;

  useEffect(() => {
    setWallpaperError(false);
  }, [activeWallpaperSrc]);

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col font-sans transition-colors duration-200 ${
        showWallpaper
          ? isDark
            ? 'bg-transparent text-slate-100'
            : 'bg-transparent text-slate-900'
          : isDark
          ? 'bg-tf-bg text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Fixed Full-Viewport Wallpaper & Contrast Scrim Layer */}
      {showWallpaper && activeWallpaperSrc && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${
            isDark ? 'bg-tf-bg' : 'bg-slate-50'
          }`}
        >
          <img
            src={activeWallpaperSrc}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setWallpaperError(true)}
            className="w-full h-full object-cover scale-105 transition-[filter] duration-300"
            style={wallpaperBlur > 0 ? { filter: `blur(${wallpaperBlur}px)` } : undefined}
          />
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${
              isDark ? 'bg-tf-bg' : 'bg-slate-50'
            }`}
            style={{ opacity: wallpaperDim }}
          />
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        settings={settings}
        onToggleSound={handleToggleSound}
        onToggleFocusMode={handleToggleFocusMode}
        isTestActive={currentView === 'test'}
      />

      {/* Main Viewport Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
        <AppErrorBoundary onReset={() => setCurrentView('home')}>
          {currentView === 'home' && (
            <HomeView
              onStartTest={handleStartTest}
              personalBests={personalBests}
              selectedDifficulty={selectedDifficulty}
              onChangeDifficulty={(diff) => {
                setCustomPassage(null);
                setDictationAudioSrc(null);
                setSelectedDifficulty(diff);
              }}
              selectedDuration={selectedDuration}
              onChangeDuration={setSelectedDuration}
              selectedWordCount={selectedWordCount}
              onChangeWordCount={(count) => {
                setCustomPassage(null);
                setSelectedWordCount(count);
              }}
              testMode={testMode}
              onChangeTestMode={(mode) => {
                setCustomPassage(null);
                if (mode !== 'dictation') {
                  setDictationAudioSrc(null);
                }
                setTestMode(mode);
              }}
              customPassage={customPassage}
              onClearCustomPassage={() => setCustomPassage(null)}
              onOpenCustomModal={() => setIsCustomModalOpen(true)}
              onOpenHistory={() => setCurrentView('history')}
              history={history}
              isModalOpen={isModalOpen}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              dictationAudioSrc={dictationAudioSrc}
              onSetDictationAudio={setDictationAudioSrc}
              dictationBlindMode={dictationBlindMode}
              onChangeDictationBlindMode={setDictationBlindMode}
            />
          )}

          {currentView === 'test' && (
            <TestView
              key={testRunKey}
              passage={activePassage}
              mode={testMode}
              duration={selectedDuration}
              targetWords={selectedWordCount}
              difficulty={selectedDifficulty}
              settings={settings}
              personalBests={personalBests}
              dictationAudioSrc={dictationAudioSrc}
              dictationBlindMode={dictationBlindMode}
              onFinish={handleFinishTest}
              onCancel={() => setCurrentView('home')}
              onRestart={handleRetryPassage}
            />
          )}

          {currentView === 'results' && latestResult && (
            <ResultsView
              result={latestResult}
              passage={activePassage}
              onRetry={handleRetryPassage}
              onNewTest={handleNewPassage}
              onPracticeWeakKeys={handlePracticeWeakKeys}
              onViewHistory={() => setCurrentView('history')}
              onBackHome={() => setCurrentView('home')}
              isDark={isDark}
              themePalette={themePalette}
              isModalOpen={isModalOpen}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              history={history}
              personalBests={personalBests}
              dailyGoal={settings.dailyGoal}
              onPracticeWeakKeys={handlePracticeWeakKeys}
              onLaunchRecommendedDrill={handleLaunchRecommendedDrill}
              onClearHistory={handleClearHistory}
              onProfileImported={handleReloadProfile}
              onBack={() => setCurrentView('home')}
              isDark={isDark}
              themePalette={themePalette}
            />
          )}
        </AppErrorBoundary>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onProfileImported={handleReloadProfile}
      />

      {/* Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Custom Text & Code Snippet Modal */}
      <CustomPassageModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSelectPassage={(passage) => {
          setCustomPassage(passage);
          setActivePassage(passage);
          if (testMode === 'words') {
            setTestMode('time');
          }
        }}
      />
    </div>
  );
}
