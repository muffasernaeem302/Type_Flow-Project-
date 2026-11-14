/**
 * Interactive Visual Keyboard Heatmap Component for TypeFlow
 * Maps per-key error frequencies onto an ANSI QWERTY keyboard layout.
 * Clicking any key launches a targeted drill weighted toward that character.
 */

import React, { useMemo, useState } from 'react';
import { Keyboard, Target } from 'lucide-react';

interface KeyboardHeatmapProps {
  missedKeys: Record<string, number>;
  onSelectKey?: (key: string) => void;
  title?: string;
  subtitle?: string;
}

interface KeyDef {
  id: string;
  label: string;
  widthClass?: string;
}

const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { id: '`', label: '`' },
    { id: '1', label: '1' },
    { id: '2', label: '2' },
    { id: '3', label: '3' },
    { id: '4', label: '4' },
    { id: '5', label: '5' },
    { id: '6', label: '6' },
    { id: '7', label: '7' },
    { id: '8', label: '8' },
    { id: '9', label: '9' },
    { id: '0', label: '0' },
    { id: '-', label: '-' },
    { id: '=', label: '=' },
  ],
  [
    { id: 'q', label: 'Q' },
    { id: 'w', label: 'W' },
    { id: 'e', label: 'E' },
    { id: 'r', label: 'R' },
    { id: 't', label: 'T' },
    { id: 'y', label: 'Y' },
    { id: 'u', label: 'U' },
    { id: 'i', label: 'I' },
    { id: 'o', label: 'O' },
    { id: 'p', label: 'P' },
    { id: '[', label: '[' },
    { id: ']', label: ']' },
    { id: '\\', label: '\\' },
  ],
  [
    { id: 'a', label: 'A' },
    { id: 's', label: 'S' },
    { id: 'd', label: 'D' },
    { id: 'f', label: 'F' },
    { id: 'g', label: 'G' },
    { id: 'h', label: 'H' },
    { id: 'j', label: 'J' },
    { id: 'k', label: 'K' },
    { id: 'l', label: 'L' },
    { id: ';', label: ';' },
    { id: "'", label: "'" },
  ],
  [
    { id: 'z', label: 'Z' },
    { id: 'x', label: 'X' },
    { id: 'c', label: 'C' },
    { id: 'v', label: 'V' },
    { id: 'b', label: 'B' },
    { id: 'n', label: 'N' },
    { id: 'm', label: 'M' },
    { id: ',', label: ',' },
    { id: '.', label: '.' },
    { id: '/', label: '/' },
  ],
  [{ id: 'Space', label: 'Space', widthClass: 'w-56 sm:w-72' }],
];

const SHIFT_TO_BASE: Record<string, string> = {
  '~': '`',
  '!': '1',
  '@': '2',
  '#': '3',
  $: '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  _: '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
  '?': '/',
};

function mapKeyToPhysicalId(rawKey: string): string {
  if (rawKey === ' ' || rawKey === 'Space') return 'Space';
  if (SHIFT_TO_BASE[rawKey]) return SHIFT_TO_BASE[rawKey];
  return rawKey.toLowerCase();
}

export const KeyboardHeatmap: React.FC<KeyboardHeatmapProps> = ({
  missedKeys,
  onSelectKey,
  title = 'Interactive Keyboard Error Heatmap',
  subtitle = 'Click any key to launch a targeted accuracy drill',
}) => {
  const [hoveredKey, setHoveredKey] = useState<{ label: string; count: number } | null>(null);

  const { countsByPhysical, maxCount, totalErrors } = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    for (const [rawKey, count] of Object.entries(missedKeys || {})) {
      if (count <= 0) continue;
      const phys = mapKeyToPhysicalId(rawKey);
      map[phys] = (map[phys] || 0) + count;
      total += count;
    }
    const max = Object.values(map).length > 0 ? Math.max(...Object.values(map)) : 0;
    return { countsByPhysical: map, maxCount: max, totalErrors: total };
  }, [missedKeys]);

  const getKeyStyle = (count: number) => {
    if (count === 0 || maxCount === 0) {
      return 'border-tf-border/35 bg-tf-bg text-slate-400 hover:border-tf-accent/50 hover:text-tf-accent';
    }
    const ratio = count / maxCount;
    if (ratio >= 0.67) {
      return 'border-tf-accent-2 bg-tf-accent-2/25 text-white shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent-2)_40%,transparent)] hover:bg-tf-accent-2/35';
    }
    if (ratio >= 0.34) {
      return 'border-rose-400/70 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30';
    }
    return 'border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25';
  };

  return (
    <div className="w-full border border-tf-border/40 bg-tf-card rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-tf-border/25">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-tf-accent" />
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          </div>
          <span className="text-xs text-slate-400">{subtitle}</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          {hoveredKey ? (
            <span className="text-tf-accent flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>
                Key &quot;{hoveredKey.label}&quot;: {hoveredKey.count}{' '}
                {hoveredKey.count === 1 ? 'error' : 'errors'}
              </span>
            </span>
          ) : (
            <span className="text-slate-400">
              Total logged errors: <strong className="text-slate-200">{totalErrors}</strong>
            </span>
          )}

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-tf-bg border border-tf-border/50" />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-400/60" />
              Low
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-400/70" />
              Med
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-tf-accent-2/40 border border-tf-accent-2" />
              Hot
            </span>
          </div>
        </div>
      </div>

      {/* QWERTY Rows */}
      <div className="w-full overflow-x-auto pb-1">
        <div className="min-w-[540px] flex flex-col items-center gap-1.5 select-none">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-center gap-1.5">
              {row.map((keyDef) => {
                const count = countsByPhysical[keyDef.id] || 0;
                const width = keyDef.widthClass || 'w-9 sm:w-10';
                return (
                  <button
                    key={keyDef.id}
                    type="button"
                    onClick={() => onSelectKey?.(keyDef.id)}
                    onMouseEnter={() => setHoveredKey({ label: keyDef.label, count })}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey({ label: keyDef.label, count })}
                    onBlur={() => setHoveredKey(null)}
                    title={
                      onSelectKey
                        ? `${keyDef.label}: ${count} ${count === 1 ? 'error' : 'errors'} — click to practice`
                        : `${keyDef.label}: ${count} ${count === 1 ? 'error' : 'errors'}`
                    }
                    className={`${width} h-10 sm:h-11 rounded-lg border font-mono text-xs font-semibold flex flex-col items-center justify-center relative transition-all duration-150 ${getKeyStyle(
                      count
                    )} ${onSelectKey ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                  >
                    <span className="leading-none">{keyDef.label}</span>
                    {count > 0 && (
                      <span className="text-[9px] leading-none mt-1 opacity-90 tabular-nums">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
