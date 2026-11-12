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
} from '../../engine/typing.ts';
import { calculateNetWPM, calculateRawWPM, calculateAccuracy, calculateConsistency } from '../../stats/metrics.ts';
import { soundSynth } from '../../audio/synth.ts';
import { CountdownGauge } from '../components/CountdownGauge.tsx';
import { Caret } from '../components/Caret.tsx';
import { GhostCaret } from '../components/GhostCaret.tsx';
import { AlertCircle, RotateCcw, XCircle, CheckCircle2 } from 'lucide-react';

interface TestViewProps {
  passage: Passage;
  mode: TestMode;
  duration?: TestDuration;
  targetWords?: WordCount;
  difficulty: Difficulty;
  settings: AppSettings;
  personalBests: PersonalBestsMap;
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
          : 'zen';
      const record = personalBests[pbKey] || personalBests[`${difficulty}-${duration}`];
      return record ? record.netWpm : 65;
    }
    return 0;
  }, [settings.ghostMode, mode, difficulty, duration, targetWords, personalBests]);

  const targetGhostWpm = getTargetGhostWpm();

  // Sync sound settings
  useEffect(() => {
    soundSynth.setConfig(settings.soundProfile, settings.soundVolume);
  }, [settings.soundProfile, settings.soundVolume]);

  // Keep input focused
  const ensureInputFocus = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus({ preventScroll: true });
    }
  }, []);

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
    (finalState: TypingEngineState, explicitElapsed?: number) => {
      if (isFinalizedRef.current) return;
      isFinalizedRef.current = true;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const completed = finishTest(finalState);
      setEngineState(completed);

      const totalTime = explicitElapsed ?? Math.max(1, elapsedSecondsRef.current);
      const counts = getTypingCounts(completed);
      const netWpm = calculateNetWPM(counts.correct, totalTime);
      const rawWpm = calculateRawWPM(counts.totalTyped, totalTime);
      const accuracy = calculateAccuracy(counts.correct, counts.totalTyped);
      const consistency = calculateConsistency(timelineRef.current);

      try {
        soundSynth.playCompletionChime();
      } catch {
        // Ignore audio errors
      }

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
          errors: counts.wrong,
          totalTypedChars: counts.totalTyped,
          correctChars: counts.correct,
          consistency,
          timeline: timelineRef.current,
          missedKeys: completed.missedKeys,
        });
      }, 0);
    },
    [mode, duration, targetWords, difficulty, passage.title, onFinish]
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
      const currentNetWpm = calculateNetWPM(currentCounts.correct, currentElapsed);
      const currentRawWpm = calculateRawWPM(currentCounts.totalTyped, currentElapsed);

      const newSnapshot: SecondSnapshot = {
        second: currentElapsed,
        wpm: currentNetWpm,
        rawWpm: currentRawWpm,
        errors: currentCounts.wrong,
      };

      timelineRef.current = [...timelineRef.current, newSnapshot];
      setTimeline((prev) => [...prev, newSnapshot]);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [engineState.isStarted, engineState.isFinished, mode, duration, targetGhostWpm, passage.content.length, completeTestSession]);

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

    // Shift+Enter to finish Zen mode session
    if (mode === 'zen' && e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      completeTestSession(engineStateRef.current);
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

    soundSynth.playKeyClick(isSpace, isError);

    const updated = processKeystroke(engineState, e.key);
    setEngineState(updated);

    // Auto-scroll passage view if active character moves down
    if (activeCharRef.current && passageContainerRef.current) {
      const container = passageContainerRef.current;
      const charOffset = activeCharRef.current.offsetTop;
      if (charOffset > container.scrollTop + 140) {
        container.scrollTo({ top: charOffset - 50, behavior: 'smooth' });
      } else if (charOffset < container.scrollTop) {
        container.scrollTo({ top: Math.max(0, charOffset - 20), behavior: 'smooth' });
      }
    }

    // Check completion condition
    if (updated.isFinished) {
      completeTestSession(updated);
    }
  };

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
  const liveNetWpm = engineState.isStarted ? calculateNetWPM(counts.correct, totalElapsed) : 0;
  const liveAccuracy = engineState.isStarted ? calculateAccuracy(counts.correct, counts.totalTyped) : 100;

  // Words mode progress
  const wordsTyped = passage.content
    .slice(0, engineState.currentIndex)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-6">
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
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors px-2.5 py-1.5 rounded-lg border border-purple-900/30 hover:bg-rose-500/10"
            title="Cancel test (Esc)"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#00f5d4] transition-colors px-2.5 py-1.5 rounded-lg border border-purple-900/30 hover:bg-[#00f5d4]/10"
            title="Restart test (Ctrl+R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>

          {mode === 'zen' && (
            <button
              onClick={() => completeTestSession(engineStateRef.current)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#00f5d4] hover:bg-[#00f5d4]/10 transition-colors px-3 py-1.5 rounded-lg border border-[#00f5d4]/40"
              title="Finish Zen session (Shift+Enter)"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done (Shift+Enter)</span>
            </button>
          )}
        </div>

        {/* Center: Live Stats Gauge & Figures */}
        <div className="flex items-center gap-6">
          {settings.liveStatsVisible && (
            <div className="flex items-center gap-5 text-xs font-mono tabular-nums">
              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Speed</span>
                <span className="text-sm font-bold text-[#00f5d4]">{liveNetWpm} WPM</span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Accuracy</span>
                <span className="text-sm font-bold text-slate-200">{liveAccuracy}%</span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Errors</span>
                <span className={`text-sm font-bold ${counts.wrong > 0 ? 'text-[#f43f5e]' : 'text-slate-400'}`}>
                  {counts.wrong}
                </span>
              </div>

              {/* Ghost lead indicator */}
              {targetGhostWpm > 0 && engineState.isStarted && (
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">vs Ghost</span>
                  <span
                    className={`text-xs font-bold ${
                      engineState.currentIndex >= ghostIndex ? 'text-emerald-400' : 'text-[#f72585]'
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
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-purple-900/40 bg-[#140c24] text-xs font-mono">
              <span className="font-bold text-[#f72585] tabular-nums">{wordsTyped}</span>
              <span className="text-[10px] text-slate-500">/{targetWords}</span>
            </div>
          )}

          {mode === 'zen' && (
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-[#00f5d4]/30 bg-[#140c24] text-xs font-mono">
              <span className="font-bold text-[#00f5d4] tabular-nums">{elapsedSeconds}s</span>
              <span className="text-[9px] text-slate-500 font-sans">Zen</span>
            </div>
          )}
        </div>
      </div>

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
        className="w-full min-h-[300px] max-h-[460px] overflow-y-auto border border-purple-900/40 bg-[#120a20] rounded-2xl p-8 cursor-text relative shadow-[0_12px_40px_rgba(0,0,0,0.5)] select-none focus:outline-none focus:ring-1 focus:ring-[#00f5d4]/40 transition-all"
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
                  statusColor = 'text-[#00f5d4]';
                } else if (charItem.status === 'wrong') {
                  statusColor = 'text-[#f43f5e] bg-[#f43f5e]/20 rounded-[2px]';
                }

                return (
                  <span
                    key={charItem.globalIndex}
                    ref={isUserCurrent ? activeCharRef : undefined}
                    className={`relative inline-block ${statusColor} transition-colors duration-75`}
                  >
                    {isGhostCurrent && <GhostCaret label={`${targetGhostWpm} WPM`} />}
                    {isUserCurrent && <Caret style={settings.caretStyle} />}
                    {charItem.char}
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
            <span className="text-xs font-mono text-slate-500 bg-[#0b0514]/80 backdrop-blur px-3 py-1.5 rounded-full border border-purple-900/40 animate-pulse">
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
          {mode === 'zen' && (
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-purple-900/30 text-[10px]">Shift+Enter</kbd> Finish
            </span>
          )}
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-purple-900/30 text-[10px]">Ctrl+R</kbd> Restart
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-purple-900/30 text-[10px]">Esc</kbd> Cancel
          </span>
        </div>
      </div>
    </div>
  );
};
