/**
 * Results View for TypeFlow
 * Displays comprehensive performance metrics, Chart.js telemetry curve,
 * personal best accolades, and Weak Keys / Error Analytics heatmap breakdown.
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, RotateCcw, ArrowRight, Play, History, Activity, AlertOctagon, CheckCircle2, Target } from 'lucide-react';
import { TestResult, Passage } from '../../shared/types.ts';
import { ThemePalette } from '../../shared/themes.ts';
import { TelemetryChart } from '../components/TelemetryChart.tsx';
import { KeyboardHeatmap } from '../components/KeyboardHeatmap.tsx';
import { PassageReview } from '../components/PassageReview.tsx';

interface ResultsViewProps {
  result: TestResult;
  passage: Passage;
  onRetry: () => void;
  onNewTest: () => void;
  onPracticeWeakKeys: (missedKeys: Record<string, number>) => void;
  onViewHistory: () => void;
  onBackHome: () => void;
  isDark?: boolean;
  themePalette?: ThemePalette;
  isModalOpen?: boolean;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  passage,
  onRetry,
  onNewTest,
  onPracticeWeakKeys,
  onViewHistory,
  onBackHome,
  isDark = true,
  themePalette,
  isModalOpen = false,
}) => {
  // Fire celebratory confetti safely if user achieved a personal best
  useEffect(() => {
    if (result.isPersonalBest) {
      try {
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: themePalette
              ? [themePalette.accent, themePalette.accent2, themePalette.accentHover, '#ffffff']
              : ['#00f5d4', '#f72585', '#7209b7', '#4cc9f0'],
          });
        }
      } catch (err) {
        console.warn('TypeFlow confetti notice:', err);
      }
    }
  }, [result.isPersonalBest, themePalette]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onRetry();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewTest();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        onViewHistory();
      } else if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onBackHome();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRetry, onNewTest, onViewHistory, onBackHome, isModalOpen]);

  // Extract top missed keys
  const missedKeyEntries = result.missedKeys
    ? Object.entries(result.missedKeys).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col items-center gap-6 animate-fadeIn">
      {/* Challenge Failed Banner */}
      {result.challengeFailed && (
        <div className="w-full py-3 px-4 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center gap-2.5 text-rose-300">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-sans text-sm font-bold tracking-wide">
            Challenge Failed — {result.challengeFailureReason || 'Rule condition triggered'}
          </span>
        </div>
      )}

      {/* Personal Best Glow Banner */}
      {!result.challengeFailed && result.isPersonalBest && (
        <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-tf-accent/15 via-tf-accent-2/15 to-tf-accent/15 border border-tf-accent/40 flex items-center justify-center gap-2 text-tf-accent shadow-[0_0_20px_color-mix(in_srgb,var(--tf-accent)_25%,transparent)]">
          <Award className="w-5 h-5 text-amber-400 animate-bounce" />
          <span className="font-sans text-sm font-bold tracking-wide">
            New Personal Best in {result.mode.toUpperCase()} mode! ({result.netWpm} WPM)
          </span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Net WPM */}
        <div className="col-span-2 md:col-span-1 p-5 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
            Net WPM
          </span>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-4xl font-mono font-black text-tf-accent tabular-nums tracking-tight">
              {result.netWpm}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Normalized WPM</span>
        </div>

        {/* Raw WPM */}
        <div className="p-5 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col justify-between">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
            Raw WPM
          </span>
          <div className="my-2">
            <span className="text-3xl font-mono font-bold text-slate-200 tabular-nums">
              {result.rawWpm}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Gross speed</span>
        </div>

        {/* Accuracy */}
        <div className="p-5 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col justify-between">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
            Accuracy
          </span>
          <div className="my-2">
            <span className="text-3xl font-mono font-bold text-emerald-400 tabular-nums">
              {result.accuracy}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {result.correctChars} / {result.totalTypedChars} chars
          </span>
        </div>

        {/* Errors */}
        <div className="p-5 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col justify-between">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
            Errors
          </span>
          <div className="my-2">
            <span
              className={`text-3xl font-mono font-bold tabular-nums ${
                result.errors > 0 ? 'text-[#f43f5e]' : 'text-slate-400'
              }`}
            >
              {result.errors}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Uncorrected</span>
        </div>

        {/* Consistency */}
        <div className="p-5 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col justify-between">
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
            Consistency
          </span>
          <div className="my-2">
            <span className="text-3xl font-mono font-bold text-tf-accent-2 tabular-nums">
              {result.consistency}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Cadence stability</span>
        </div>
      </div>

      {/* Weak Keys & Problem Key Heatmap Analysis */}
      <div className="w-full border border-tf-border/40 bg-tf-card rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-tf-accent-2" />
            <h3 className="text-sm font-semibold text-slate-200">Weak Keys & Finger Hesitation Analytics</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">
              {missedKeyEntries.length > 0 ? `${missedKeyEntries.length} problem keys identified` : 'Flawless input'}
            </span>
            {missedKeyEntries.length > 0 && result.missedKeys && (
              <button
                onClick={() => onPracticeWeakKeys(result.missedKeys!)}
                className="px-3 py-1.5 rounded-lg bg-tf-accent-2 hover:bg-tf-accent-2-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent-2)_35%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Practice Weak Keys</span>
              </button>
            )}
          </div>
        </div>

        {missedKeyEntries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {missedKeyEntries.map(([key, count]) => (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-tf-border/40 bg-tf-bg font-mono text-xs"
              >
                <span className="px-1.5 py-0.5 rounded bg-tf-elevated border border-tf-border/40 font-bold text-tf-accent-2">
                  {key}
                </span>
                <span className="text-slate-400">
                  {count} {count === 1 ? 'error' : 'errors'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero character errors! Flawless finger accuracy across the entire passage.</span>
          </div>
        )}
      </div>

      {/* Telemetry Chart Section */}
      <div className="w-full border border-tf-border/40 bg-tf-card rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-tf-border/20">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-tf-accent" />
            <h3 className="text-sm font-semibold text-slate-200">Speed Progression (Chart.js Telemetry)</h3>
          </div>
          <div className="text-xs font-mono text-slate-400">
            <span>{passage.title}</span> · <span className="capitalize">{result.mode} mode</span>
          </div>
        </div>

        <TelemetryChart
          timeline={result.timeline || []}
          isDark={isDark}
          themePalette={themePalette}
        />
      </div>

      {/* Interactive Keyboard Error Heatmap */}
      <KeyboardHeatmap
        missedKeys={result.missedKeys || {}}
        onSelectKey={(key) => onPracticeWeakKeys({ [key]: 5 })}
        title="Session Keyboard Heatmap"
        subtitle="Click any key to start a 25-word targeted drill for that key"
      />

      {/* Passage Mistake & Hesitation Review */}
      <PassageReview
        characterReview={result.characterReview}
        slowestWords={result.slowestWords}
      />

      {/* Action Buttons Row */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onRetry}
            className="px-5 py-2.5 rounded-lg bg-tf-accent hover:bg-tf-accent-hover text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_16px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Passage (Ctrl+R)</span>
          </button>

          <button
            onClick={onNewTest}
            className="px-5 py-2.5 rounded-lg border border-tf-border/50 bg-tf-elevated hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-slate-200" />
            <span>New Passage (Ctrl+N)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewHistory}
            className="px-4 py-2.5 rounded-lg border border-tf-border/40 text-slate-400 hover:text-slate-100 hover:bg-white/5 font-medium text-xs flex items-center gap-2 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>History (Ctrl+H)</span>
          </button>

          <button
            onClick={onBackHome}
            className="px-4 py-2.5 rounded-lg border border-tf-border/40 text-slate-400 hover:text-slate-100 hover:bg-white/5 font-medium text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Home (Esc)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
