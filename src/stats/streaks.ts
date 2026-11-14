/**
 * Pure Streak, Daily Practice Goal & Milestone Badge Calculator for TypeFlow
 * Computes daily streaks, daily progress, and earned achievements strictly from persisted history.
 */

import { TestResult } from '../shared/types.ts';

export interface MilestoneBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
}

export interface PracticeProgressSummary {
  currentStreak: number;
  longestStreak: number;
  practicedToday: boolean;
  todaySessions: number;
  todayWords: number;
  dailyGoal: number;
  goalCompleted: boolean;
  badges: MilestoneBadge[];
  unlockedCount: number;
}

function getLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt.getTime());
}

export function computePracticeProgress(
  history: TestResult[],
  dailyGoal: number = 5,
  now: number = Date.now()
): PracticeProgressSummary {
  const safeGoal = Math.max(1, dailyGoal || 5);
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = shiftDateKey(todayKey, -1);

  const dayCounts = new Map<string, number>();
  let todaySessions = 0;
  let todayChars = 0;

  let maxWpm = 0;
  let maxAccuracy = 0;
  let maxConsistency = 0;
  let hasPerfectRun = false;

  for (const run of history) {
    const key = getLocalDateKey(run.timestamp);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);

    if (key === todayKey) {
      todaySessions++;
      todayChars += run.correctChars || 0;
    }

    if (run.netWpm > maxWpm) maxWpm = run.netWpm;
    if (run.accuracy > maxAccuracy) maxAccuracy = run.accuracy;
    if (run.consistency > maxConsistency) maxConsistency = run.consistency;
    if (run.accuracy === 100 && run.totalTypedChars >= 15) {
      hasPerfectRun = true;
    }
  }

  const practicedToday = todaySessions > 0;
  const sortedDays = Array.from(dayCounts.keys()).sort();

  // Compute longest streak
  let longestStreak = 0;
  let running = 0;
  let prevDay: string | null = null;
  for (const dayKey of sortedDays) {
    if (prevDay && shiftDateKey(prevDay, 1) === dayKey) {
      running++;
    } else {
      running = 1;
    }
    if (running > longestStreak) longestStreak = running;
    prevDay = dayKey;
  }

  // Compute current streak (active if practiced today or yesterday)
  let currentStreak = 0;
  let cursor = practicedToday ? todayKey : dayCounts.has(yesterdayKey) ? yesterdayKey : null;
  while (cursor && dayCounts.has(cursor)) {
    currentStreak++;
    cursor = shiftDateKey(cursor, -1);
  }

  const totalRuns = history.length;

  const badges: MilestoneBadge[] = [
    {
      id: 'first-run',
      title: 'First Keystroke',
      description: 'Complete your first typing session',
      unlocked: totalRuns >= 1,
      progressText: `${Math.min(totalRuns, 1)}/1 runs`,
    },
    {
      id: 'steady-hands',
      title: 'Steady Hands',
      description: 'Finish a test with 98%+ accuracy',
      unlocked: maxAccuracy >= 98,
      progressText: `${Math.min(Math.round(maxAccuracy), 98)}%/98%`,
    },
    {
      id: 'flawless-run',
      title: 'Flawless Run',
      description: 'Achieve 100% accuracy in a session',
      unlocked: hasPerfectRun,
      progressText: hasPerfectRun ? 'Unlocked' : '0 errors needed',
    },
    {
      id: 'speed-60',
      title: '60+ WPM Club',
      description: 'Reach 60 Net WPM or higher',
      unlocked: maxWpm >= 60,
      progressText: `${Math.min(Math.round(maxWpm), 60)}/60 WPM`,
    },
    {
      id: 'speed-90',
      title: 'Neon Velocity',
      description: 'Break 90 Net WPM in any mode',
      unlocked: maxWpm >= 90,
      progressText: `${Math.min(Math.round(maxWpm), 90)}/90 WPM`,
    },
    {
      id: 'consistency-90',
      title: 'Metronome Cadence',
      description: 'Score 90%+ cadence consistency',
      unlocked: totalRuns > 0 && maxConsistency >= 90,
      progressText: totalRuns > 0 ? `${Math.min(Math.round(maxConsistency), 90)}%/90%` : '0%/90%',
    },
    {
      id: 'streak-3',
      title: '3-Day Streak',
      description: 'Practice typing 3 days in a row',
      unlocked: longestStreak >= 3,
      progressText: `${Math.min(longestStreak, 3)}/3 days`,
    },
    {
      id: 'veteran-25',
      title: 'Dedicated Typist',
      description: 'Complete 25 typing sessions',
      unlocked: totalRuns >= 25,
      progressText: `${Math.min(totalRuns, 25)}/25 runs`,
    },
  ];

  return {
    currentStreak,
    longestStreak,
    practicedToday,
    todaySessions,
    todayWords: Math.round(todayChars / 5),
    dailyGoal: safeGoal,
    goalCompleted: todaySessions >= safeGoal,
    badges,
    unlockedCount: badges.filter((b) => b.unlocked).length,
  };
}
