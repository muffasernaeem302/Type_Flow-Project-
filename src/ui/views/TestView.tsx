/**
 * Test View for TypeFlow
 * Real-time character-by-character typing test with live audio feedback,
 * animated user caret, ghost pace car racer, circular countdown, and per-key error telemetry.
 * Words are grouped into cohesive flex-wrap tokens to ensure the caret always stays
 * on the exact line of the current word and never floats on an empty line above.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Passage,
  TestDuration,
  WordCount,
  TestMode,
  Difficulty,
  AppSettings,
  SecondSnapshot,
  TestResult,
  PersonalBestsMap,
} from '../../shared/types.ts';
import {
  TypingEngineState,
  createInitialTypingState,
  processKeystroke,
  processBackspace,
  finishTest,
  getTypingCounts,
  computeSlowestWords,
} from '../../engine/typing.ts';
import { calculateNetWPM, calculateRawWPM, calculateAccuracy, calculateConsistency } from '../../stats/metrics.ts';
import { soundSynth } from '../../audio/synth.ts';
import { CountdownGauge } from '../components/CountdownGauge.tsx';
import { Caret } from '../components/Caret.tsx';
import { GhostCaret } from '../components/GhostCaret.tsx';
import { AlertCircle, RotateCcw, XCircle, CheckCircle2, Headphones, Play, Pause, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface TestViewProps {
  passage: Passage;
  mode: TestMode;
  duration?: TestDuration;
  targetWords?: WordCount;
  difficulty: Difficulty;
  settings: AppSettings;
  personalBests: PersonalBestsMap;
  dictationAudioSrc?: string | null;
  dictationBlindMode?: boolean;
  onFinish: (result: Omit<TestResult, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
  onRestart: () => void;
}

export const TestView: React.FC<TestViewProps> = ({
  passage,
  mode,
  duration = 30,
  targetWords = 25,
  difficulty,
  settings,
  personalBests,
  dictationAudioSrc = null,
  dictationBlindMode = false,
  onFinish,
  onCancel,
  onRestart,
}) => {
  const [engineState, setEngineState] = useState<TypingEngineState>(() =>
    createInitialTypingState(passage.content)
  );

  const [remainingSeconds, setRemainingSeconds] = useState<number>(mode === 'time' ? duration : 0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timeline, setTimeline] = useState<SecondSnapshot[]>([]);
  const [isWindowBlurred, setIsWindowBlurred] = useState<boolean>(false);
  const [ghostIndex, setGhostIndex] = useState<number>(0);

  // Audio Dictation state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1 | 1.25>(1);
  const [isBlindText, setIsBlindText] = useState<boolean>(() =>
    Boolean(dictationBlindMode && dictationAudioSrc)
  );

  // Authoritative refs to prevent closure desync and nested setState issues
  const engineStateRef = useRef<TypingEngineState>(engineState);
  engineStateRef.current = engineState;

  const timelineRef = useRef<SecondSnapshot[]>(timeline);
  timelineRef.current = timeline;

  const remainingSecondsRef = useRef<number>(mode === 'time' ? duration : 0);
  const elapsedSecondsRef = useRef<number>(0);
  const isFinalizedRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const passageContainerRef = useRef<HTMLDivElement | null>(null);
  const activeCharRef = useRef<HTMLSpanElement | null>(null);

  // Group characters into words so line breaks only occur at word boundaries
  const renderedWords = useMemo(() => {
    interface WordGroup {
      id: number;
      chars: {
        char: string;
        status: 'correct' | 'wrong' | 'pending';
        globalIndex: number;
      }[];
      hasTrailingSpace: boolean;
      spaceGlobalIndex?: number;
      spaceStatus?: 'correct' | 'wrong' | 'pending';
    }

    const groups: WordGroup[] = [];
    let currentChars: WordGroup['chars'] = [];
    let currentWordId = 0;

    engineState.characters.forEach((charItem, index) => {
      if (charItem.char === ' ') {
        groups.push({
          id: currentWordId++,
          chars: currentChars,
          hasTrailingSpace: true,
          spaceGlobalIndex: index,
          spaceStatus: charItem.status,
        });
        currentChars = [];
      } else {
        currentChars.push({
          char: charItem.char,
          status: charItem.status,
          globalIndex: index,
        });
      }
    });

    if (currentChars.length > 0) {
      groups.push({
        id: currentWordId++,
        chars: currentChars,
        hasTrailingSpace: false,
      });
    }

    return groups;
  }, [engineState.characters]);

  // Determine Ghost Pace target WPM
  const getTargetGhostWpm = useCallback((): number => {
    if (settings.ghostMode === 'off') return 0;
    if (settings.ghostMode === '60') return 60;
    if (settings.ghostMode === '80') return 80;
    if (settings.ghostMode === '100') return 100;
    if (settings.ghostMode === 'pb') {
      const pbKey =
        mode === 'time'
          ? `time-${difficulty}-${duration}`
          : mode === 'words'
          ? `words-${targetWords}`
          : mode === 'dictation'
          ? `dictation-${difficulty}`
          : 'zen';
      const record = personalBests[pbKey] || personalBests[`${difficulty}-${duration}`];
      return record ? record.netWpm : 65;
    }
    return 0;
  }, [settings.ghostMode, mode, difficulty, duration, targetWords, personalBests]);

  const targetGhostWpm = getTargetGhostWpm();

  // Sync sound settings
  useEffect(() => {
    soundSynth.setConfig(settings.soundProfile, settings.soundVolume, settings.congratsSound);
  }, [settings.soundProfile, settings.soundVolume, settings.congratsSound]);

  // Sync dictation playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Keep input focused
  const ensureInputFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, []);

  const toggleAudioPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !dictationAudioSrc) return;
    if (audio.paused) {
      audio.playbackRate = playbackRate;
      audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
    ensureInputFocus();
  }, [dictationAudioSrc, playbackRate, ensureInputFocus]);

  const replayAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !dictationAudioSrc) return;
    audio.currentTime = 0;
    audio.playbackRate = playbackRate;
    audio.play().catch(() => undefined);
    ensureInputFocus();
  }, [dictationAudioSrc, playbackRate, ensureInputFocus]);

  useEffect(() => {
    ensureInputFocus();
    const handleDocumentClick = () => ensureInputFocus();
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [ensureInputFocus]);

  // Handle window blur / focus mid-test
  useEffect(() => {
    const handleBlur = () => {
      if (engineStateRef.current.isStarted && !engineStateRef.current.isFinished) {
        setIsWindowBlurred(true);
      }
    };
    const handleFocus = () => {
      setIsWindowBlurred(false);
      ensureInputFocus();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [ensureInputFocus]);

  // Decoupled test completion handler
  const completeTestSession = useCallback(
    (
      finalState: TypingEngineState,
      explicitElapsed?: number,
      challengeFailed?: boolean,
      challengeFailureReason?: string
    ) => {
      if (isFinalizedRef.current) return;
      isFinalizedRef.current = true;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const completed = finishTest(finalState);
      setEngineState(completed);

      const preciseSeconds =
        completed.startTime && completed.endTime
          ? Math.max(0.5, (completed.endTime - completed.startTime) / 1000)
          : Math.max(1, elapsedSecondsRef.current);

      const totalTime = explicitElapsed ?? preciseSeconds;
      const counts = getTypingCounts(completed);
      const effectiveErrors = settings.stopOnError ? completed.errorKeystrokes : counts.wrong;
      const effectiveTotalTyped = settings.stopOnError
        ? Math.max(counts.correct, completed.totalKeystrokes)
        : counts.totalTyped;
      const netWpm = calculateNetWPM(counts.correct, totalTime);
      const rawWpm = calculateRawWPM(effectiveTotalTyped, totalTime);
      const accuracy = calculateAccuracy(counts.correct, effectiveTotalTyped);

      // Ensure timeline always captures the final state (important for fast Words/Zen sprints)
      const finalSecond = Math.max(1, Math.round(totalTime));
      const existingTimeline = timelineRef.current;
      const lastSnap = existingTimeline[existingTimeline.length - 1];
      const finalTimeline: SecondSnapshot[] =
        existingTimeline.length === 0 || lastSnap.second < finalSecond || lastSnap.wpm !== netWpm
          ? [
              ...existingTimeline,
              {
                second: lastSnap && lastSnap.second >= finalSecond ? lastSnap.second + 1 : finalSecond,
                wpm: netWpm,
                rawWpm,
                errors: effectiveErrors,
              },
            ]
          : existingTimeline;

      const consistency = calculateConsistency(finalTimeline);
      const slowestWords = computeSlowestWords(completed, 5);
      const characterReview = completed.characters
        .slice(0, completed.currentIndex)
        .slice(0, 600)
        .map(({ char, status, typedChar }) => ({ char, status, typedChar }));

      setTimeout(() => {
        onFinish({
          mode,
          duration: mode === 'time' ? duration : undefined,
          targetWords: mode === 'words' ? targetWords : undefined,
          difficulty,
          passageTitle: passage.title,
          netWpm,
          rawWpm,
          accuracy,
          errors: effectiveErrors,
          totalTypedChars: effectiveTotalTyped,
          correctChars: counts.correct,
          consistency,
          timeline: finalTimeline,
          missedKeys: completed.missedKeys,
          characterReview,
          slowestWords,
          challengeMode: settings.challengeMode || 'none',
          challengeFailed: Boolean(challengeFailed),
          challengeFailureReason,
        });
      }, 0);
    },
    [mode, duration, targetWords, difficulty, passage.title, settings.challengeMode, settings.stopOnError, onFinish]
  );

  // Timer interval once started
  useEffect(() => {
    if (!engineState.isStarted || engineState.isFinished || isFinalizedRef.current) {
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      if (isFinalizedRef.current) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        return;
      }

      elapsedSecondsRef.current += 1;
      const currentElapsed = elapsedSecondsRef.current;
      setElapsedSeconds(currentElapsed);

      if (mode === 'time') {
        remainingSecondsRef.current -= 1;
        const currentSecondsLeft = remainingSecondsRef.current;
        setRemainingSeconds(currentSecondsLeft);

        if (currentSecondsLeft <= 0) {
          completeTestSession(engineStateRef.current, duration);
          return;
        }
      }

      // Update Ghost Pace character position
      if (targetGhostWpm > 0) {
        const calculatedGhostChars = Math.floor(currentElapsed * ((targetGhostWpm * 5) / 60));
        setGhostIndex(Math.min(calculatedGhostChars, passage.content.length));
      }

      // Record snapshot
      const currentCounts = getTypingCounts(engineStateRef.current);
      const currentEffectiveErrors = settings.stopOnError
        ? engineStateRef.current.errorKeystrokes
        : currentCounts.wrong;
      const currentEffectiveTotal = settings.stopOnError
        ? Math.max(currentCounts.correct, engineStateRef.current.totalKeystrokes)
        : currentCounts.totalTyped;
      const currentNetWpm = calculateNetWPM(currentCounts.correct, currentElapsed);
      const currentRawWpm = calculateRawWPM(currentEffectiveTotal, currentElapsed);

      const newSnapshot: SecondSnapshot = {
        second: currentElapsed,
        wpm: currentNetWpm,
        rawWpm: currentRawWpm,
        errors: currentEffectiveErrors,
      };

      timelineRef.current = [...timelineRef.current, newSnapshot];
      setTimeline((prev) => [...prev, newSnapshot]);

      // Challenge Rule: Minimum WPM Floor (checked after 3s warm-up)
      if (
        settings.challengeMode === 'min_wpm' &&
        currentElapsed >= 3 &&
        currentNetWpm < (settings.minWpmFloor || 40)
      ) {
        completeTestSession(
          engineStateRef.current,
          currentElapsed,
          true,
          `Pace Floor: Speed dropped to ${currentNetWpm} WPM (minimum ${settings.minWpmFloor || 40} WPM)`
        );
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [
    engineState.isStarted,
    engineState.isFinished,
    mode,
    duration,
    targetGhostWpm,
    passage.content.length,
    settings.challengeMode,
    settings.minWpmFloor,
    settings.stopOnError,
    completeTestSession,
  ]);

  // Handle keystroke input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      onRestart();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.code === 'Space' && dictationAudioSrc) {
      e.preventDefault();
      replayAudio();
      return;
    }

    // Shift+Enter to finish Zen mode session
    if (mode === 'zen' && e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (!engineStateRef.current.isStarted) {
        onCancel();
      } else {
        completeTestSession(engineStateRef.current);
      }
      return;
    }

    if (engineState.isFinished || isFinalizedRef.current) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const updated = processBackspace(engineState);
      setEngineState(updated);
      soundSynth.playKeyClick(false, false);
      return;
    }

    // Ignore modifier keys, functional keys, arrows, etc.
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    e.preventDefault();
    const isSpace = e.key === ' ';
    const targetChar = engineState.characters[engineState.currentIndex]?.char;
    const isError = targetChar !== undefined && e.key !== targetChar;

    // Auto-play dictation audio on the first typed character
    if (!engineState.isStarted && mode === 'dictation' && dictationAudioSrc && audioRef.current?.paused) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(() => undefined);
    }

    soundSynth.playKeyClick(isSpace, isError);

    const updated = processKeystroke(
      engineState,
      e.key,
      Date.now(),
      Boolean(settings.stopOnError)
    );
    setEngineState(updated);

    // Challenge Rule: Sudden Death ends immediately on first incorrect character
    if (settings.challengeMode === 'sudden_death' && isError) {
      completeTestSession(
        updated,
        undefined,
        true,
        `Sudden Death: Mistyped "${e.key}" instead of "${targetChar === ' ' ? 'Space' : targetChar}"`
      );
      return;
    }

    // Check completion condition
    if (updated.isFinished) {
      completeTestSession(updated);
    }
  };

  // Auto-scroll passage view accurately after activeCharRef updates
  useEffect(() => {
    if (!activeCharRef.current || !passageContainerRef.current) return;
    const container = passageContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const charRect = activeCharRef.current.getBoundingClientRect();
    const relativeTop = charRect.top - containerRect.top;

    if (relativeTop > containerRect.height - 96) {
      container.scrollBy({ top: relativeTop - 72, behavior: 'smooth' });
    } else if (relativeTop < 28) {
      container.scrollBy({ top: relativeTop - 36, behavior: 'smooth' });
    }
  }, [engineState.currentIndex]);

  // Font size styling
  const fontSizeClass =
    settings.fontSize === 'compact'
      ? 'text-lg leading-relaxed'
      : settings.fontSize === 'large'
      ? 'text-2xl leading-[2.2]'
      : 'text-xl leading-[2.1]';

  // Live metrics calculation
  const totalElapsed = Math.max(1, elapsedSeconds);
  const counts = getTypingCounts(engineState);
  const liveErrors = settings.stopOnError ? engineState.errorKeystrokes : counts.wrong;
  const liveTotalTyped = settings.stopOnError
    ? Math.max(counts.correct, engineState.totalKeystrokes)
    : counts.totalTyped;
  const liveNetWpm = engineState.isStarted ? calculateNetWPM(counts.correct, totalElapsed) : 0;
  const liveAccuracy = engineState.isStarted ? calculateAccuracy(counts.correct, liveTotalTyped) : 100;

  // Words mode & Dictation progress
  const typedSlice = engineState.passageText.slice(0, engineState.currentIndex).trim();
  const wordsTyped = typedSlice ? typedSlice.split(/\s+/).length : 0;
  const totalPassageWords = useMemo(
    () => engineState.passageText.trim().split(/\s+/).filter(Boolean).length,
    [engineState.passageText]
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-6">
      {dictationAudioSrc && (
        <audio
          ref={audioRef}
          src={dictationAudioSrc}
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onEnded={() => setIsAudioPlaying(false)}
          className="hidden"
        />
      )}

      {/* Hidden input element capturing keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute pointer-events-none -left-[9999px] -top-[9999px]"
        autoFocus
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        aria-label="Typing test input buffer"
      />

      {/* Top Test Control Bar */}
      <div className="w-full flex items-center justify-between px-2">
        {/* Left: Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors px-2.5 py-1.5 rounded-lg border border-tf-border/30 hover:bg-rose-500/10"
            title="Cancel test (Esc)"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-tf-accent transition-colors px-2.5 py-1.5 rounded-lg border border-tf-border/30 hover:bg-tf-accent/10"
            title="Restart test (Ctrl+R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          {mode === 'zen' && (
            <button
              onClick={() => {
                if (!engineStateRef.current.isStarted) {
                  onCancel();
                } else {
                  completeTestSession(engineStateRef.current);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-tf-accent hover:bg-tf-accent/10 transition-colors px-3 py-1.5 rounded-lg border border-tf-accent/40"
              title="Finish Zen session (Shift+Enter)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done (Shift+Enter)</span>
            </button>
          )}

          {settings.challengeMode === 'sudden_death' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-500/10 text-[11px] font-semibold text-rose-300 whitespace-nowrap">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Sudden Death</span>
            </div>
          )}

          {settings.challengeMode === 'min_wpm' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold font-mono tabular-nums whitespace-nowrap ${
                engineState.isStarted &&
                elapsedSeconds >= 2 &&
                liveNetWpm < (settings.minWpmFloor || 40) + 5
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-300 animate-pulse'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Floor ≥ {settings.minWpmFloor || 40} WPM</span>
            </div>
          )}
          {settings.stopOnError && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-tf-accent/40 bg-tf-accent/10 text-[11px] font-semibold text-tf-accent whitespace-nowrap">
              <span>Stop on Error</span>
            </div>
          )}
        </div>

        {/* Center: Live Stats Gauge & Figures */}
        <div className="flex items-center gap-6">
          {settings.liveStatsVisible && (
            <div className="flex items-center gap-5 text-xs font-mono tabular-nums">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Speed</span>
                <span className="text-sm font-bold text-teal-700 dark:text-tf-accent">{liveNetWpm} WPM</span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Accuracy</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{liveAccuracy}%</span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Errors</span>
                <span className={`text-sm font-bold ${liveErrors > 0 ? 'text-[#f43f5e]' : 'text-slate-400'}`}>
                  {liveErrors}
                </span>
              </div>

              {/* Ghost lead indicator */}
              {targetGhostWpm > 0 && engineState.isStarted && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">vs Ghost</span>
                  <span
                    className={`text-xs font-bold ${
                      engineState.currentIndex >= ghostIndex ? 'text-emerald-400' : 'text-tf-accent-2'
                    }`}
                  >
                    {engineState.currentIndex >= ghostIndex ? '+Ahead' : '-Behind'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Mode-Specific Status Gauge */}
          {mode === 'time' && (
            <CountdownGauge remainingSeconds={Math.max(0, remainingSeconds)} totalSeconds={duration} size={58} />
          )}

          {mode === 'words' && (
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-tf-border/40 bg-tf-elevated text-xs font-mono">
              <span className="font-bold text-tf-accent-2 tabular-nums">{wordsTyped}</span>
              <span className="text-[10px] text-slate-500">/{targetWords}</span>
            </div>
          )}

          {mode === 'zen' && (
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-tf-accent/30 bg-tf-elevated text-xs font-mono">
              <span className="font-bold text-tf-accent tabular-nums">{elapsedSeconds}s</span>
              <span className="text-[9px] text-slate-500 font-sans">Zen</span>
            </div>
          )}

          {mode === 'dictation' && (
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-tf-accent-2/40 bg-tf-elevated text-xs font-mono">
              <span className="font-bold text-tf-accent tabular-nums">
                {wordsTyped}/{totalPassageWords}
              </span>
              <span className="text-[9px] text-slate-500 font-sans">Audio</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio Dictation Player Bar */}
      {(mode === 'dictation' || dictationAudioSrc) && (
        <div className="w-full px-4 py-2.5 rounded-xl border border-tf-border/40 bg-tf-elevated flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Headphones className="w-4 h-4 text-tf-accent shrink-0" />
            <span className="text-xs font-semibold text-slate-200">Audio Dictation</span>
            {dictationAudioSrc ? (
              <>
                <button
                  type="button"
                  onClick={toggleAudioPlay}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-tf-accent hover:bg-tf-accent-hover text-slate-950 font-bold text-xs transition-colors whitespace-nowrap"
                >
                  {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAudioPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={replayAudio}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-tf-border/40 text-xs text-slate-300 hover:text-tf-accent hover:bg-white/5 transition-colors whitespace-nowrap"
                  title="Replay from start (Ctrl+Space)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Replay</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-400">
                No audio synthesized for this passage — typing in standard text mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dictationAudioSrc && (
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-tf-bg border border-tf-border/40">
                {([0.75, 1, 1.25] as const).map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(rate);
                      ensureInputFocus();
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold tabular-nums transition-colors ${
                      playbackRate === rate
                        ? 'bg-tf-accent-2 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsBlindText((prev) => !prev);
                ensureInputFocus();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap ${
                isBlindText
                  ? 'border-tf-accent-2/60 bg-tf-accent-2/20 text-slate-100'
                  : 'border-tf-border/40 text-slate-300 hover:text-tf-accent'
              }`}
            >
              {isBlindText ? <Eye className="w-3.5 h-3.5 text-tf-accent-2" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isBlindText ? 'Reveal Text' : 'Mask Text'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Window blur alert banner */}
      {isWindowBlurred && (
        <div className="w-full py-2 px-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2 animate-pulse">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Window focus lost. Click anywhere or press any key to resume typing.</span>
        </div>
      )}

      {/* Main Passage Canvas: Uses cohesive word containers with zero orphan carets */}
      <div
        ref={passageContainerRef}
        onClick={ensureInputFocus}
        className="w-full min-h-[300px] max-h-[460px] overflow-y-auto border border-tf-border/40 bg-tf-card rounded-2xl p-8 pt-9 cursor-text relative shadow-[0_12px_40px_rgba(0,0,0,0.5)] select-none focus:outline-none focus:ring-1 focus:ring-tf-accent/40 transition-all"
        tabIndex={-1}
      >
        <div className={`font-mono ${fontSizeClass} tracking-wide text-left flex flex-wrap content-start select-none leading-loose`}>
          {renderedWords.map((word) => (
            <span key={word.id} className="inline-flex items-center whitespace-nowrap mr-[0.55em] mb-1 relative">
              {word.chars.map((charItem) => {
                const isUserCurrent = charItem.globalIndex === engineState.currentIndex;
                const isGhostCurrent =
                  targetGhostWpm > 0 && charItem.globalIndex === ghostIndex && engineState.isStarted;

                let statusColor = 'text-slate-500';

                if (charItem.status === 'correct') {
                  statusColor = 'text-tf-accent';
                } else if (charItem.status === 'wrong') {
                  statusColor = 'text-[#f43f5e] bg-[#f43f5e]/20 rounded-[2px]';
                }

                const displayChar =
                  isBlindText &&
                  (charItem.status === 'pending' ||
                    (settings.stopOnError && charItem.globalIndex === engineState.currentIndex))
                    ? '•'
                    : charItem.char;

                return (
                  <span
                    key={charItem.globalIndex}
                    ref={isUserCurrent ? activeCharRef : undefined}
                    className={`relative inline-block ${statusColor} transition-colors duration-75`}
                  >
                    {isGhostCurrent && <GhostCaret label={`${targetGhostWpm} WPM`} />}
                    {isUserCurrent && <Caret style={settings.caretStyle} />}
                    {displayChar}
                  </span>
                );
              })}

              {/* Trailing Space Character associated with this word */}
              {word.hasTrailingSpace && word.spaceGlobalIndex !== undefined && (
                <span
                  ref={word.spaceGlobalIndex === engineState.currentIndex ? activeCharRef : undefined}
                  className={`relative inline-block w-[0.45em] text-center transition-colors duration-75 ${
                    word.spaceStatus === 'wrong'
                      ? 'text-[#f43f5e] bg-[#f43f5e]/30 rounded-[2px]'
                      : 'text-slate-600'
                  }`}
                >
                  {word.spaceGlobalIndex === ghostIndex && targetGhostWpm > 0 && engineState.isStarted && (
                    <GhostCaret label={`${targetGhostWpm} WPM`} />
                  )}
                  {word.spaceGlobalIndex === engineState.currentIndex && (
                    <Caret style={settings.caretStyle} />
                  )}
                  &nbsp;
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Start hint overlay before first keystroke */}
        {!engineState.isStarted && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
            <span className="text-xs font-mono text-slate-500 bg-tf-bg/80 backdrop-blur px-3 py-1.5 rounded-full border border-tf-border/40 animate-pulse">
              Type any key to start the {mode} test...
            </span>
          </div>
        )}
      </div>

      {/* Footer shortcut hints */}
      <div className="w-full flex items-center justify-between text-xs text-slate-500 font-mono px-2">
        <div className="flex items-center gap-3">
          <span>{passage.title}</span>
          <span>·</span>
          <span>{passage.author}</span>
        </div>

        <div className="flex items-center gap-4">
          {dictationAudioSrc && (
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-tf-border/30 text-[10px]">Ctrl+Space</kbd> Replay
            </span>
          )}
          {mode === 'zen' && (
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-tf-border/30 text-[10px]">Shift+Enter</kbd> Finish
            </span>
          )}
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-tf-border/30 text-[10px]">Ctrl+R</kbd> Restart
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-tf-border/30 text-[10px]">Esc</kbd> Cancel
          </span>
        </div>
      </div>
    </div>
  );
};
