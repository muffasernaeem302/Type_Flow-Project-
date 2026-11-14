/**
 * Animated Caret Component for TypeFlow
 * Positioned absolutely relative to the active character span so it never affects
 * layout flow or causes line wrapping.
 */

import React from 'react';
import { CaretStyle } from '../../shared/types.ts';

interface CaretProps {
  style: CaretStyle;
}

export const Caret: React.FC<CaretProps> = ({ style }) => {
  if (style === 'block') {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-0 -mx-[1px] bg-tf-accent/35 border border-tf-accent shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_60%,transparent)] animate-caret pointer-events-none rounded-[1px] z-10"
      />
    );
  }

  if (style === 'underline') {
    return (
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 -bottom-[2px] h-[3px] bg-tf-accent shadow-[0_0_10px_var(--tf-accent)] animate-caret pointer-events-none z-10 rounded-full"
      />
    );
  }

  // Default 'line' caret: vertically centered, absolutely positioned at left edge
  return (
    <span
      aria-hidden="true"
      className="absolute -left-[2px] top-[8%] bottom-[8%] w-[2.5px] bg-tf-accent shadow-[0_0_12px_var(--tf-accent)] animate-caret pointer-events-none rounded-full z-10"
    />
  );
};
