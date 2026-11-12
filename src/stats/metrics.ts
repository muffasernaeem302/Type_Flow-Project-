/**
 * Pure Functional Statistics & Metrics Engine for TypeFlow
 * Free of DOM, Window, and Electron dependencies.
 */

import { SecondSnapshot } from '../shared/types.ts';

/**
 * Standard word length in typing test conventions (5 characters per word).
 */
export const CHARS_PER_WORD = 5;

/**
 * Calculates Net Words Per Minute (WPM).
 * Net WPM = (correct chars / 5) / minutes
 * Clamped to 0 if negative.
 */
export function calculateNetWPM(correctChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || correctChars <= 0) {
    return 0;
  }
  const minutes = elapsedSeconds / 60;
  const netWpm = (correctChars / CHARS_PER_WORD) / minutes;
  return Math.max(0, Math.round(netWpm * 10) / 10);
}

/**
 * Calculates Raw Words Per Minute (WPM).
 * Raw WPM = (total typed chars / 5) / minutes
 */
export function calculateRawWPM(totalTypedChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || totalTypedChars <= 0) {
    return 0;
  }
  const minutes = elapsedSeconds / 60;
  const rawWpm = (totalTypedChars / CHARS_PER_WORD) / minutes;
  return Math.max(0, Math.round(rawWpm * 10) / 10);
}

/**
 * Calculates typing accuracy percentage.
 * Accuracy = (correct chars / total typed chars) * 100
 * Clamped to [0, 100]. Returns 100 if no characters have been typed yet.
 */
export function calculateAccuracy(correctChars: number, totalTypedChars: number): number {
  if (totalTypedChars <= 0) {
    return 100;
  }
  const accuracy = (correctChars / totalTypedChars) * 100;
  return Math.min(100, Math.max(0, Math.round(accuracy * 10) / 10));
}

/**
 * Calculates Consistency percentage based on standard deviation of second-by-second WPM.
 * Consistency = 100 - Coefficient of Variation (CoV) * 100, clamped between 0 and 100.
 * If fewer than 2 snapshots or average WPM is 0, returns 100%.
 */
export function calculateConsistency(snapshots: SecondSnapshot[]): number {
  if (!snapshots || snapshots.length < 2) {
    return 100;
  }

  // Filter out any trailing zeros where test was already over or before first keystroke
  const activeWpms = snapshots.map((s) => s.wpm).filter((w) => w > 0);
  if (activeWpms.length < 2) {
    return 100;
  }

  const mean = activeWpms.reduce((sum, v) => sum + v, 0) / activeWpms.length;
  if (mean === 0) {
    return 100;
  }

  const variance =
    activeWpms.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (activeWpms.length - 1);
  const stdDev = Math.sqrt(variance);

  // Coefficient of Variation
  const cov = stdDev / mean;
  const consistency = Math.max(0, Math.min(100, (1 - cov) * 100));

  return Math.round(consistency * 10) / 10;
}

/**
 * Formats duration in seconds into mm:ss format.
 */
export function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
