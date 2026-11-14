/**
 * AiTrendInsights Component for TypeFlow (Feature 3)
 * Sends 7-day telemetry, recent runs, weak keys, and slowest words to the server-side
 * Gemini API endpoint (/api/ai/analyze-trends) to diagnose bottlenecks and recommend drills.
 */

import React, { useMemo, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Target, ArrowRight, RefreshCw } from 'lucide-react';
import { AiTrendAnalysis, TestResult } from '../../shared/types.ts';
import { computeLast7DaysProgress } from '../../stats/weeklyProgress.ts';

interface AiTrendInsightsProps {
  history: TestResult[];
  onLaunchRecommendedDrill: (
    mode: AiTrendAnalysis['recommendedMode'],
    focusKeys: string[]
  ) => void;
}

export const AiTrendInsights: React.FC<AiTrendInsightsProps> = ({
  history,
  onLaunchRecommendedDrill,
}) => {
  const [analysis, setAnalysis] = useState<AiTrendAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const telemetryPayload = useMemo(() => {
    const weeklySummary = computeLast7DaysProgress(history);
    const recentRuns = history.slice(0, 20).map((r) => ({
      mode: r.mode,
      difficulty: r.difficulty,
      netWpm: r.netWpm,
      rawWpm: r.rawWpm,
      accuracy: r.accuracy,
      consistency: r.consistency,
      errors: r.errors,
      timestamp: new Date(r.timestamp).toISOString(),
    }));

    const weakKeyMap: Record<string, number> = {};
    const slowWordMap: Record<string, { totalAvg: number; count: number }> = {};

    for (const run of history.slice(0, 25)) {
      if (run.missedKeys) {
        for (const [k, count] of Object.entries(run.missedKeys)) {
          weakKeyMap[k] = (weakKeyMap[k] || 0) + count;
        }
      }
      if (run.slowestWords) {
        for (const sw of run.slowestWords) {
          const entry = slowWordMap[sw.word] || { totalAvg: 0, count: 0 };
          entry.totalAvg += sw.avgMs;
          entry.count += 1;
          slowWordMap[sw.word] = entry;
        }
      }
    }

    const topWeakKeys = Object.entries(weakKeyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, errors]) => ({ key, errors }));

    const slowestWords = Object.entries(slowWordMap)
      .map(([word, stats]) => ({
        word,
        avgMsPerChar: Math.round(stats.totalAvg / stats.count),
      }))
      .sort((a, b) => b.avgMsPerChar - a.avgMsPerChar)
      .slice(0, 8);

    return { weeklySummary, recentRuns, topWeakKeys, slowestWords };
  }, [history]);

  const handleAnalyze = async () => {
    if (history.length === 0 || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/analyze-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetryPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not analyze typing trends.');
      }

      setAnalysis(data as AiTrendAnalysis);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Analysis request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="border border-tf-border/40 bg-tf-card rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tf-border/25">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-tf-accent-2" />
            <h3 className="text-sm font-semibold text-slate-200">
              AI 7-Day Trend &amp; Bottleneck Analysis
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Diagnoses speed dips, cadence drops, and weak-key patterns across your recent runs
          </span>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={history.length === 0 || isLoading}
          className="px-4 py-2 rounded-lg bg-tf-accent-2 hover:bg-tf-accent-2-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_14px_color-mix(in_srgb,var(--tf-accent-2)_35%,transparent)] disabled:opacity-40 disabled:pointer-events-none transition-all whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : analysis ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Analysis</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze Last 7 Days</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!analysis && !isLoading && !errorMsg && (
        <div className="text-xs text-slate-400 py-2">
          {history.length === 0
            ? 'Complete at least one typing session to unlock AI trend and bottleneck analysis.'
            : 'Click "Analyze Last 7 Days" to generate a personalized diagnosis and targeted training plan from your saved history.'}
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-4">
          {/* Headline & Bottleneck */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-tf-accent">{analysis.headline}</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="text-slate-400 font-semibold">Primary Bottleneck: </span>
              {analysis.bottleneck}
            </p>
          </div>

          <div className="h-px bg-tf-border/25" />

          {/* Action Plan */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300">Recommended Next Steps</span>
            <ol className="flex flex-col gap-1.5 text-xs text-slate-300 list-decimal list-inside">
              {analysis.actionPlan.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Focus Keys + Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-tf-border/25">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 font-sans">Focus keys:</span>
              {analysis.focusKeys && analysis.focusKeys.length > 0 ? (
                <span className="text-tf-accent-2 font-bold">
                  {analysis.focusKeys.join(' · ')}
                </span>
              ) : (
                <span className="text-slate-500">Balanced rhythm</span>
              )}
            </div>

            <button
              onClick={() =>
                onLaunchRecommendedDrill(analysis.recommendedMode, analysis.focusKeys || [])
              }
              className="px-4 py-2 rounded-lg bg-tf-accent hover:bg-tf-accent-hover text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)] transition-transform hover:scale-[1.02] whitespace-nowrap shrink-0"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Start Recommended Drill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
