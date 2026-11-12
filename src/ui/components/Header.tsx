/**
 * Top Bar Header Component for TypeFlow
 * Implements strict Top Bar Contract with window chrome controls, shortcuts help, and navigation.
 */

import React from 'react';
import { Volume2, VolumeX, Maximize2, X, Minus, Activity, History, Settings, Eye, HelpCircle } from 'lucide-react';
import { AppSettings } from '../../shared/types.ts';
import { api } from '../bridge.ts';

interface HeaderProps {
  currentView: 'home' | 'test' | 'results' | 'history';
  onNavigate: (view: 'home' | 'history') => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  settings: AppSettings;
  onToggleSound: () => void;
  onToggleFocusMode: () => void;
  isTestActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenSettings,
  onOpenShortcuts,
  settings,
  onToggleSound,
  onToggleFocusMode,
  isTestActive,
}) => {
  if (settings.focusMode && isTestActive) {
    return null;
  }

  const isMuted = settings.soundProfile === 'muted' || settings.soundVolume <= 0;

  return (
    <header className="h-14 w-full border-b border-purple-900/30 bg-[#0b0514]/90 backdrop-blur-md px-6 flex items-center justify-between gap-8 select-none z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus-visible:ring-1 focus-visible:ring-[#00f5d4] rounded"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00f5d4] to-[#f72585] p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(0,245,212,0.4)]">
            <div className="w-full h-full bg-[#0b0514] rounded-[6px] flex items-center justify-center">
              <span className="font-mono text-xs font-black text-[#00f5d4]">TF</span>
            </div>
          </div>
          <span className="font-sans text-base font-bold tracking-tight text-slate-100 group-hover:text-[#00f5d4] transition-colors whitespace-nowrap">
            TypeFlow
          </span>
        </button>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onNavigate('home')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 ${
            currentView === 'home' || currentView === 'test' || currentView === 'results'
              ? 'text-[#00f5d4] font-semibold'
              : ''
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Typing Test</span>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 ${
            currentView === 'history' ? 'text-[#00f5d4] font-semibold' : ''
          }`}
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 hover:text-slate-100"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Zone 3: Quick utilities & Window Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Shortcuts Cheat Sheet */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
          className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors rounded hover:bg-white/5"
          aria-label="Keyboard Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Sound toggle button */}
        <button
          onClick={onToggleSound}
          title={isMuted ? 'Unmute Sound' : `Mute Sound (${settings.soundProfile})`}
          className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors rounded hover:bg-white/5"
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-[#00f5d4]" />}
        </button>

        {/* Focus mode indicator */}
        <button
          onClick={onToggleFocusMode}
          title={settings.focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode (hides chrome during tests)'}
          className={`p-1.5 transition-colors rounded hover:bg-white/5 ${
            settings.focusMode ? 'text-[#f72585]' : 'text-slate-400 hover:text-slate-100'
          }`}
          aria-label="Toggle focus mode"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Desktop Window Controls */}
        <div className="h-4 w-px bg-purple-900/40 mx-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => api.minimizeWindow()}
            className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors rounded hover:bg-white/5"
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => api.maximizeWindow()}
            className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors rounded hover:bg-white/5"
            title="Maximize / Fullscreen"
            aria-label="Maximize window"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => api.closeWindow()}
            className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded hover:bg-rose-500/10"
            title="Close"
            aria-label="Close window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
