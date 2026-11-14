/**
 * Ghost Caret Component for TypeFlow
 * Renders a distinct translucent magenta marker centered directly above the target character.
 */

import React from 'react';

interface GhostCaretProps {
  label: string;
}

export const GhostCaret: React.FC<GhostCaretProps> = ({ label }) => {
  return (
    <span
      className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
      title={`Ghost Pace: ${label}`}
    >
      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-tf-accent-2 text-white shadow-[0_0_8px_color-mix(in_srgb,var(--tf-accent-2)_70%,transparent)] whitespace-nowrap animate-pulse">
        {label}
      </span>
      <span className="w-1.5 h-1.5 bg-tf-accent-2 rotate-45 -mt-0.5" />
    </span>
  );
};
