/**
 * Keyboard Shortcuts Modal for TypeFlow
 * Clean, accessible reference modal showing all desktop accelerators.
 */

import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Enter', action: 'Start typing test with selected passage', scope: 'Home' },
    { key: 'Ctrl + N', action: 'Generate and launch a new test', scope: 'Global' },
    { key: 'Ctrl + R', action: 'Restart test immediately or retry passage', scope: 'Global' },
    { key: 'Ctrl + H', action: 'Open History & Personal Bests matrix', scope: 'Global' },
    { key: 'Ctrl + ,', action: 'Open Preferences & Audio settings', scope: 'Global' },
    { key: 'Esc', action: 'Cancel active session or return to Home', scope: 'Global' },
    { key: '?', action: 'Toggle this keyboard shortcuts cheat sheet', scope: 'Global' },
    { key: 'Backspace', action: 'Delete previous character & revert live stats', scope: 'Test' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className="w-full max-w-md border border-purple-900/50 bg-[#140c24] rounded-2xl p-6 flex flex-col gap-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/30">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#00f5d4]" />
            <h2 className="text-base font-bold text-slate-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
            aria-label="Close shortcuts modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg border border-purple-900/20 bg-[#0b0514]/60 hover:bg-white/[0.02]"
            >
              <span className="text-xs text-slate-300 font-medium">{item.action}</span>
              <kbd className="px-2 py-1 rounded bg-[#1e1236] border border-purple-900/40 text-[11px] font-mono font-semibold text-[#00f5d4] shadow-sm whitespace-nowrap">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-purple-900/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00f5d4] hover:bg-[#26ffe2] text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(0,245,212,0.3)] transition-transform hover:scale-[1.02]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
