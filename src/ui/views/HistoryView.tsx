/**
 * History View for TypeFlow
 * Displays historical test performance across the last 50 tests,
 * personal best matrix, CSV export utility, and clear history with confirmation.
 */

import React, { useState } from 'react';
import { Download, Trash2, Award, Calendar, ArrowLeft, Search, Filter } from 'lucide-react';
import { TestResult, PersonalBestsMap, Difficulty, TestDuration } from '../../shared/types.ts';
import { api } from '../bridge.ts';

interface HistoryViewProps {
  history: TestResult[];
  personalBests: PersonalBestsMap;
  onClearHistory: () => void;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  personalBests,
  onClearHistory,
  onBack,
}) => {
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await api.exportHistoryCSV();
    } finally {
      setIsExporting(false);
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

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6 flex flex-col gap-6 animate-fadeIn">
      {/* Top Navigation & Action Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors px-2.5 py-1.5 rounded-lg border border-purple-900/30 hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Test (Esc)</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={history.length === 0 || isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-900/40 text-xs font-semibold text-[#00f5d4] hover:bg-[#00f5d4]/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/40 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Personal Bests Leaderboard Matrix */}
      <div className="border border-purple-900/40 bg-[#120a20] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Personal Bests Matrix (Net WPM)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-purple-900/30 text-slate-500 uppercase tracking-wider text-[11px] font-sans">
                <th className="py-2.5 px-4 text-left">Difficulty</th>
                {durations.map((dur) => (
                  <th key={dur} className="py-2.5 px-4 text-center">{dur}s</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/20">
              {difficulties.map((diff) => (
                <tr key={diff} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-sans font-semibold capitalize text-slate-300">
                    {diff}
                  </td>
                  {durations.map((dur) => {
                    const pb = personalBests[`${diff}-${dur}`];
                    return (
                      <td key={dur} className="py-3 px-4 text-center">
                        {pb ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-[#00f5d4]">{pb.netWpm} WPM</span>
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
              className="w-full bg-[#140c24] border border-purple-900/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00f5d4]"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-[#140c24] border border-purple-900/40 rounded-lg">
            {['all', 'easy', 'medium', 'hard'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterDifficulty(tab)}
                className={`px-2.5 py-1 text-xs font-medium capitalize rounded transition-colors whitespace-nowrap ${
                  filterDifficulty === tab
                    ? 'bg-[#00f5d4] text-slate-950 font-bold'
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
      <div className="border border-purple-900/40 bg-[#120a20] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
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
                <tr className="border-b border-purple-900/30 text-slate-500 uppercase tracking-wider text-[11px] font-sans bg-[#0b0514]/40">
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
              <tbody className="divide-y divide-purple-900/20">
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
                    <td className="py-3 px-4 font-sans font-medium text-slate-200 max-w-[180px] truncate">
                      {item.passageTitle}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-400 font-sans">{item.difficulty}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {item.mode === 'words'
                        ? `${item.targetWords || 25}w`
                        : item.mode === 'zen'
                        ? 'Zen'
                        : `${item.duration || 30}s`}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#00f5d4]">
                      {item.netWpm}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">{item.rawWpm}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{item.accuracy}%</td>
                    <td className="py-3 px-4 text-right text-slate-400">{item.errors}</td>
                    <td className="py-3 px-4 text-right text-[#f72585]">{item.consistency}%</td>
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
          <div className="w-full max-w-sm border border-rose-900/50 bg-[#160d2e] rounded-xl p-6 flex flex-col gap-4 shadow-2xl">
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
