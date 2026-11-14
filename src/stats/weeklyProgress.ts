/**
 * Pure 7-Day WPM Progress Aggregator for TypeFlow
 * Computes daily Average Net WPM, Peak WPM, Accuracy, and session counts
 * across the trailing 7 calendar days for the dashboard Recharts trend graph.
 */

import { TestResult } from '../shared/types.ts';

export interface DailyWpmPoint {
  dateKey: string;
  label: string;
  fullDate: string;
  avgWpm: number | null;
  peakWpm: number | null;
  avgAccuracy: number | null;
  sessions: number;
}

export interface WeeklyProgressSummary {
  days: DailyWpmPoint[];
  totalSessions: number;
  activeDays: number;
  weeklyAvgWpm: number;
  weeklyPeakWpm: number;
  wpmDelta: number | null;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeLast7DaysProgress(
  history: TestResult[],
  now: number = Date.now()
): WeeklyProgressSummary {
  const buckets = new Map<string, TestResult[]>();
  const dayDates: Date[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const dt = new Date(now);
    dt.setHours(0, 0, 0, 0);
    dt.setDate(dt.getDate() - offset);
    dayDates.push(dt);
    buckets.set(toLocalDateKey(dt), []);
  }

  for (const run of history) {
    const key = toLocalDateKey(new Date(run.timestamp));
    const list = buckets.get(key);
    if (list) {
      list.push(run);
    }
  }

  let totalSessions = 0;
  let totalWpmSum = 0;
  let weeklyPeakWpm = 0;

  const days: DailyWpmPoint[] = dayDates.map((dt, idx) => {
    const key = toLocalDateKey(dt);
    const runs = buckets.get(key) || [];
    const isToday = idx === dayDates.length - 1;
    const label = isToday
      ? 'Today'
      : dt.toLocaleDateString([], { weekday: 'short' });
    const fullDate = dt.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    if (runs.length === 0) {
      return {
        dateKey: key,
        label,
        fullDate,
        avgWpm: null,
        peakWpm: null,
        avgAccuracy: null,
        sessions: 0,
      };
    }

    const wpmSum = runs.reduce((acc, r) => acc + r.netWpm, 0);
    const accSum = runs.reduce((acc, r) => acc + r.accuracy, 0);
    const peak = Math.max(...runs.map((r) => r.netWpm));

    totalSessions += runs.length;
    totalWpmSum += wpmSum;
    if (peak > weeklyPeakWpm) weeklyPeakWpm = peak;

    return {
      dateKey: key,
      label,
      fullDate,
      avgWpm: Math.round((wpmSum / runs.length) * 10) / 10,
      peakWpm: peak,
      avgAccuracy: Math.round((accSum / runs.length) * 10) / 10,
      sessions: runs.length,
    };
  });

  const activeDayPoints = days.filter((d) => d.avgWpm !== null);
  const wpmDelta =
    activeDayPoints.length >= 2
      ? Math.round(
          ((activeDayPoints[activeDayPoints.length - 1].avgWpm as number) -
            (activeDayPoints[0].avgWpm as number)) *
            10
        ) / 10
      : null;

  return {
    days,
    totalSessions,
    activeDays: activeDayPoints.length,
    weeklyAvgWpm: totalSessions > 0 ? Math.round((totalWpmSum / totalSessions) * 10) / 10 : 0,
    weeklyPeakWpm,
    wpmDelta,
  };
}
