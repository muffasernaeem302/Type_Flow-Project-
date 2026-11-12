/**
 * Home View for TypeFlow
 * Supports Time, Words, Zen, and Custom Code test modes,
 * personal best benchmark tracking, and passage curation.
 */

import React, { useEffect, useState } from 'react';
import { Play, Shuffle, Award, Flame, Zap, Clock, Type, Sparkles, Code } from 'lucide-react';
import {
  Difficulty,
  TestDuration,
  WordCount,
  TestMode,
  Passage,
  PersonalBestsMap,
  AppSettings,
} from '../../shared/types.ts';
import { getRandomPassage, generateWordDrill } from '../../data/texts.ts';

interface HomeViewProps {
  onStartTest: (
    passage: Passage,
    mode: TestMode,
    duration?: TestDuration,
    wordCount?: WordCount,
    difficulty?: Difficulty
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
  onOpenCustomModal: () => void;
  settings: AppSettings;
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
  onOpenCustomModal,
  settings,
}) => {
  const [currentPassage, setCurrentPassage] = useState<Passage>(() =>
    customPassage || getRandomPassage(selectedDifficulty)
  );

  // Update passage when mode or difficulty changes
  useEffect(() => {
    if (customPassage) {
      setCurrentPassage(customPassage);
    } else if (testMode === 'words') {
      setCurrentPassage(generateWordDrill(selectedWordCount));
    } else {
      setCurrentPassage(getRandomPassage(selectedDifficulty));
    }
  }, [testMode, selectedDifficulty, selectedWordCount, customPassage]);

  const handleShufflePassage = () => {
    if (testMode === 'words') {
      setCurrentPassage(generateWordDrill(selectedWordCount));
    } else {
      setCurrentPassage(getRandomPassage(selectedDifficulty, currentPassage.id));
    }
  };

  const pbKey =
    testMode === 'time'
      ? `time-${selectedDifficulty}-${selectedDuration}`
      : testMode === 'words'
      ? `words-${selectedWordCount}`
      : 'zen';
  const currentPb = personalBests[pbKey] || personalBests[`${selectedDifficulty}-${selectedDuration}`];

  // Global enter key listener to start test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onStartTest(
          currentPassage,
          testMode,
          testMode === 'time' ? selectedDuration : undefined,
          testMode === 'words' ? selectedWordCount : undefined,
          selectedDifficulty
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPassage, testMode, selectedDuration, selectedWordCount, selectedDifficulty, onStartTest]);

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-6 animate-fadeIn">
      {/* Primary Mode Switcher Tab Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-[#140c24] border border-purple-900/40 rounded-xl shadow-md">
        <button
          onClick={() => onChangeTestMode('time')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            testMode === 'time'
              ? 'bg-[#00f5d4] text-slate-950 shadow-[0_0_12px_rgba(0,245,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Time Sprint</span>
        </button>

        <button
          onClick={() => onChangeTestMode('words')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            testMode === 'words'
              ? 'bg-[#00f5d4] text-slate-950 shadow-[0_0_12px_rgba(0,245,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Words Drill</span>
        </button>

        <button
          onClick={() => onChangeTestMode('zen')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            testMode === 'zen'
              ? 'bg-[#00f5d4] text-slate-950 shadow-[0_0_12px_rgba(0,245,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zen Mode</span>
        </button>

        <div className="h-4 w-px bg-purple-900/40 mx-1" />

        <button
          onClick={onOpenCustomModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-purple-300 hover:text-[#00f5d4] hover:bg-white/5 transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
          <span>Custom / Code</span>
        </button>
      </div>

      {/* Mode Sub-parameters */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 border border-purple-900/30 bg-[#140c24]/80 backdrop-blur-md rounded-xl p-3">
        {/* Difficulty segmented control (when in time or zen mode) */}
        {testMode !== 'words' ? (
          <div className="flex items-center gap-1.5 p-1 bg-[#0b0514] rounded-lg border border-purple-900/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5">
              Difficulty
            </span>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => onChangeDifficulty(diff)}
                className={`px-3.5 py-1.5 text-xs font-semibold capitalize rounded-md transition-all whitespace-nowrap ${
                  selectedDifficulty === diff
                    ? 'bg-gradient-to-r from-[#00f5d4] to-[#00d0b0] text-slate-950 shadow-[0_0_12px_rgba(0,245,212,0.4)]'
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
          <div className="flex items-center gap-1.5 p-1 bg-[#0b0514] rounded-lg border border-purple-900/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5">
              Duration
            </span>
            {([15, 30, 60, 120] as TestDuration[]).map((dur) => (
              <button
                key={dur}
                onClick={() => onChangeDuration(dur)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap tabular-nums ${
                  selectedDuration === dur
                    ? 'bg-gradient-to-r from-[#f72585] to-[#d61b6e] text-white shadow-[0_0_12px_rgba(247,37,133,0.4)]'
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
          <div className="flex items-center gap-1.5 p-1 bg-[#0b0514] rounded-lg border border-purple-900/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-2.5">
              Word Count
            </span>
            {([10, 25, 50, 100] as WordCount[]).map((count) => (
              <button
                key={count}
                onClick={() => onChangeWordCount(count)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap tabular-nums ${
                  selectedWordCount === count
                    ? 'bg-gradient-to-r from-[#f72585] to-[#d61b6e] text-white shadow-[0_0_12px_rgba(247,37,133,0.4)]'
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
          <div className="text-xs text-[#00f5d4] font-mono px-3">
            No countdown · Type freely until finished
          </div>
        )}
      </div>

      {/* Benchmark Ribbon & Ghost Pace status */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Personal Best:</span>
          {currentPb ? (
            <span className="font-mono font-bold text-slate-100 tabular-nums">
              <span className="text-[#00f5d4]">{currentPb.netWpm} WPM</span> · {currentPb.accuracy}% Accuracy
            </span>
          ) : (
            <span className="text-slate-500 italic">No record yet</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {settings.ghostMode !== 'off' && (
            <span className="text-[#f72585] flex items-center gap-1">
              <span>🏎️ Ghost Pace:</span>
              <span className="font-bold">
                {settings.ghostMode === 'pb' ? 'Personal Best' : `${settings.ghostMode} WPM`}
              </span>
            </span>
          )}

          <div className="hidden sm:flex items-center gap-2 text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-purple-900/40 text-[11px] text-slate-400">
              Enter
            </kbd>
            <span>to start</span>
          </div>
        </div>
      </div>

      {/* Passage Showcase Card */}
      <div className="w-full border border-purple-900/40 bg-[#120a20] rounded-2xl p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-[#00f5d4]/5 via-[#f72585]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-900/30">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-[#f72585]" />
            <h2 className="font-sans text-sm font-semibold text-slate-200 tracking-wide">
              {currentPassage.title}
            </h2>
            <span className="text-slate-600 font-mono text-xs">/</span>
            <span className="text-xs text-slate-400 font-medium">
              {currentPassage.author}
            </span>
            {currentPassage.category && (
              <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/30 uppercase">
                {currentPassage.category}
              </span>
            )}
          </div>

          <button
            onClick={handleShufflePassage}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#00f5d4] transition-colors px-2 py-1 rounded hover:bg-white/5"
            title="Get another random passage"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>

        {/* Passage preview text */}
        <p className="font-mono text-base md:text-lg leading-relaxed text-slate-300 line-clamp-4 tracking-normal select-none">
          {currentPassage.content}
        </p>

        <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-purple-900/20">
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
                selectedDifficulty
              )
            }
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#00f5d4] to-[#00d0b0] hover:from-[#26ffe2] hover:to-[#00f5d4] text-slate-950 font-sans font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,245,212,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Start Test (Enter)</span>
          </button>
        </div>
      </div>

      {/* Feature Badges / Highlights */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="p-4 rounded-xl border border-purple-900/20 bg-[#120a20]/60">
          <div className="flex items-center gap-2 text-[#00f5d4] text-xs font-semibold mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Ghost Pace Car</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time visual racer pacing you against your Personal Best or target speed.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-purple-900/20 bg-[#120a20]/60">
          <div className="flex items-center gap-2 text-[#f72585] text-xs font-semibold mb-1">
            <Code className="w-3.5 h-3.5" />
            <span>Code Snippet Drills</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Practice typing TypeScript, Python, Rust, SQL syntax, or your own custom paragraphs.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-purple-900/20 bg-[#120a20]/60">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
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
