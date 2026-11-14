/**
 * Home View for TypeFlow
 * Supports Time, Words, Zen, and Custom Code test modes,
 * personal best benchmark tracking, and passage curation.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Shuffle,
  Award,
  Flame,
  Zap,
  Clock,
  Type,
  Sparkles,
  Code,
  Headphones,
  Volume2,
  Loader2,
  EyeOff,
  Eye,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Difficulty,
  TestDuration,
  WordCount,
  TestMode,
  Passage,
  PersonalBestsMap,
  AppSettings,
  TestResult,
  DictationVoice,
  ChallengeMode,
} from '../../shared/types.ts';
import { getRandomPassage, generateWordDrill } from '../../data/texts.ts';
import { isLightTheme } from '../../shared/themes.ts';
import { computePracticeProgress } from '../../stats/streaks.ts';
import { WeeklyWpmChart } from '../components/WeeklyWpmChart.tsx';
import { DailyGoalProgress } from '../components/DailyGoalProgress.tsx';

const DICTATION_VOICES: { id: DictationVoice; label: string }[] = [
  { id: 'Kore', label: 'Kore · Clear' },
  { id: 'Puck', label: 'Puck · Upbeat' },
  { id: 'Charon', label: 'Charon · Deep' },
  { id: 'Fenrir', label: 'Fenrir · Warm' },
  { id: 'Zephyr', label: 'Zephyr · Crisp' },
];

interface HomeViewProps {
  onStartTest: (
    passage: Passage,
    mode: TestMode,
    duration?: TestDuration,
    wordCount?: WordCount,
    difficulty?: Difficulty,
    dictationAudioSrc?: string | null,
    dictationBlind?: boolean
  ) => void;
  personalBests: PersonalBestsMap;
  selectedDifficulty: Difficulty;
  onChangeDifficulty: (diff: Difficulty) => void;
  selectedDuration: TestDuration;
  onChangeDuration: (dur: TestDuration) => void;
  selectedWordCount: WordCount;
  onChangeWordCount: (count: WordCount) => void;
  testMode: TestMode;
  onChangeTestMode: (mode: TestMode) => void;
  customPassage: Passage | null;
  onClearCustomPassage: () => void;
  onOpenCustomModal: () => void;
  onOpenHistory: () => void;
  history: TestResult[];
  isModalOpen?: boolean;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  dictationAudioSrc: string | null;
  onSetDictationAudio: (src: string | null) => void;
  dictationBlindMode: boolean;
  onChangeDictationBlindMode: (blind: boolean) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartTest,
  personalBests,
  selectedDifficulty,
  onChangeDifficulty,
  selectedDuration,
  onChangeDuration,
  selectedWordCount,
  onChangeWordCount,
  testMode,
  onChangeTestMode,
  customPassage,
  onClearCustomPassage,
  onOpenCustomModal,
  onOpenHistory,
  history,
  isModalOpen = false,
  settings,
  onUpdateSettings,
  dictationAudioSrc,
  onSetDictationAudio,
  dictationBlindMode,
  onChangeDictationBlindMode,
}) => {
  const [currentPassage, setCurrentPassage] = useState<Passage>(() =>
    customPassage || getRandomPassage(selectedDifficulty)
  );
  const [dictationVoice, setDictationVoice] = useState<DictationVoice>('Kore');
  const [dictationTopic, setDictationTopic] = useState<string>('');
  const [isGeneratingDictation, setIsGeneratingDictation] = useState<boolean>(false);
  const [dictationError, setDictationError] = useState<string | null>(null);

  const practiceSummary = useMemo(
    () => computePracticeProgress(history, settings.dailyGoal),
    [history, settings.dailyGoal]
  );

  // Update passage when mode or difficulty changes
  useEffect(() => {
    setDictationError(null);
    if (customPassage) {
      setCurrentPassage(customPassage);
    } else if (testMode === 'words') {
      setCurrentPassage(generateWordDrill(selectedWordCount));
    } else {
      setCurrentPassage((prev) => {
        if (testMode === 'dictation' && prev.category === 'dictation' && prev.difficulty === selectedDifficulty) {
          return prev;
        }
        return getRandomPassage(selectedDifficulty);
      });
    }
  }, [testMode, selectedDifficulty, selectedWordCount, customPassage]);

  const handleShufflePassage = () => {
    if (customPassage) {
      onClearCustomPassage();
    }
    onSetDictationAudio(null);
    setDictationError(null);
    if (testMode === 'words') {
      setCurrentPassage(generateWordDrill(selectedWordCount));
    } else {
      setCurrentPassage(getRandomPassage(selectedDifficulty, currentPassage.id));
    }
  };

  const handleGenerateDictation = async (useCurrentPassage: boolean) => {
    setIsGeneratingDictation(true);
    setDictationError(null);
    try {
      const response = await fetch('/api/ai/dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: useCurrentPassage ? '' : dictationTopic,
          difficulty: selectedDifficulty,
          voiceName: dictationVoice,
          customText: useCurrentPassage ? currentPassage.content : '',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `Dictation generation failed (${response.status})`);
      }

      if (!useCurrentPassage && payload.passage) {
        if (customPassage) {
          onClearCustomPassage();
        }
        setCurrentPassage(payload.passage as Passage);
      } else if (useCurrentPassage) {
        setCurrentPassage((prev) => ({
          ...prev,
          author: `Voice: ${dictationVoice}`,
          category: 'dictation',
        }));
      }

      if (payload.audioBase64) {
        const mimeType = payload.mimeType || 'audio/wav';
        onSetDictationAudio(`data:${mimeType};base64,${payload.audioBase64}`);
      } else {
        throw new Error('No playable audio returned from server.');
      }
    } catch (err) {
      setDictationError(err instanceof Error ? err.message : 'Unable to generate dictation audio.');
    } finally {
      setIsGeneratingDictation(false);
    }
  };

  const pbKey =
    testMode === 'time'
      ? `time-${selectedDifficulty}-${selectedDuration}`
      : testMode === 'words'
      ? `words-${selectedWordCount}`
      : testMode === 'dictation'
      ? `dictation-${selectedDifficulty}`
      : 'zen';
  const currentPb = personalBests[pbKey] || personalBests[`${selectedDifficulty}-${selectedDuration}`];

  // Global enter key listener to start test (disabled while modals or inputs are active)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onStartTest(
          currentPassage,
          testMode,
          testMode === 'time' ? selectedDuration : undefined,
          testMode === 'words' ? selectedWordCount : undefined,
          selectedDifficulty,
          testMode === 'dictation' ? dictationAudioSrc : null,
          dictationBlindMode
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentPassage,
    testMode,
    selectedDuration,
    selectedWordCount,
    selectedDifficulty,
    dictationAudioSrc,
    dictationBlindMode,
    onStartTest,
    isModalOpen,
  ]);

  const isPreviewMasked =
    testMode === 'dictation' && dictationBlindMode && Boolean(dictationAudioSrc);
  const systemPrefersDark =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  const isDark = !isLightTheme(settings.theme, systemPrefersDark);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-6 animate-fadeIn">
      {/* Primary Mode Switcher Tab Bar */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-tf-elevated border border-tf-border/40 rounded-xl shadow-md">
        <button
          onClick={() => onChangeTestMode('time')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            testMode === 'time'
              ? 'bg-tf-accent text-slate-950 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Time Sprint</span>
        </button>

        <button
          onClick={() => onChangeTestMode('words')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            testMode === 'words'
              ? 'bg-tf-accent text-slate-950 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Words Drill</span>
        </button>

        <button
          onClick={() => onChangeTestMode('zen')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            testMode === 'zen'
              ? 'bg-tf-accent text-slate-950 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zen Mode</span>
        </button>

        <button
          onClick={() => onChangeTestMode('dictation')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            testMode === 'dictation'
              ? 'bg-tf-accent text-slate-950 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Audio Dictation</span>
        </button>

        <div className="h-4 w-px bg-tf-border/40 mx-1 hidden sm:block" />

        <button
          onClick={onOpenCustomModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-tf-accent hover:bg-white/5 transition-colors whitespace-nowrap"
        >
          <Code className="w-3.5 h-3.5" />
          <span>Custom / Code</span>
        </button>
      </div>

      {/* Mode Sub-parameters */}
      <div className="w-full flex flex-col gap-3 border border-tf-border/30 bg-tf-elevated/80 backdrop-blur-md rounded-xl p-3">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Difficulty segmented control (when in time, zen, or dictation mode) */}
          {testMode !== 'words' ? (
            <div className="flex items-center gap-1.5 p-1 bg-tf-bg rounded-lg border border-tf-border/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5">
                Difficulty
              </span>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => onChangeDifficulty(diff)}
                  className={`px-3.5 py-1.5 text-xs font-semibold capitalize rounded-md transition-all whitespace-nowrap ${
                    selectedDifficulty === diff
                      ? 'bg-gradient-to-r from-tf-accent to-tf-accent-hover text-slate-950 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_40%,transparent)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono px-2">
              Random high-frequency typing vocabulary
            </div>
          )}

          {/* Time Duration selector (Time mode) */}
          {testMode === 'time' && (
            <div className="flex items-center gap-1.5 p-1 bg-tf-bg rounded-lg border border-tf-border/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5">
                Duration
              </span>
              {([15, 30, 60, 120] as TestDuration[]).map((dur) => (
                <button
                  key={dur}
                  onClick={() => onChangeDuration(dur)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap tabular-nums ${
                    selectedDuration === dur
                      ? 'bg-tf-accent-2 text-white shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent-2)_40%,transparent)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          )}

          {/* Word count selector (Words mode) */}
          {testMode === 'words' && (
            <div className="flex items-center gap-1.5 p-1 bg-tf-bg rounded-lg border border-tf-border/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5">
                Word Count
              </span>
              {([10, 25, 50, 100] as WordCount[]).map((count) => (
                <button
                  key={count}
                  onClick={() => onChangeWordCount(count)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap tabular-nums ${
                    selectedWordCount === count
                      ? 'bg-tf-accent-2 text-white shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent-2)_40%,transparent)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {count} words
                </button>
              ))}
            </div>
          )}

          {/* Zen mode notice */}
          {testMode === 'zen' && (
            <div className="text-xs text-tf-accent font-mono px-3">
              No countdown · Type freely until finished
            </div>
          )}

          {/* Dictation Blind / Guided toggle */}
          {testMode === 'dictation' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChangeDictationBlindMode(!dictationBlindMode)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${
                  dictationBlindMode
                    ? 'border-tf-accent-2/60 bg-tf-accent-2/20 text-slate-100'
                    : 'border-tf-accent/40 bg-tf-accent/10 text-tf-accent'
                }`}
                title="Toggle whether untyped characters are masked during audio dictation"
              >
                {dictationBlindMode ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-tf-accent-2" />
                    <span>Blind Ear Mode</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Guided Text Mode</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Audio Dictation AI Generator Controls */}
        {testMode === 'dictation' && (
          <div className="w-full pt-3 border-t border-tf-border/30 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              <select
                value={dictationVoice}
                onChange={(e) => setDictationVoice(e.target.value as DictationVoice)}
                aria-label="Dictation voice"
                className="bg-tf-bg border border-tf-border/40 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-tf-accent"
              >
                {DICTATION_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={dictationTopic}
                onChange={(e) => setDictationTopic(e.target.value)}
                placeholder="Optional topic (e.g., Space telescopes, Jazz, TypeScript)..."
                className="flex-1 bg-tf-bg border border-tf-border/40 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-tf-accent"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateDictation(false)}
                  disabled={isGeneratingDictation}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-tf-accent-2 hover:bg-tf-accent-2-hover text-white text-xs font-bold transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {isGeneratingDictation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Generate Audio Passage</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateDictation(true)}
                  disabled={isGeneratingDictation}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-tf-accent/40 text-tf-accent hover:bg-tf-accent/10 text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-50"
                  title="Synthesize speech for the passage currently shown below"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Voice Current Passage</span>
                </button>
              </div>
            </div>

            {dictationError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dictationError}</span>
              </div>
            )}

            {dictationAudioSrc && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 py-2 rounded-lg bg-tf-bg border border-tf-accent/30">
                <div className="flex items-center gap-2 text-xs text-tf-accent font-medium whitespace-nowrap">
                  <Headphones className="w-3.5 h-3.5 shrink-0" />
                  <span>Audio ready ({dictationVoice}) · Preview or start test</span>
                </div>
                <audio
                  controls
                  src={dictationAudioSrc}
                  className="h-8 w-full sm:w-72"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Benchmark Ribbon, Challenge Rules & Ghost Pace status */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Personal Best:</span>
          {currentPb ? (
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              <span className="text-teal-700 dark:text-tf-accent">{currentPb.netWpm} WPM</span> · {currentPb.accuracy}% Accuracy
            </span>
          ) : (
            <span className="text-slate-500 italic">No record yet</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Quick Challenge Rule Toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-tf-elevated border border-tf-border/40">
            <ShieldAlert
              className={`w-3.5 h-3.5 ml-1.5 mr-0.5 ${
                settings.challengeMode && settings.challengeMode !== 'none'
                  ? 'text-rose-400'
                  : 'text-slate-500'
              }`}
            />
            {(
              [
                { id: 'none', label: 'Standard' },
                { id: 'sudden_death', label: 'Sudden Death' },
                { id: 'min_wpm', label: `Min ${settings.minWpmFloor || 40} WPM` },
              ] as { id: ChallengeMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ challengeMode: opt.id })}
                className={`px-2 py-1 rounded text-[11px] font-sans font-semibold transition-colors whitespace-nowrap ${
                  (settings.challengeMode || 'none') === opt.id
                    ? opt.id === 'none'
                      ? 'bg-white/10 text-slate-100'
                      : 'bg-rose-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {settings.challengeMode === 'min_wpm' && (
            <select
              aria-label="Minimum WPM floor"
              value={settings.minWpmFloor || 40}
              onChange={(e) => onUpdateSettings({ minWpmFloor: Number(e.target.value) })}
              className="bg-tf-elevated border border-rose-500/40 rounded-lg px-2 py-1 text-[11px] font-mono text-rose-300 focus:outline-none"
            >
              {[30, 40, 50, 60, 75].map((wpm) => (
                <option key={wpm} value={wpm}>
                  Floor: {wpm} WPM
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => onUpdateSettings({ stopOnError: !settings.stopOnError })}
            title="Block caret from advancing on typos until corrected"
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-sans font-semibold transition-colors whitespace-nowrap ${
              settings.stopOnError
                ? 'border-tf-accent/60 bg-tf-accent/15 text-tf-accent'
                : 'border-tf-border/40 bg-tf-elevated text-slate-400 hover:text-slate-200'
            }`}
          >
            Stop on Error: {settings.stopOnError ? 'On' : 'Off'}
          </button>

          {settings.ghostMode !== 'off' && (
            <span className="text-tf-accent-2 flex items-center gap-1">
              <span>🏎️ Ghost:</span>
              <span className="font-bold">
                {settings.ghostMode === 'pb' ? 'PB' : `${settings.ghostMode}`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Passage Showcase Card */}
      <div className="w-full border border-tf-border/40 bg-tf-card rounded-2xl p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-tf-accent/5 via-tf-accent-2/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-tf-border/30">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-tf-accent-2" />
            <h2 className="font-sans text-sm font-semibold text-slate-200 tracking-wide">
              {currentPassage.title}
            </h2>
            <span className="text-slate-600 font-mono text-xs">/</span>
            <span className="text-xs text-slate-400 font-medium">
              {currentPassage.author}
            </span>
            {currentPassage.category && (
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-tf-elevated text-tf-accent border border-tf-border/40 uppercase">
                {currentPassage.category}
              </span>
            )}
          </div>

          <button
            onClick={handleShufflePassage}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-tf-accent transition-colors px-2 py-1 rounded hover:bg-white/5"
            title="Get another random passage"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>

        {/* Passage preview text */}
        {isPreviewMasked ? (
          <div className="py-5 px-4 rounded-xl border border-dashed border-tf-accent-2/50 bg-tf-bg/70 flex items-center gap-3 text-slate-300">
            <Headphones className="w-5 h-5 text-tf-accent-2 shrink-0" />
            <p className="text-sm font-sans">
              Blind Ear Mode enabled — the passage text stays hidden until you type each character or toggle Reveal Text during the session.
            </p>
          </div>
        ) : (
          <p className="font-mono text-base md:text-lg leading-relaxed text-slate-300 line-clamp-4 tracking-normal select-none">
            {currentPassage.content}
          </p>
        )}

        <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-tf-border/20">
          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            <span>{currentPassage.content.length} characters</span>
            <span>·</span>
            <span>~{Math.round(currentPassage.content.split(/\s+/).length)} words</span>
          </div>

          <button
            onClick={() =>
              onStartTest(
                currentPassage,
                testMode,
                testMode === 'time' ? selectedDuration : undefined,
                testMode === 'words' ? selectedWordCount : undefined,
                selectedDifficulty,
                testMode === 'dictation' ? dictationAudioSrc : null,
                dictationBlindMode
              )
            }
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-tf-accent to-tf-accent-hover hover:brightness-105 text-slate-950 font-sans font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{testMode === 'dictation' ? 'Start Dictation (Enter)' : 'Start Test (Enter)'}</span>
          </button>
        </div>
      </div>

      {/* Visual Daily Typing Goal Progress Indicator */}
      <DailyGoalProgress
        todaySessions={practiceSummary.todaySessions}
        dailyGoal={practiceSummary.dailyGoal}
        todayWords={practiceSummary.todayWords}
        currentStreak={practiceSummary.currentStreak}
        unlockedBadges={practiceSummary.unlockedCount}
        totalBadges={practiceSummary.badges.length}
        onOpenHistory={onOpenHistory}
      />

      {/* 7-Day WPM Progress Recharts Line Chart */}
      <WeeklyWpmChart
        history={history}
        isDark={isDark}
        theme={settings.theme}
        onStartQuickTest={() =>
          onStartTest(
            currentPassage,
            testMode,
            testMode === 'time' ? selectedDuration : undefined,
            testMode === 'words' ? selectedWordCount : undefined,
            selectedDifficulty,
            testMode === 'dictation' ? dictationAudioSrc : null,
            dictationBlindMode
          )
        }
      />

      {/* Feature Badges / Highlights */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="p-4 rounded-xl border border-tf-border/20 bg-tf-card/80">
          <div className="flex items-center gap-2 text-tf-accent text-xs font-semibold mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Ghost Pace Car</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time visual racer pacing you against your Personal Best or target speed.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-tf-border/20 bg-tf-card/80">
          <div className="flex items-center gap-2 text-tf-accent-2 text-xs font-semibold mb-1">
            <Code className="w-3.5 h-3.5" />
            <span>Code Snippet Drills</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Practice typing TypeScript, Python, Rust, SQL syntax, or your own custom paragraphs.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-tf-border/20 bg-tf-card/80">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <Award className="w-3.5 h-3.5" />
            <span>Weak Keys Heatmap</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Analyzes problem keys and finger hesitation to help optimize overall accuracy.
          </p>
        </div>
      </div>
    </div>
  );
};
