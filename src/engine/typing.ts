/**
 * Pure Functional Typing Engine for TypeFlow
 * Free of DOM, Window, and Electron dependencies.
 * Tracks character matching, backspace rollback, and per-key error frequencies.
 */

import { CharacterState, WordLatencyEntry } from '../shared/types.ts';

export interface TypingEngineState {
  passageText: string;
  characters: CharacterState[];
  charLatenciesMs: number[];
  lastKeystrokeTime: number | null;
  currentIndex: number;
  totalKeystrokes: number;
  errorKeystrokes: number;
  missedKeys: Record<string, number>;
  isStarted: boolean;
  isFinished: boolean;
  startTime: number | null;
  endTime: number | null;
}

/**
 * Initializes the typing engine state from a raw passage string.
 */
export function createInitialTypingState(passageText: string): TypingEngineState {
  const normalizedText = passageText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
  const characters: CharacterState[] = normalizedText.split('').map((char) => ({
    char,
    status: 'pending',
  }));

  return {
    passageText: normalizedText,
    characters,
    charLatenciesMs: new Array(characters.length).fill(0),
    lastKeystrokeTime: null,
    currentIndex: 0,
    totalKeystrokes: 0,
    errorKeystrokes: 0,
    missedKeys: {},
    isStarted: false,
    isFinished: false,
    startTime: null,
    endTime: null,
  };
}

/**
 * Evaluates a single character keystroke against the passage text.
 */
export function processKeystroke(
  state: TypingEngineState,
  key: string,
  now: number = Date.now(),
  stopOnError: boolean = false
): TypingEngineState {
  if (state.isFinished || state.currentIndex >= state.characters.length || key.length !== 1) {
    return state;
  }

  const targetChar = state.characters[state.currentIndex].char;
  const isMatch = key === targetChar;

  const newCharacters = [...state.characters];
  newCharacters[state.currentIndex] = {
    char: targetChar,
    status: isMatch ? 'correct' : 'wrong',
    typedChar: key,
  };

  const newLatencies = [...state.charLatenciesMs];
  const deltaMs =
    state.lastKeystrokeTime !== null ? Math.min(4000, Math.max(0, now - state.lastKeystrokeTime)) : 0;
  newLatencies[state.currentIndex] = deltaMs;

  const newMissedKeys = { ...state.missedKeys };
  if (!isMatch) {
    const keyLabel = targetChar === ' ' ? 'Space' : targetChar;
    newMissedKeys[keyLabel] = (newMissedKeys[keyLabel] || 0) + 1;
  }

  const shouldAdvance = isMatch || !stopOnError;
  const nextIndex = shouldAdvance ? state.currentIndex + 1 : state.currentIndex;
  const isNowFinished = nextIndex >= state.characters.length;

  return {
    ...state,
    characters: newCharacters,
    charLatenciesMs: newLatencies,
    lastKeystrokeTime: now,
    currentIndex: nextIndex,
    totalKeystrokes: state.totalKeystrokes + 1,
    errorKeystrokes: isMatch ? state.errorKeystrokes : state.errorKeystrokes + 1,
    missedKeys: newMissedKeys,
    isStarted: true,
    startTime: state.startTime ?? now,
    isFinished: isNowFinished,
    endTime: isNowFinished ? now : null,
  };
}

/**
 * Handles backspace keystroke, reverting the previous character to pending.
 */
export function processBackspace(state: TypingEngineState): TypingEngineState {
  if (state.isFinished || state.currentIndex <= 0) {
    return state;
  }

  const prevIndex = state.currentIndex - 1;
  const prevChar = state.characters[prevIndex];

  const newCharacters = [...state.characters];
  newCharacters[prevIndex] = {
    char: prevChar.char,
    status: 'pending',
    typedChar: undefined,
  };

  return {
    ...state,
    characters: newCharacters,
    currentIndex: prevIndex,
  };
}

/**
 * Marks the test finished.
 */
export function finishTest(state: TypingEngineState, now: number = Date.now()): TypingEngineState {
  return {
    ...state,
    isFinished: true,
    endTime: state.endTime ?? now,
  };
}

/**
 * Extracts counts of correct and wrong characters currently typed.
 */
export function getTypingCounts(state: TypingEngineState): {
  correct: number;
  wrong: number;
  pending: number;
  totalTyped: number;
} {
  let correct = 0;
  let wrong = 0;

  for (let i = 0; i < state.currentIndex; i++) {
    if (state.characters[i].status === 'correct') {
      correct++;
    } else if (state.characters[i].status === 'wrong') {
      wrong++;
    }
  }

  return {
    correct,
    wrong,
    pending: state.characters.length - state.currentIndex,
    totalTyped: state.currentIndex,
  };
}

/**
 * Computes the slowest typed words by average inter-keystroke latency (ms/char).
 */
export function computeSlowestWords(state: TypingEngineState, limit: number = 5): WordLatencyEntry[] {
  const words: WordLatencyEntry[] = [];
  let currentWord = '';
  let currentTotalMs = 0;
  let latencySamples = 0;
  let hasError = false;

  const flushWord = () => {
    if (currentWord.length > 0 && latencySamples > 0) {
      words.push({
        word: currentWord,
        totalMs: Math.round(currentTotalMs),
        avgMs: Math.round(currentTotalMs / latencySamples),
        hasError,
      });
    }
    currentWord = '';
    currentTotalMs = 0;
    latencySamples = 0;
    hasError = false;
  };

  for (let i = 0; i < state.currentIndex; i++) {
    const ch = state.characters[i];
    if (ch.char === ' ') {
      flushWord();
    } else {
      currentWord += ch.char;
      if (ch.status === 'wrong') {
        hasError = true;
      }
      const lat = state.charLatenciesMs[i] ?? 0;
      if (i > 0 && lat > 0) {
        currentTotalMs += lat;
        latencySamples++;
      }
    }
  }
  flushWord();

  return words
    .filter((w) => w.word.length >= 2 || w.hasError)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, limit);
}
