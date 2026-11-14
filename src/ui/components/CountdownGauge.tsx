/**
 * Circular Countdown Gauge for TypeFlow
 * Uses SVG stroke dash offset with high-contrast neon accents and tabular numerals.
 */

import React from 'react';

interface CountdownGaugeProps {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
}

export const CountdownGauge: React.FC<CountdownGaugeProps> = ({
  remainingSeconds,
  totalSeconds,
  size = 64,
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Color turns secondary accent when <= 5s
  const isUrgent = remainingSeconds <= 5 && remainingSeconds > 0;
  const strokeColor = isUrgent ? 'var(--tf-accent-2)' : 'var(--tf-accent)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-slate-300/70 dark:text-white/10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated countdown ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s ease',
          }}
        />
      </svg>
      {/* Tabular numeric center label */}
      <span
        className={`absolute font-mono text-sm font-bold tabular-nums ${
          isUrgent ? 'text-tf-accent-2' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {remainingSeconds}s
      </span>
    </div>
  );
};
