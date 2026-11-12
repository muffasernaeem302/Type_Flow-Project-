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
} from './shared/types.ts';
import { getRandomPassage } from './data/texts.ts';
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
            className="mt-2 px-5 py-2.5 rounded-lg bg-[#00f5d4] text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-[#26ffe2] shadow-[0_0_16px_rgba(0,245,212,0.3)] transition-transform hover:scale-[1.02]"
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
    focusMode: false,
    liveStatsVisible: true,
    ghostMode: 'pb',
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

  const [activePassage, setActivePassage] = useState<Passage>(() => getRandomPassage('medium'));
  const [latestResult, setLatestResult] = useState<TestResult | null>(null);

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
          soundSynth.setConfig(savedSettings.soundProfile, savedSettings.soundVolume);
        }
      } catch (err) {
        console.warn('TypeFlow storage initialization warning:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sync theme changes with DOM
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else if (settings.theme === 'cyberpunk') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  }, [settings.theme]);

  // Update and persist settings
  const handleUpdateSettings = async (partial: Partial<AppSettings>) => {
    const updated = await api.saveSettings(partial);
    setSettings(updated);
    soundSynth.setConfig(updated.soundProfile, updated.soundVolume);
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
      difficulty?: Difficulty
    ) => {
      setActivePassage(passage);
      setTestMode(mode);
      if (duration) setSelectedDuration(duration);
      if (wordCount) setSelectedWordCount(wordCount);
      if (difficulty) setSelectedDifficulty(difficulty);
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

      setCurrentView('results');
    } catch (err) {
      console.warn('TypeFlow storage save fallback:', err);
      const fallbackResult: TestResult = {
        ...resultData,
        id: `test_${Date.now()}`,
        timestamp: Date.now(),
      };
      setLatestResult(fallbackResult);
      setCurrentView('results');
    }
  };

  const handleRetryPassage = useCallback(() => {
    setCurrentView('test');
  }, []);

  const handleNewPassage = useCallback(() => {
    setActivePassage(getRandomPassage(selectedDifficulty, activePassage.id));
    setCurrentView('test');
  }, [selectedDifficulty, activePassage.id]);

  const handleClearHistory = async () => {
    await api.clearHistory();
    setHistory([]);
    setPersonalBests({});
  };

  // Keyboard shortcuts (Ctrl/Cmd+N, Ctrl/Cmd+R, Ctrl/Cmd+,, Ctrl/Cmd+H, Esc, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcuts modal toggle: ? (Shift+/) or F1
      if ((e.key === '?' || e.key === 'F1') && currentView !== 'test') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Settings shortcut: Ctrl+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
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

      // Escape key to navigate home or close modals
      if (e.key === 'Escape') {
        if (isSettingsOpen || isShortcutsOpen || isCustomModalOpen) {
          setIsSettingsOpen(false);
          setIsShortcutsOpen(false);
          setIsCustomModalOpen(false);
          return;
        }
        if (currentView !== 'home') {
          setCurrentView('home');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isSettingsOpen, isShortcutsOpen, isCustomModalOpen, selectedDifficulty, selectedDuration, selectedWordCount, testMode, handleStartTest]);

  const isDark = settings.theme !== 'light';

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-200 ${
        isDark
          ? 'bg-[#0b0514] text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
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
      <main className="flex-1 flex flex-col justify-center py-4">
        <AppErrorBoundary onReset={() => setCurrentView('home')}>
          {currentView === 'home' && (
            <HomeView
              onStartTest={handleStartTest}
              personalBests={personalBests}
              selectedDifficulty={selectedDifficulty}
              onChangeDifficulty={setSelectedDifficulty}
              selectedDuration={selectedDuration}
              onChangeDuration={setSelectedDuration}
              selectedWordCount={selectedWordCount}
              onChangeWordCount={setSelectedWordCount}
              testMode={testMode}
              onChangeTestMode={setTestMode}
              customPassage={customPassage}
              onOpenCustomModal={() => setIsCustomModalOpen(true)}
              settings={settings}
            />
          )}

          {currentView === 'test' && (
            <TestView
              passage={activePassage}
              mode={testMode}
              duration={selectedDuration}
              targetWords={selectedWordCount}
              difficulty={selectedDifficulty}
              settings={settings}
              personalBests={personalBests}
              onFinish={handleFinishTest}
              onCancel={() => setCurrentView('home')}
              onRestart={() => setCurrentView('test')}
            />
          )}

          {currentView === 'results' && latestResult && (
            <ResultsView
              result={latestResult}
              passage={activePassage}
              onRetry={handleRetryPassage}
              onNewTest={handleNewPassage}
              onViewHistory={() => setCurrentView('history')}
              onBackHome={() => setCurrentView('home')}
              isDark={isDark}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              history={history}
              personalBests={personalBests}
              onClearHistory={handleClearHistory}
              onBack={() => setCurrentView('home')}
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
        }}
      />
    </div>
  );
}
