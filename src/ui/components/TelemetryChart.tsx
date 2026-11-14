/**
 * TelemetryChart Component for TypeFlow
 * Powered by Chart.js (bundled via npm).
 * Visualizes second-by-second Net WPM and Raw WPM progression with cyberpunk styling.
 * Error-shielded so any canvas or rendering anomaly gracefully falls back.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { SecondSnapshot } from '../../shared/types.ts';
import { ThemePalette, getThemePalette } from '../../shared/themes.ts';

// Register Chart.js components
ChartJS.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TelemetryChartProps {
  timeline: SecondSnapshot[];
  isDark?: boolean;
  themePalette?: ThemePalette;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  timeline,
  isDark = true,
  themePalette,
}) => {
  const palette = themePalette ?? getThemePalette(isDark ? 'cyberpunk' : 'light', isDark);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      // If timeline is empty or single point, ensure at least two points for visual continuity
      const safeTimeline =
        timeline.length === 0
          ? [
              { second: 0, wpm: 0, rawWpm: 0, errors: 0 },
              { second: 1, wpm: 0, rawWpm: 0, errors: 0 },
            ]
          : timeline.length === 1
          ? [
              { second: 0, wpm: 0, rawWpm: 0, errors: 0 },
              timeline[0],
            ]
          : timeline;

      const labels = safeTimeline.map((s) => `${s.second}s`);
      const netWpmData = safeTimeline.map((s) => s.wpm);
      const rawWpmData = safeTimeline.map((s) => s.rawWpm);

      const textColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? palette.gridStroke : 'rgba(0, 0, 0, 0.06)';

      const data: ChartData<'line'> = {
        labels,
        datasets: [
          {
            label: 'Net WPM',
            data: netWpmData,
            borderColor: palette.accent,
            backgroundColor: isDark ? `${palette.accent}1a` : `${palette.accent}26`,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: safeTimeline.length > 40 ? 1 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: palette.accent,
            pointBorderColor: palette.bg,
            pointBorderWidth: 2,
          },
          {
            label: 'Raw WPM',
            data: rawWpmData,
            borderColor: palette.accent2,
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.35,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: palette.accent2,
          },
        ],
      };

      const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: textColor,
              font: {
                family: 'Plus Jakarta Sans',
                size: 12,
                weight: 500,
              },
              boxWidth: 14,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: isDark ? palette.elevated : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? palette.border : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            titleFont: {
              family: 'JetBrains Mono',
              size: 12,
              weight: 'bold',
            },
            bodyFont: {
              family: 'JetBrains Mono',
              size: 11,
            },
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `  ${label}: ${value} WPM`;
              },
              afterBody: (tooltipItems) => {
                if (tooltipItems.length > 0) {
                  const index = tooltipItems[0].dataIndex;
                  const errors = safeTimeline[index]?.errors ?? 0;
                  return errors > 0 ? `  Errors at second: ${errors}` : '';
                }
                return '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              font: {
                family: 'JetBrains Mono',
                size: 11,
              },
              maxTicksLimit: 12,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: textColor,
              font: {
                family: 'JetBrains Mono',
                size: 11,
              },
              stepSize: 20,
            },
          },
        },
      };

      chartInstanceRef.current = new ChartJS(canvasRef.current, {
        type: 'line',
        data,
        options,
      });
      setHasError(false);
    } catch (err) {
      console.warn('TypeFlow Chart.js initialization warning:', err);
      setHasError(true);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [timeline, isDark, palette]);

  if (hasError) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
        <span>Telemetry timeline graph temporarily unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-64 md:h-72">
      <canvas ref={canvasRef} />
    </div>
  );
};
