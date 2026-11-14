/**
 * Passage Mistake & Hesitation Review Component for TypeFlow
 * Displays the slowest hesitated words and an interactive character-level map
 * highlighting mistyped characters and slow hesitation hotspots.
 */

import React, { useMemo, useState } from 'react';
import { Clock, Eye } from 'lucide-react';
import { CharacterReviewItem, WordLatencyEntry } from '../../shared/types.ts';

interface PassageReviewProps {
  characterReview?: CharacterReviewItem[];
  slowestWords?: WordLatencyEntry[];
}

export const PassageReview: React.FC<PassageReviewProps> = ({
  characterReview = [],
  slowestWords = [],
}) => {
  const [inspectedError, setInspectedError] = useState<{
    expected: string;
    typed: string;
  } | null>(null);

  const slowWordSet = useMemo(() => {
    return new Set(slowestWords.map((w) => w.word.toLowerCase()));
  }, [slowestWords]);

  const wordTokens = useMemo(() => {
    const tokens: { chars: CharacterReviewItem[]; text: string; isSlow: boolean }[] = [];
    let current: CharacterReviewItem[] = [];

    for (const item of characterReview) {
      if (item.char === ' ') {
        if (current.length > 0) {
          const text = current.map((c) => c.char).join('');
          tokens.push({
            chars: current,
            text,
            isSlow: slowWordSet.has(text.toLowerCase()),
          });
          current = [];
        }
        tokens.push({ chars: [item], text: ' ', isSlow: false });
      } else {
        current.push(item);
      }
    }

    if (current.length > 0) {
      const text = current.map((c) => c.char).join('');
      tokens.push({
        chars: current,
        text,
        isSlow: slowWordSet.has(text.toLowerCase()),
      });
    }

    return tokens;
  }, [characterReview, slowWordSet]);

  if (characterReview.length === 0 && slowestWords.length === 0) {
    return null;
  }

  return (
    <div className="w-full border border-tf-border/40 bg-tf-card rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-tf-border/25">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-tf-accent" />
          <h3 className="text-sm font-semibold text-slate-200">
            Passage Mistake &amp; Hesitation Review
          </h3>
        </div>

        <div className="text-xs font-mono">
          {inspectedError ? (
            <span className="text-rose-300">
              Expected{' '}
              <strong className="text-tf-accent">
                &quot;{inspectedError.expected === ' ' ? 'Space' : inspectedError.expected}&quot;
              </strong>{' '}
              · Typed{' '}
              <strong className="text-[#f43f5e]">
                &quot;{inspectedError.typed === ' ' ? 'Space' : inspectedError.typed}&quot;
              </strong>
            </span>
          ) : (
            <span className="text-slate-400">
              Hover highlighted red characters to inspect typos
            </span>
          )}
        </div>
      </div>

      {/* Slowest Hesitated Words */}
      {slowestWords.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Slowest Words:</span>
          </span>
          {slowestWords.map((entry, idx) => (
            <span
              key={`${entry.word}-${idx}`}
              className="font-mono tabular-nums text-slate-300 inline-flex items-center gap-1.5"
            >
              <span
                className={
                  entry.hasError
                    ? 'text-rose-300 underline decoration-rose-400/70'
                    : 'text-slate-100 underline decoration-amber-400/60'
                }
              >
                {entry.word}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-300">{entry.avgMs}ms/ch</span>
            </span>
          ))}
        </div>
      )}

      {/* Character-Level Passage Map */}
      {wordTokens.length > 0 && (
        <div className="p-4 rounded-xl bg-tf-bg border border-tf-border/30 font-mono text-sm leading-relaxed flex flex-wrap gap-y-1 max-h-48 overflow-y-auto">
          {wordTokens.map((token, tIdx) => {
            if (token.text === ' ') {
              const spaceChar = token.chars[0];
              const isWrongSpace = spaceChar.status === 'wrong';
              return (
                <span
                  key={tIdx}
                  onMouseEnter={() => {
                    if (isWrongSpace) {
                      setInspectedError({
                        expected: ' ',
                        typed: spaceChar.typedChar || '?',
                      });
                    }
                  }}
                  onMouseLeave={() => setInspectedError(null)}
                  className={
                    isWrongSpace
                      ? 'inline-block w-2.5 bg-[#f43f5e]/30 border-b-2 border-[#f43f5e] mx-0.5 cursor-help'
                      : 'inline-block w-2'
                  }
                >
                  &nbsp;
                </span>
              );
            }

            return (
              <span
                key={tIdx}
                className={`inline-flex whitespace-nowrap ${
                  token.isSlow ? 'underline decoration-dotted decoration-amber-400/60 underline-offset-4' : ''
                }`}
              >
                {token.chars.map((ch, cIdx) => {
                  const isWrong = ch.status === 'wrong';
                  return (
                    <span
                      key={cIdx}
                      onMouseEnter={() => {
                        if (isWrong) {
                          setInspectedError({
                            expected: ch.char,
                            typed: ch.typedChar || '?',
                          });
                        }
                      }}
                      onMouseLeave={() => setInspectedError(null)}
                      className={
                        isWrong
                          ? 'text-[#f43f5e] bg-[#f43f5e]/20 rounded-[2px] px-[1px] font-bold cursor-help underline decoration-[#f43f5e]'
                          : 'text-slate-300'
                      }
                    >
                      {ch.char}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
