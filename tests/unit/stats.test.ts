/**
 * Unit Tests for Statistics and Telemetry Engine
 * Verifies Net WPM, Raw WPM, accuracy, consistency calculation, and edge cases.
 */

import {
  calculateNetWPM,
  calculateRawWPM,
  calculateAccuracy,
  calculateConsistency,
  formatTime,
  CHARS_PER_WORD,
} from '../../src/stats/metrics.ts';
import { SecondSnapshot } from '../../src/shared/types.ts';

describe('Metrics and Statistics Engine', () => {
  describe('calculateNetWPM', () => {
    it('returns 0 when correct characters is 0', () => {
      expect(calculateNetWPM(0, 60)).toBe(0);
    });

    it('returns 0 when elapsed time is 0', () => {
      expect(calculateNetWPM(50, 0)).toBe(0);
    });

    it('correctly calculates Net WPM for standard 60-second trial', () => {
      // 300 correct characters in 60s (1 min) = 60 WPM
      expect(calculateNetWPM(300, 60)).toBe(60);
    });

    it('correctly calculates Net WPM for 30-second trial', () => {
      // 150 correct characters in 30s (0.5 min) = 30 words / 0.5 = 60 WPM
      expect(calculateNetWPM(150, 30)).toBe(60);
    });
  });

  describe('calculateRawWPM', () => {
    it('returns 0 when 0 keystrokes typed', () => {
      expect(calculateRawWPM(0, 60)).toBe(0);
    });

    it('calculates gross speed including errors', () => {
      // 400 total keystrokes in 60s = 80 raw WPM
      expect(calculateRawWPM(400, 60)).toBe(80);
    });
  });

  describe('calculateAccuracy', () => {
    it('returns 100% when no characters have been typed yet', () => {
      expect(calculateAccuracy(0, 0)).toBe(100);
    });

    it('returns 100% when all typed characters are correct', () => {
      expect(calculateAccuracy(100, 100)).toBe(100);
    });

    it('calculates accurate percentage when errors exist', () => {
      // 90 correct out of 100 = 90%
      expect(calculateAccuracy(90, 100)).toBe(90);
    });

    it('clamps accuracy properly to 1 decimal place', () => {
      // 95 correct out of 99 = 95.9595... -> 96
      expect(calculateAccuracy(95, 99)).toBe(96);
    });
  });

  describe('calculateConsistency', () => {
    it('returns 100% when fewer than 2 snapshots', () => {
      expect(calculateConsistency([])).toBe(100);
      expect(calculateConsistency([{ second: 1, wpm: 60, rawWpm: 60, errors: 0 }])).toBe(100);
    });

    it('returns high consistency (near 100%) for steady cadence', () => {
      const steadySnapshots: SecondSnapshot[] = [
        { second: 1, wpm: 60, rawWpm: 60, errors: 0 },
        { second: 2, wpm: 61, rawWpm: 61, errors: 0 },
        { second: 3, wpm: 59, rawWpm: 59, errors: 0 },
        { second: 4, wpm: 60, rawWpm: 60, errors: 0 },
      ];
      const consistency = calculateConsistency(steadySnapshots);
      expect(consistency).toBeGreaterThan(95);
    });

    it('returns lower consistency for wildly fluctuating cadence', () => {
      const volatileSnapshots: SecondSnapshot[] = [
        { second: 1, wpm: 20, rawWpm: 20, errors: 0 },
        { second: 2, wpm: 90, rawWpm: 90, errors: 0 },
        { second: 3, wpm: 15, rawWpm: 15, errors: 0 },
        { second: 4, wpm: 110, rawWpm: 110, errors: 0 },
      ];
      const consistency = calculateConsistency(volatileSnapshots);
      expect(consistency).toBeLessThan(70);
    });
  });

  describe('formatTime', () => {
    it('formats seconds into mm:ss', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(9)).toBe('0:09');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(120)).toBe('2:00');
    });
  });
});
