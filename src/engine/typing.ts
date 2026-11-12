/**
 * Pure Functional Typing Engine for TypeFlow
 * Free of DOM, Window, and Electron dependencies.
 * Tracks character matching, backspace rollback, and per-key error frequencies.
 */

import { CharacterState } from '../shared/types.ts';

export interface TypingEngineState {
  passageText: string;
  characters: CharacterState[];
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
  const normalizedText = passageText.replace(/\r\n/g, '\n').trim();
  const characters: CharacterState[] = normalizedText.split('').map((char) => ({
    char,
    status: 'pending',
  }));

  return {
    passageText: normalizedText,
    characters,
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
  now: number = Date.now()
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

  const nextIndex = state.currentIndex + 1;
  const isNowFinished = nextIndex >= state.characters.length;

  const newMissedKeys = { ...state.missedKeys };
  if (!isMatch) {
    const keyLabel = targetChar === ' ' ? 'Space' : targetChar;
    newMissedKeys[keyLabel] = (newMissedKeys[keyLabel] || 0) + 1;
  }

  return {
    ...state,
    characters: newCharacters,
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
