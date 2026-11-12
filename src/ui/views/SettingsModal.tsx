/**
 * Settings Modal for TypeFlow
 * Allows customization of theme, typography size, caret style,
 * audio acoustics (Mechanical, Typewriter, Linear Thock), Ghost Pace Racer, and focus mode.
 */

import React from 'react';
import { X, Volume2, Sliders, Moon, Sun, Monitor, Eye, Download, Zap } from 'lucide-react';
import { AppSettings, CaretStyle, FontSize, SoundProfile, ThemeMode, GhostMode } from '../../shared/types.ts';
import { soundSynth } from '../../audio/synth.ts';
import { api } from '../bridge.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleTestSound = () => {
    soundSynth.setConfig(settings.soundProfile, settings.soundVolume);
    soundSynth.playKeyClick(false, false);
  };

  const handleExportCSV = async () => {
    await api.exportHistoryCSV();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div
        className="w-full max-w-lg border border-purple-900/50 bg-[#140c24] rounded-2xl p-6 flex flex-col gap-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00f5d4]" />
            <h2 className="text-base font-bold text-slate-100">Preferences & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* 1. Theme Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Appearance Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cyberpunk', label: 'Cyberpunk Neon', icon: Moon },
                { id: 'light', label: 'Studio Light', icon: Sun },
                { id: 'system', label: 'System Default', icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ theme: id as ThemeMode })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                    settings.theme === id
                      ? 'border-[#00f5d4] bg-[#00f5d4]/10 text-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.2)]'
                      : 'border-purple-900/30 bg-[#0b0514]/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Ghost Pace Car Racer */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-purple-900/30 bg-[#0b0514]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f72585]">
                <Zap className="w-3.5 h-3.5" />
                <span>Ghost Pace Car Racer</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Real-time target racer</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 mt-1">
              {[
                { id: 'off', label: 'Off' },
                { id: 'pb', label: 'My PB' },
                { id: '60', label: '60 WPM' },
                { id: '80', label: '80 WPM' },
                { id: '100', label: '100 WPM' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ ghostMode: id as GhostMode })}
                  className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.ghostMode === id
                      ? 'border-[#f72585] bg-[#f72585]/15 text-[#f72585] font-bold shadow-[0_0_8px_rgba(247,37,133,0.3)]'
                      : 'border-purple-900/30 bg-white/[0.02] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Keystroke Audio Acoustics */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-purple-900/30 bg-[#0b0514]/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Acoustics & Sound Profile
              </label>
              <button
                onClick={handleTestSound}
                className="text-[11px] font-mono text-[#00f5d4] hover:underline flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3" />
                <span>Test Click</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'mechanical', label: 'Clicky Mechanical' },
                { id: 'typewriter', label: 'Vintage Typewriter' },
                { id: 'linear_thock', label: 'Linear Thock' },
                { id: 'soft', label: 'Soft Keystroke' },
                { id: 'muted', label: 'Muted' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    onUpdateSettings({ soundProfile: id as SoundProfile });
                    soundSynth.setConfig(id as SoundProfile, settings.soundVolume);
                    if (id !== 'muted') soundSynth.playKeyClick();
                  }}
                  className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.soundProfile === id
                      ? 'border-[#00f5d4] bg-[#00f5d4]/15 text-[#00f5d4] font-semibold'
                      : 'border-purple-900/30 bg-white/[0.02] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {settings.soundProfile !== 'muted' && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-slate-400 font-mono w-14">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    onUpdateSettings({ soundVolume: vol });
                    soundSynth.setConfig(settings.soundProfile, vol);
                  }}
                  className="w-full accent-[#00f5d4] cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-8 text-right tabular-nums">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* 4. Caret Style */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Caret Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'line', label: 'Line Caret', preview: '|' },
                { id: 'block', label: 'Block Box', preview: '█' },
                { id: 'underline', label: 'Underline', preview: '_' },
              ].map(({ id, label, preview }) => (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ caretStyle: id as CaretStyle })}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    settings.caretStyle === id
                      ? 'border-[#00f5d4] bg-[#00f5d4]/10 text-[#00f5d4] shadow-[0_0_12px_rgba(0,245,212,0.2)]'
                      : 'border-purple-900/30 bg-[#0b0514]/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-mono text-base font-bold text-[#00f5d4]">{preview}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Font Size */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Passage Font Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'compact', label: 'Compact', size: '18px' },
                { id: 'standard', label: 'Standard', size: '20px' },
                { id: 'large', label: 'Large', size: '24px' },
              ].map(({ id, label, size }) => (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ fontSize: id as FontSize })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                    settings.fontSize === id
                      ? 'border-[#00f5d4] bg-[#00f5d4]/10 text-[#00f5d4]'
                      : 'border-purple-900/30 bg-[#0b0514]/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-slate-200 font-semibold">{label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{size}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Focus Mode & CSV Export */}
          <div className="flex flex-col gap-2 pt-2 border-t border-purple-900/20">
            <div className="flex items-center justify-between p-3 rounded-xl border border-purple-900/30 bg-[#0b0514]/60">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-[#f72585]" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Focus Mode</span>
                  <span className="text-[11px] text-slate-500">
                    Automatically hides top chrome and headers during active tests
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.focusMode}
                onChange={(e) => onUpdateSettings({ focusMode: e.target.checked })}
                className="w-4 h-4 accent-[#00f5d4] cursor-pointer"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Offline Backup</span>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-900/40 text-xs text-[#00f5d4] hover:bg-[#00f5d4]/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export History CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Done */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#00f5d4] hover:bg-[#26ffe2] text-slate-950 font-bold text-xs shadow-[0_0_14px_rgba(0,245,212,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
