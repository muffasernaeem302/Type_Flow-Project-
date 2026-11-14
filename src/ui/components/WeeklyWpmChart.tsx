/**
 * WeeklyWpmChart Component for TypeFlow
 * Powered by Recharts.
 * Visualizes 7-day Average Net WPM and Peak WPM progression on the main dashboard.
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import { TestResult, ThemeMode } from '../../shared/types.ts';
import { getThemePalette } from '../../shared/themes.ts';
import { computeLast7DaysProgress, DailyWpmPoint } from '../../stats/weeklyProgress.ts';

interface WeeklyWpmChartProps {
  history: TestResult[];
  isDark?: boolean;
  theme?: ThemeMode;
  onStartQuickTest?: () => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyWpmPoint }>;
  isDark: boolean;
}

const WeeklyChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, isDark }) => {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs font-mono shadow-xl ${
        isDark
          ? 'bg-tf-elevated border-tf-border/60 text-slate-200'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="font-sans font-bold mb-1.5 text-[12px]">
        {point.fullDate}
      </div>
      {point.sessions > 0 ? (
        <div className="flex flex-col gap-1 tabular-nums">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Avg WPM</span>
            <span className="font-bold text-tf-accent">{point.avgWpm} WPM</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Peak WPM</span>
            <span className="font-bold text-tf-accent-2">{point.peakWpm} WPM</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Accuracy</span>
            <span className="text-emerald-400 font-semibold">{point.avgAccuracy}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-tf-border/25 text-[11px] text-slate-400">
            <span>Sessions</span>
            <span>{point.sessions}</span>
          </div>
        </div>
      ) : (
        <span className="text-slate-500 text-[11px]">No runs recorded</span>
      )}
    </div>
  );
};

export const WeeklyWpmChart: React.FC<WeeklyWpmChartProps> = ({
  history,
  isDark = true,
  theme = 'cyberpunk',
  onStartQuickTest,
}) => {
  const summary = useMemo(() => computeLast7DaysProgress(history), [history]);
  const palette = getThemePalette(theme, isDark);

  const axisTextColor = isDark ? palette.axisText : '#475569';
  const gridStroke = isDark ? palette.gridStroke : 'rgba(15, 23, 42, 0.08)';

  return (
    <section
      aria-label="7-Day WPM Progress"
      className="w-full border border-tf-border/40 bg-tf-card rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] flex flex-col gap-4"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-tf-border/25">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-tf-accent" />
            <h3 className="text-sm font-semibold text-slate-200">
              7-Day WPM Progress
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Daily average and peak Net WPM over the last 7 days
          </span>
        </div>

        {/* Weekly KPI Summary */}
        <div className="flex flex-wrap items-center gap-5 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-sans">7d Avg:</span>
            <span className="font-bold text-tf-accent">
              {summary.totalSessions > 0 ? `${summary.weeklyAvgWpm} WPM` : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-sans">7d Peak:</span>
            <span className="font-bold text-tf-accent-2">
              {summary.totalSessions > 0 ? `${summary.weeklyPeakWpm} WPM` : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-sans">Trend:</span>
            {summary.wpmDelta !== null ? (
              <span
                className={`font-bold ${
                  summary.wpmDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.wpmDelta >= 0 ? `+${summary.wpmDelta}` : summary.wpmDelta} WPM
              </span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Line Chart or Empty State */}
      {summary.totalSessions === 0 ? (
        <div className="w-full h-[200px] flex flex-col items-center justify-center text-center gap-3 rounded-xl bg-tf-bg/60 border border-tf-border/25 px-4">
          <Activity className="w-6 h-6 text-slate-500" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-slate-300">
              No typing runs recorded in the last 7 days yet
            </p>
            <p className="text-[11px] text-slate-500">
              Complete a session to start tracking your daily speed progression
            </p>
          </div>
          {onStartQuickTest && (
            <button
              onClick={onStartQuickTest}
              className="mt-1 px-4 py-1.5 rounded-lg bg-tf-accent/15 border border-tf-accent/40 text-tf-accent hover:bg-tf-accent/25 text-xs font-semibold transition-colors"
            >
              Start First Session
            </button>
          )}
        </div>
      ) : (
        <div className="w-full h-[220px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={summary.days}
              margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={axisTextColor}
                tick={{ fill: axisTextColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis
                stroke={axisTextColor}
                tick={{ fill: axisTextColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                allowDecimals={false}
              />
              <Tooltip
                content={<WeeklyChartTooltip isDark={isDark} />}
                cursor={{ stroke: `${palette.accent}40`, strokeWidth: 1 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', fontFamily: 'Plus Jakarta Sans' }}
              />
              <Line
                type="monotone"
                dataKey="avgWpm"
                name="Avg Net WPM"
                stroke={palette.accent}
                strokeWidth={2.5}
                connectNulls
                dot={{ r: 4, fill: palette.accent, stroke: palette.bg, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: palette.accent, stroke: '#ffffff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="peakWpm"
                name="Peak WPM"
                stroke={palette.accent2}
                strokeWidth={2}
                strokeDasharray="4 4"
                connectNulls
                dot={{ r: 3, fill: palette.accent2, stroke: palette.bg, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: palette.accent2, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
