/**
 * DailyGoalProgress Component for TypeFlow
 * Visualizes daily typing test goal completion with a circular progress gauge,
 * segmented/linear test completion bar, streak status, and badge link.
 */

import React from 'react';
import { CheckCircle2, Flame, Target, Trophy } from 'lucide-react';

interface DailyGoalProgressProps {
  todaySessions: number;
  dailyGoal: number;
  todayWords: number;
  currentStreak: number;
  unlockedBadges: number;
  totalBadges: number;
  onOpenHistory: () => void;
}

export const DailyGoalProgress: React.FC<DailyGoalProgressProps> = ({
  todaySessions,
  dailyGoal,
  todayWords,
  currentStreak,
  unlockedBadges,
  totalBadges,
  onOpenHistory,
}) => {
  const safeGoal = Math.max(1, dailyGoal);
  const ratio = Math.min(1, todaySessions / safeGoal);
  const percent = Math.round(ratio * 100);
  const goalCompleted = todaySessions >= safeGoal;
  const remaining = Math.max(0, safeGoal - todaySessions);

  // Circular SVG gauge geometry
  const size = 56;
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <section
      aria-label="Daily Typing Goal Progress"
      className="w-full border border-tf-border/40 bg-tf-card rounded-2xl px-5 py-4 shadow-[0_6px_24px_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-5"
    >
      {/* Left + Center: Circular Ring & Progress Bar */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Circular Progress Ring */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ width: size, height: size }}
          role="progressbar"
          aria-valuenow={todaySessions}
          aria-valuemin={0}
          aria-valuemax={safeGoal}
          aria-label={`Daily goal ${percent}% complete`}
        >
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="rgba(148, 163, 184, 0.2)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={goalCompleted ? '#34d399' : 'var(--tf-accent)'}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span
            className={`absolute text-xs font-mono font-bold tabular-nums ${
              goalCompleted ? 'text-emerald-400' : 'text-tf-accent'
            }`}
          >
            {percent}%
          </span>
        </div>

        {/* Title, Status & Bar */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {goalCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Target className="w-4 h-4 text-tf-accent shrink-0" />
              )}
              <span className="text-sm font-semibold text-slate-100">
                Daily Typing Goal
              </span>
              <span
                className={`text-xs font-mono tabular-nums ${
                  goalCompleted ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {goalCompleted
                  ? '· Goal reached!'
                  : `· ${remaining} ${remaining === 1 ? 'test' : 'tests'} left`}
              </span>
            </div>

            <span className="text-xs font-mono font-bold text-slate-100 tabular-nums">
              {todaySessions} / {safeGoal} tests
            </span>
          </div>

          {/* Segmented Step Bar for goals <= 12, continuous bar otherwise */}
          {safeGoal <= 12 ? (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${safeGoal}, minmax(0, 1fr))` }}>
              {Array.from({ length: safeGoal }, (_, index) => {
                const filled = index < todaySessions;
                return (
                  <div
                    key={index}
                    className={`h-2 rounded-sm transition-all duration-300 ${
                      filled
                        ? goalCompleted
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]'
                          : 'bg-gradient-to-r from-tf-accent to-tf-accent-hover shadow-[0_0_8px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)]'
                        : 'bg-tf-bg border border-tf-border/40'
                    }`}
                  />
                );
              })}
            </div>
          ) : (
            <div className="w-full h-2.5 rounded-full bg-tf-bg border border-tf-border/40 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  goalCompleted
                    ? 'bg-emerald-400'
                    : 'bg-gradient-to-r from-tf-accent to-tf-accent-2'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right: Streak, Today's Words & Badges Link */}
      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-tf-border/30 md:pl-5 shrink-0 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame
              className={`w-4 h-4 ${
                currentStreak > 0 ? 'text-tf-accent-2' : 'text-slate-500'
              }`}
            />
            <span className="font-mono font-bold text-slate-100 tabular-nums">
              {currentStreak}d
            </span>
            <span className="text-slate-400">streak</span>
          </div>

          <div className="h-3.5 w-px bg-tf-border/40" />

          <div className="text-slate-400 font-mono tabular-nums">
            <span className="font-bold text-slate-200">{todayWords}</span> words today
          </div>
        </div>

        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors whitespace-nowrap shrink-0"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            {unlockedBadges}/{totalBadges} Badges
          </span>
        </button>
      </div>
    </section>
  );
};
