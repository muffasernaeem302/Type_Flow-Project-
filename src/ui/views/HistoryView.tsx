/**
 * History View for TypeFlow
 * Displays historical test performance across the last 50 tests,
 * personal best matrix, CSV export utility, and clear history with confirmation.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Download,
  Upload,
  FileJson,
  Trash2,
  Award,
  Calendar,
  ArrowLeft,
  Search,
  TrendingUp,
  Flame,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Lock,
  Target,
} from 'lucide-react';
import { TestResult, PersonalBestsMap, Difficulty, TestDuration } from '../../shared/types.ts';
import { ThemePalette } from '../../shared/themes.ts';
import { HistoryTrendChart } from '../components/HistoryTrendChart.tsx';
import { KeyboardHeatmap } from '../components/KeyboardHeatmap.tsx';
import { AiTrendInsights } from '../components/AiTrendInsights.tsx';
import { computePracticeProgress } from '../../stats/streaks.ts';
import { AiTrendAnalysis } from '../../shared/types.ts';
import { api } from '../bridge.ts';

interface HistoryViewProps {
  history: TestResult[];
  personalBests: PersonalBestsMap;
  dailyGoal?: number;
  onPracticeWeakKeys: (missedKeys: Record<string, number>) => void;
  onLaunchRecommendedDrill: (
    mode: AiTrendAnalysis['recommendedMode'],
    focusKeys: string[]
  ) => void;
  onClearHistory: () => void;
  onProfileImported?: () => void;
  onBack: () => void;
  isDark?: boolean;
  themePalette?: ThemePalette;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  personalBests,
  dailyGoal = 5,
  onPracticeWeakKeys,
  onLaunchRecommendedDrill,
  onClearHistory,
  onProfileImported,
  onBack,
  isDark = true,
  themePalette,
}) => {
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [backupNotice, setBackupNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await api.exportHistoryCSV();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = async () => {
    const res = await api.exportProfileJSON();
    if (res.success) {
      setBackupNotice({ type: 'success', message: 'Full profile JSON backup downloaded.' });
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const raw = await file.text();
      const res = await api.importProfileJSON(raw);
      if (res.success) {
        onProfileImported?.();
        setBackupNotice({
          type: 'success',
          message: `Restored profile (${res.importedRuns} ${res.importedRuns === 1 ? 'run' : 'runs'} imported).`,
        });
      } else {
        setBackupNotice({
          type: 'error',
          message: res.error || 'Could not import JSON backup.',
        });
      }
    } catch {
      setBackupNotice({ type: 'error', message: 'Failed to read selected JSON file.' });
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesDiff = filterDifficulty === 'all' || item.difficulty === filterDifficulty;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.passageTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiff && matchesSearch;
  });

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const durations: TestDuration[] = [15, 30, 60, 120];

  const summaryStats = useMemo(() => {
    if (filteredHistory.length === 0) {
      return { totalRuns: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0 };
    }
    const totalWpm = filteredHistory.reduce((acc, r) => acc + r.netWpm, 0);
    const totalAcc = filteredHistory.reduce((acc, r) => acc + r.accuracy, 0);
    const bestWpm = Math.max(...filteredHistory.map((r) => r.netWpm));
    return {
      totalRuns: filteredHistory.length,
      avgWpm: Math.round((totalWpm / filteredHistory.length) * 10) / 10,
      bestWpm,
      avgAccuracy: Math.round((totalAcc / filteredHistory.length) * 10) / 10,
    };
  }, [filteredHistory]);

  const practiceProgress = useMemo(
    () => computePracticeProgress(history, dailyGoal),
    [history, dailyGoal]
  );

  const cumulativeMissedKeys = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const run of filteredHistory) {
      if (!run.missedKeys) continue;
      for (const [k, count] of Object.entries(run.missedKeys)) {
        agg[k] = (agg[k] || 0) + count;
      }
    }
    return agg;
  }, [filteredHistory]);

  const hasCumulativeErrors = Object.keys(cumulativeMissedKeys).length > 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6 animate-fadeIn">
      {/* Top Navigation & Action Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors px-2.5 py-1.5 rounded-lg border border-tf-border/30 hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Test (Esc)</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJSON}
            className="hidden"
          />

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tf-accent/40 text-xs font-semibold text-tf-accent hover:bg-tf-accent/10 transition-colors whitespace-nowrap"
            title="Export settings, history, and personal bests as JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tf-accent-2/50 text-xs font-semibold text-slate-100 hover:bg-tf-accent-2/15 transition-colors whitespace-nowrap"
            title="Import a previously exported TypeFlow JSON backup"
          >
            <Upload className="w-3.5 h-3.5 text-tf-accent-2" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={history.length === 0 || isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tf-border/40 text-xs font-semibold text-slate-300 hover:text-tf-accent hover:bg-white/5 transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/40 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {backupNotice && (
        <div
          className={`flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-xs ${
            backupNotice.type === 'success'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/35 bg-rose-500/10 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {backupNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{backupNotice.message}</span>
          </div>
          <button
            onClick={() => setBackupNotice(null)}
            className="text-slate-400 hover:text-slate-200 text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Strip */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col gap-1">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
              Sessions
            </span>
            <span className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {summaryStats.totalRuns}
            </span>
          </div>
          <div className="p-4 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col gap-1">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
              Average WPM
            </span>
            <span className="text-2xl font-mono font-bold text-tf-accent tabular-nums">
              {summaryStats.avgWpm}
            </span>
          </div>
          <div className="p-4 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col gap-1">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
              Peak Net WPM
            </span>
            <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
              {summaryStats.bestWpm}
            </span>
          </div>
          <div className="p-4 rounded-xl border border-tf-border/40 bg-tf-card flex flex-col gap-1">
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-slate-400">
              Average Accuracy
            </span>
            <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
              {summaryStats.avgAccuracy}%
            </span>
          </div>
        </div>
      )}

      {/* Progress Trend Chart (Last 50 Runs) */}
      {filteredHistory.length > 0 && (
        <div className="border border-tf-border/40 bg-tf-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-tf-border/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-tf-accent" />
              <h3 className="text-sm font-semibold text-slate-200">
                WPM & Accuracy Progress Trend
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Chronological ({filteredHistory.length} {filteredHistory.length === 1 ? 'run' : 'runs'})
            </span>
          </div>
          <HistoryTrendChart
            history={filteredHistory}
            isDark={isDark}
            themePalette={themePalette}
          />
        </div>
      )}

      {/* AI 7-Day Trend & Bottleneck Analysis */}
      <AiTrendInsights
        history={history}
        onLaunchRecommendedDrill={onLaunchRecommendedDrill}
      />

      {/* Cumulative Keyboard Heatmap */}
      {filteredHistory.length > 0 && (
        <div className="flex flex-col gap-3">
          <KeyboardHeatmap
            missedKeys={cumulativeMissedKeys}
            onSelectKey={(key) => onPracticeWeakKeys({ [key]: 5 })}
            title="Cumulative Keyboard Error Heatmap"
            subtitle={`Aggregated across ${filteredHistory.length} filtered runs · Click any key to practice`}
          />
          {hasCumulativeErrors && (
            <div className="flex justify-end">
              <button
                onClick={() => onPracticeWeakKeys(cumulativeMissedKeys)}
                className="px-4 py-2 rounded-lg bg-tf-accent-2 hover:bg-tf-accent-2-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent-2)_35%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Practice Top Weak Keys</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Streaks, Daily Goal & Milestone Badges */}
      <div className="border border-tf-border/40 bg-tf-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-tf-border/25">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Streaks, Daily Goal &amp; Milestone Badges
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-mono tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <Flame className={`w-3.5 h-3.5 ${practiceProgress.currentStreak > 0 ? 'text-tf-accent-2' : 'text-slate-500'}`} />
              <span>Current Streak:</span>
              <strong className="text-slate-100">{practiceProgress.currentStreak}d</strong>
            </span>
            <span className="text-slate-400">
              Best Streak: <strong className="text-tf-accent">{practiceProgress.longestStreak}d</strong>
            </span>
            <span className="text-slate-400">
              Unlocked: <strong className="text-amber-300">{practiceProgress.unlockedCount}/{practiceProgress.badges.length}</strong>
            </span>
          </div>
        </div>

        {/* Daily Goal Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              Today&apos;s Practice Goal ({practiceProgress.todayWords} words typed today)
            </span>
            <span className="font-mono font-bold tabular-nums text-tf-accent">
              {practiceProgress.todaySessions} / {practiceProgress.dailyGoal} sessions
              {practiceProgress.goalCompleted ? ' · Completed' : ''}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-tf-bg border border-tf-border/30 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                practiceProgress.goalCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-tf-accent to-tf-accent-2'
              }`}
              style={{
                width: `${Math.min(100, Math.round((practiceProgress.todaySessions / practiceProgress.dailyGoal) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Milestone Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {practiceProgress.badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 transition-colors ${
                badge.unlocked
                  ? 'border-tf-accent/40 bg-tf-bg'
                  : 'border-tf-border/30 bg-tf-bg/50 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs font-bold ${badge.unlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                  {badge.title}
                </span>
                {badge.unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-tf-accent shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">{badge.description}</p>
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  badge.unlocked ? 'text-amber-300 font-semibold' : 'text-slate-500'
                }`}
              >
                {badge.progressText}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Bests Leaderboard Matrix */}
      <div className="border border-tf-border/40 bg-tf-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Personal Bests Matrix (Net WPM)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-tf-border/30 text-slate-500 uppercase tracking-wider text-[11px] font-sans">
                <th className="py-2.5 px-4 text-left">Difficulty</th>
                {durations.map((dur) => (
                  <th key={dur} className="py-2.5 px-4 text-center">{dur}s</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-tf-border/20">
              {difficulties.map((diff) => (
                <tr key={diff} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-sans font-semibold capitalize text-slate-300">
                    {diff}
                  </td>
                  {durations.map((dur) => {
                    const pb = personalBests[`time-${diff}-${dur}`] || personalBests[`${diff}-${dur}`];
                    return (
                      <td key={dur} className="py-3 px-4 text-center">
                        {pb ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-tf-accent">{pb.netWpm} WPM</span>
                            <span className="text-[10px] text-slate-500">{pb.accuracy}% acc</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Log Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by passage..."
              className="w-full bg-tf-elevated border border-tf-border/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-tf-accent"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-tf-elevated border border-tf-border/40 rounded-lg">
            {['all', 'easy', 'medium', 'hard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterDifficulty(tab)}
                className={`px-2.5 py-1 text-xs font-medium capitalize rounded transition-colors whitespace-nowrap ${
                  filterDifficulty === tab
                    ? 'bg-tf-accent text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono self-end sm:self-center">
          Showing {filteredHistory.length} of {history.length} runs (Max 50)
        </span>
      </div>

      {/* History Table */}
      <div className="border border-tf-border/40 bg-tf-card rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        {filteredHistory.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3">
            <Calendar className="w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-400">No test results recorded yet.</p>
            <p className="text-xs text-slate-600">Complete a typing session to populate history and personal records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono tabular-nums text-left">
              <thead>
                <tr className="border-b border-tf-border/30 text-slate-500 uppercase tracking-wider text-[11px] font-sans bg-tf-bg/40">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Passage</th>
                  <th className="py-3 px-4">Difficulty</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4 text-right">Net WPM</th>
                  <th className="py-3 px-4 text-right">Raw WPM</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Errors</th>
                  <th className="py-3 px-4 text-right">Consistency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tf-border/20">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-200 max-w-[200px] truncate">
                      <span>{item.passageTitle}</span>
                      {item.challengeFailed && (
                        <span className="ml-2 text-[10px] font-mono text-rose-400">
                          (Failed)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-400 font-sans">{item.difficulty}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.mode === 'words'
                        ? `${item.targetWords || 25}w`
                        : item.mode === 'zen'
                        ? 'Zen'
                        : item.mode === 'dictation'
                        ? 'Audio'
                        : `${item.duration || 30}s`}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-tf-accent">
                      {item.netWpm}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{item.rawWpm}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{item.accuracy}%</td>
                    <td className="py-3 px-4 text-right text-slate-400">{item.errors}</td>
                    <td className="py-3 px-4 text-right text-tf-accent-2">{item.consistency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-rose-900/50 bg-tf-elevated rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-100">Clear All History?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete all test records, second telemetry graphs, and personal best records. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
