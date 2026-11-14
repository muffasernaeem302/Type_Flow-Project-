/**
 * HistoryTrendChart Component for TypeFlow
 * Powered by Chart.js (bundled via npm).
 * Displays longitudinal progression of Net WPM and Accuracy (%) across saved test runs.
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
import { TestResult } from '../../shared/types.ts';
import { ThemePalette, getThemePalette } from '../../shared/themes.ts';

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

interface HistoryTrendChartProps {
  history: TestResult[];
  isDark?: boolean;
  themePalette?: ThemePalette;
}

export const HistoryTrendChart: React.FC<HistoryTrendChartProps> = ({
  history,
  isDark = true,
  themePalette,
}) => {
  const palette = themePalette ?? getThemePalette(isDark ? 'cyberpunk' : 'light', isDark);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;

    try {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      // History is stored newest-first; reverse to plot chronologically (oldest -> newest)
      const chronological = [...history].reverse();

      const labels = chronological.map((item, idx) => {
        const d = new Date(item.timestamp);
        return `#${idx + 1} (${d.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
      });

      const netWpmData = chronological.map((item) => item.netWpm);
      const accuracyData = chronological.map((item) => item.accuracy);

      const textColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? palette.gridStroke : 'rgba(0, 0, 0, 0.06)';

      const data: ChartData<'line'> = {
        labels,
        datasets: [
          {
            label: 'Net WPM',
            data: netWpmData,
            yAxisID: 'yWpm',
            borderColor: palette.accent,
            backgroundColor: isDark ? `${palette.accent}1f` : `${palette.accent}26`,
            borderWidth: 2.5,
            tension: 0.3,
            fill: true,
            pointRadius: chronological.length > 30 ? 2 : 4,
            pointHoverRadius: 6,
            pointBackgroundColor: palette.accent,
            pointBorderColor: palette.bg,
            pointBorderWidth: 2,
          },
          {
            label: 'Accuracy (%)',
            data: accuracyData,
            yAxisID: 'yAcc',
            borderColor: palette.accent2,
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.3,
            fill: false,
            pointRadius: chronological.length > 30 ? 1.5 : 3,
            pointHoverRadius: 5,
            pointBackgroundColor: palette.accent2,
          },
        ],
      };

      const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 450,
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
              title: (items) => {
                if (!items.length) return '';
                const run = chronological[items[0].dataIndex];
                const dateStr = new Date(run.timestamp).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return `${run.passageTitle} · ${dateStr}`;
              },
              label: (context) => {
                const label = context.dataset.label || '';
                const val = context.parsed.y;
                if (label.includes('Accuracy')) {
                  return `  ${label}: ${val}%`;
                }
                return `  ${label}: ${val} WPM`;
              },
              afterBody: (items) => {
                if (!items.length) return '';
                const run = chronological[items[0].dataIndex];
                const modeDetail =
                  run.mode === 'words'
                    ? `${run.targetWords || 25} words`
                    : run.mode === 'zen'
                    ? 'Zen'
                    : run.mode === 'dictation'
                    ? 'Audio Dictation'
                    : `${run.duration || 30}s`;
                return `  Mode: ${run.difficulty} · ${modeDetail} (Raw: ${run.rawWpm} WPM)`;
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
                size: 10,
              },
              maxTicksLimit: 10,
            },
          },
          yWpm: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: palette.accent,
              font: {
                family: 'JetBrains Mono',
                size: 11,
              },
            },
            title: {
              display: true,
              text: 'WPM',
              color: palette.accent,
              font: {
                family: 'JetBrains Mono',
                size: 10,
              },
            },
          },
          yAcc: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 100,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: palette.accent2,
              font: {
                family: 'JetBrains Mono',
                size: 11,
              },
              callback: (value) => `${value}%`,
            },
            title: {
              display: true,
              text: 'Accuracy',
              color: palette.accent2,
              font: {
                family: 'JetBrains Mono',
                size: 10,
              },
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
      console.warn('TypeFlow HistoryTrendChart warning:', err);
      setHasError(true);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [history, isDark, palette]);

  if (hasError) {
    return (
      <div className="w-full h-56 flex items-center justify-center text-slate-500 text-xs font-mono">
        Progress trend chart temporarily unavailable
      </div>
    );
  }

  return (
    <div className="w-full h-60 md:h-64">
      <canvas ref={canvasRef} />
    </div>
  );
};
