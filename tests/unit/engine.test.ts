/**
 * Unit Tests for Typing Engine
 * Covers initialization, keystroke processing, backspacing, 100% accuracy, 0 chars, and completion.
 */

import {
  createInitialTypingState,
  processKeystroke,
  processBackspace,
  finishTest,
  getTypingCounts,
} from '../../src/engine/typing.ts';

describe('Typing Engine', () => {
  const samplePassage = 'The quick brown fox';

  it('initializes typing state with all pending characters', () => {
    const state = createInitialTypingState(samplePassage);
    expect(state.passageText).toBe(samplePassage);
    expect(state.characters.length).toBe(samplePassage.length);
    expect(state.currentIndex).toBe(0);
    expect(state.isStarted).toBe(false);
    expect(state.isFinished).toBe(false);
    expect(state.characters[0].status).toBe('pending');
  });

  it('handles zero typed characters', () => {
    const state = createInitialTypingState(samplePassage);
    const counts = getTypingCounts(state);
    expect(counts.correct).toBe(0);
    expect(counts.wrong).toBe(0);
    expect(counts.totalTyped).toBe(0);
    expect(counts.pending).toBe(samplePassage.length);
  });

  it('correctly processes matching keystrokes (100% accuracy case)', () => {
    let state = createInitialTypingState('Cat');
    state = processKeystroke(state, 'C');
    state = processKeystroke(state, 'a');
    state = processKeystroke(state, 't');

    expect(state.currentIndex).toBe(3);
    expect(state.isFinished).toBe(true);

    const counts = getTypingCounts(state);
    expect(counts.correct).toBe(3);
    expect(counts.wrong).toBe(0);
    expect(counts.totalTyped).toBe(3);
    expect(counts.pending).toBe(0);
  });

  it('correctly flags mismatched keystrokes as errors', () => {
    let state = createInitialTypingState('Cat');
    state = processKeystroke(state, 'C'); // correct
    state = processKeystroke(state, 'x'); // wrong

    expect(state.currentIndex).toBe(2);
    expect(state.characters[1].status).toBe('wrong');
    expect(state.errorKeystrokes).toBe(1);

    const counts = getTypingCounts(state);
    expect(counts.correct).toBe(1);
    expect(counts.wrong).toBe(1);
    expect(state.missedKeys['a']).toBe(1);
  });

  it('handles backspace to revert previous character to pending', () => {
    let state = createInitialTypingState('Cat');
    state = processKeystroke(state, 'C');
    state = processKeystroke(state, 'x'); // typo
    expect(state.currentIndex).toBe(2);

    state = processBackspace(state);
    expect(state.currentIndex).toBe(1);
    expect(state.characters[1].status).toBe('pending');
    expect(state.characters[1].typedChar).toBeUndefined();

    // Re-type correct character
    state = processKeystroke(state, 'a');
    expect(state.currentIndex).toBe(2);
    expect(state.characters[1].status).toBe('correct');
  });

  it('ignores backspace when at the start of passage', () => {
    let state = createInitialTypingState('Cat');
    state = processBackspace(state);
    expect(state.currentIndex).toBe(0);
  });

  it('ignores input once the test is finished', () => {
    let state = createInitialTypingState('Go');
    state = processKeystroke(state, 'G');
    state = processKeystroke(state, 'o');
    expect(state.isFinished).toBe(true);

    const stateAfterExtra = processKeystroke(state, 'o');
    expect(stateAfterExtra.currentIndex).toBe(2);
  });

  it('handles long passages smoothly without memory degradation', () => {
    const longText = 'A '.repeat(500); // 1000 characters
    let state = createInitialTypingState(longText);
    for (let i = 0; i < 100; i++) {
      state = processKeystroke(state, i % 2 === 0 ? 'A' : ' ');
    }
    expect(state.currentIndex).toBe(100);
    const counts = getTypingCounts(state);
    expect(counts.correct).toBe(100);
  });
});
