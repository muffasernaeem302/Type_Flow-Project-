/**
 * Settings Modal for TypeFlow
 * Allows customization of theme, typography size, caret style,
 * audio acoustics (Mechanical, Typewriter, Linear Thock), Ghost Pace Racer, and focus mode.
 */

import React, { useRef, useState } from 'react';
import {
  X,
  Volume2,
  Sliders,
  Eye,
  Download,
  Upload,
  Zap,
  ShieldAlert,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Palette,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  CaretStyle,
  FontSize,
  SoundProfile,
  ThemeMode,
  GhostMode,
  ChallengeMode,
  WallpaperId,
} from '../../shared/types.ts';
import { THEME_PRESETS } from '../../shared/themes.ts';
import {
  WALLPAPER_PRESETS,
  DEFAULT_WALLPAPER_BLUR,
  DEFAULT_WALLPAPER_DIM,
  compressWallpaperFile,
} from '../wallpapers.ts';
import { soundSynth } from '../../audio/synth.ts';
import { api } from '../bridge.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onProfileImported?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onProfileImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [wallpaperStatus, setWallpaperStatus] = useState<string | null>(null);
  const [isProcessingWallpaper, setIsProcessingWallpaper] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTestSound = () => {
    soundSynth.setConfig(settings.soundProfile, settings.soundVolume, settings.congratsSound);
    soundSynth.playKeyClick(false, false);
  };

  const handleTestCongrats = () => {
    soundSynth.setConfig(settings.soundProfile, settings.soundVolume, settings.congratsSound);
    soundSynth.playCompletionChime(true, true);
  };

  const handleExportCSV = async () => {
    await api.exportHistoryCSV();
  };

  const handleExportJSON = async () => {
    const res = await api.exportProfileJSON();
    if (res.success) {
      setBackupStatus({ type: 'success', message: 'Profile backup JSON downloaded.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const raw = await file.text();
      const result = await api.importProfileJSON(raw);
      if (result.success) {
        onProfileImported?.();
        setBackupStatus({
          type: 'success',
          message: `Restored profile (${result.importedRuns} ${result.importedRuns === 1 ? 'run' : 'runs'} imported).`,
        });
      } else {
        setBackupStatus({
          type: 'error',
          message: result.error || 'Could not import backup file.',
        });
      }
    } catch {
      setBackupStatus({ type: 'error', message: 'Failed to read selected JSON file.' });
    }
  };

  const handleUploadWallpaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setWallpaperStatus(null);
    setIsProcessingWallpaper(true);
    try {
      const compressed = await compressWallpaperFile(file);
      onUpdateSettings({
        wallpaper: 'custom',
        customWallpaper: compressed,
      });
    } catch (err) {
      setWallpaperStatus(err instanceof Error ? err.message : 'Unable to use selected image.');
    } finally {
      setIsProcessingWallpaper(false);
    }
  };

  const activeWallpaper: WallpaperId = settings.wallpaper || 'none';
  const hasCustomWallpaper = Boolean(
    settings.customWallpaper && settings.customWallpaper.startsWith('data:image/')
  );
  const isWallpaperActive =
    activeWallpaper !== 'none' && (activeWallpaper !== 'custom' || hasCustomWallpaper);
  const wallpaperDim =
    typeof settings.wallpaperDim === 'number' ? settings.wallpaperDim : DEFAULT_WALLPAPER_DIM;
  const wallpaperBlur =
    typeof settings.wallpaperBlur === 'number' ? settings.wallpaperBlur : DEFAULT_WALLPAPER_BLUR;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-tf-border/50 bg-tf-elevated rounded-2xl p-6 flex flex-col gap-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-tf-border/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-tf-accent" />
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
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-tf-accent" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Color Theme
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_PRESETS.map((preset) => {
                const isSelected = settings.theme === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onUpdateSettings({ theme: preset.id as ThemeMode })}
                    className={`flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-tf-accent bg-tf-accent/10 text-tf-accent shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_20%,transparent)]'
                        : 'border-tf-border/35 bg-tf-bg/60 text-slate-300 hover:text-slate-100 hover:border-tf-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold">{preset.label}</span>
                      <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
                        {preset.swatches.map((hex, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {preset.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1b. Background Wallpaper */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-tf-accent" />
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Background Wallpaper
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadWallpaper}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingWallpaper}
                  onClick={() => wallpaperInputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] font-medium text-tf-accent hover:underline disabled:opacity-50"
                >
                  <Upload className="w-3 h-3" />
                  <span>{isProcessingWallpaper ? 'Loading...' : 'Upload Image'}</span>
                </button>
                {hasCustomWallpaper && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        customWallpaper: undefined,
                        wallpaper: activeWallpaper === 'custom' ? 'none' : activeWallpaper,
                      })
                    }
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove uploaded image"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map((preset) => {
                const isSelected = activeWallpaper === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdateSettings({ wallpaper: preset.id })}
                    className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-tf-accent bg-tf-accent/10 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_20%,transparent)]'
                        : 'border-tf-border/35 bg-tf-bg/60 hover:border-tf-border/60'
                    }`}
                  >
                    <div className="relative h-14 w-full overflow-hidden bg-tf-bg">
                      {preset.src ? (
                        <img
                          src={preset.src}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-tf-bg via-tf-card to-tf-elevated flex items-center justify-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            Solid
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-1.5 flex flex-col">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-tf-accent' : 'text-slate-200'
                        }`}
                      >
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {preset.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}

              {hasCustomWallpaper && settings.customWallpaper && (
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ wallpaper: 'custom' })}
                  className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                    activeWallpaper === 'custom'
                      ? 'border-tf-accent bg-tf-accent/10 shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_20%,transparent)]'
                      : 'border-tf-border/35 bg-tf-bg/60 hover:border-tf-border/60'
                  }`}
                >
                  <div className="relative h-14 w-full overflow-hidden bg-tf-bg">
                    <img
                      src={settings.customWallpaper}
                      alt="Custom Wallpaper"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="px-2.5 py-1.5 flex flex-col">
                    <span
                      className={`text-xs font-semibold truncate ${
                        activeWallpaper === 'custom' ? 'text-tf-accent' : 'text-slate-200'
                      }`}
                    >
                      Custom Image
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">Uploaded photo</span>
                  </div>
                </button>
              )}
            </div>

            {wallpaperStatus && (
              <div className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{wallpaperStatus}</span>
              </div>
            )}

            {isWallpaperActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-tf-border/30 bg-tf-bg/60">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Overlay Dim</span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {Math.round(wallpaperDim * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.90"
                    step="0.05"
                    value={wallpaperDim}
                    onChange={(e) =>
                      onUpdateSettings({ wallpaperDim: parseFloat(e.target.value) })
                    }
                    className="w-full accent-tf-accent cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Blur</span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {wallpaperBlur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="16"
                    step="1"
                    value={wallpaperBlur}
                    onChange={(e) =>
                      onUpdateSettings({ wallpaperBlur: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-tf-accent cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Ghost Pace Car Racer */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-tf-border/30 bg-tf-bg/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-tf-accent-2">
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
                      ? 'border-tf-accent-2 bg-tf-accent-2/20 text-slate-100 font-bold shadow-[0_0_8px_color-mix(in_srgb,var(--tf-accent-2)_30%,transparent)]'
                      : 'border-tf-border/30 bg-white/[0.02] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Keystroke Audio Acoustics */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-tf-border/30 bg-tf-bg/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Acoustics & Sound Profile
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestSound}
                  className="text-[11px] font-mono text-tf-accent hover:underline flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Test Click</span>
                </button>
                <button
                  onClick={handleTestCongrats}
                  className="text-[11px] font-mono text-tf-accent-2 hover:underline flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Test Congrats</span>
                </button>
              </div>
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
                    soundSynth.setConfig(id as SoundProfile, settings.soundVolume, settings.congratsSound);
                    if (id !== 'muted') soundSynth.playKeyClick();
                  }}
                  className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    settings.soundProfile === id
                      ? 'border-tf-accent bg-tf-accent/15 text-tf-accent font-semibold'
                      : 'border-tf-border/30 bg-white/[0.02] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {settings.soundProfile !== 'muted' && (
              <div className="flex flex-col gap-2.5 mt-1">
                <div className="flex items-center gap-3">
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
                      soundSynth.setConfig(settings.soundProfile, vol, settings.congratsSound);
                    }}
                    className="w-full accent-tf-accent cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 font-mono w-8 text-right tabular-nums">
                    {Math.round(settings.soundVolume * 100)}%
                  </span>
                </div>

                <label className="flex items-center justify-between pt-1 cursor-pointer">
                  <span className="text-[11px] text-slate-300 font-medium">
                    Play Congrats Fanfare on Completion
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.congratsSound ?? true}
                    onChange={(e) => onUpdateSettings({ congratsSound: e.target.checked })}
                    className="w-4 h-4 accent-tf-accent-2 cursor-pointer"
                  />
                </label>
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
                      ? 'border-tf-accent bg-tf-accent/10 text-tf-accent shadow-[0_0_12px_color-mix(in_srgb,var(--tf-accent)_20%,transparent)]'
                      : 'border-tf-border/30 bg-tf-bg/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-mono text-base font-bold text-tf-accent">{preview}</span>
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
                      ? 'border-tf-accent bg-tf-accent/10 text-tf-accent'
                      : 'border-tf-border/30 bg-tf-bg/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-slate-200 font-semibold">{label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{size}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Daily Goal & Focus Mode */}
          <div className="flex flex-col gap-3 pt-2 border-t border-tf-border/20">
            <div className="flex items-center justify-between p-3 rounded-xl border border-tf-border/30 bg-tf-bg/60 gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Daily Practice Goal</span>
                <span className="text-[11px] text-slate-500">
                  Target sessions per day for your daily progress bar
                </span>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-tf-elevated border border-tf-border/40 shrink-0">
                {[3, 5, 10, 15].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => onUpdateSettings({ dailyGoal: goal })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold tabular-nums transition-colors ${
                      (settings.dailyGoal || 5) === goal
                        ? 'bg-tf-accent text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge Rules (Sudden Death & Min WPM Floor) */}
            <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-tf-border/30 bg-tf-bg/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Challenge Rules</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">Discipline modes</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'Standard', desc: 'No fail condition' },
                  { id: 'sudden_death', label: 'Sudden Death', desc: 'Ends on 1st typo' },
                  { id: 'min_wpm', label: 'WPM Floor', desc: 'Must hold pace' },
                ].map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => onUpdateSettings({ challengeMode: id as ChallengeMode })}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border text-xs transition-all ${
                      (settings.challengeMode || 'none') === id
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300 font-bold'
                        : 'border-tf-border/30 bg-white/[0.02] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] font-normal text-slate-500">{desc}</span>
                  </button>
                ))}
              </div>

              {settings.challengeMode === 'min_wpm' && (
                <div className="flex items-center justify-between pt-2 border-t border-tf-border/25 gap-3">
                  <span className="text-[11px] text-slate-300">
                    Minimum Net WPM (checked after 3s warm-up)
                  </span>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-tf-elevated border border-tf-border/40 shrink-0">
                    {[30, 40, 50, 60, 75].map((wpm) => (
                      <button
                        key={wpm}
                        onClick={() => onUpdateSettings({ minWpmFloor: wpm })}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-semibold tabular-nums transition-colors ${
                          (settings.minWpmFloor || 40) === wpm
                            ? 'bg-rose-500 text-white font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {wpm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between pt-2 border-t border-tf-border/25 cursor-pointer gap-3">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-200">
                    Stop-on-Error Mode
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Hold caret on mistakes until the correct character is pressed
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.stopOnError)}
                  onChange={(e) => onUpdateSettings({ stopOnError: e.target.checked })}
                  className="w-4 h-4 accent-tf-accent cursor-pointer shrink-0"
                />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-tf-border/30 bg-tf-bg/60">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-tf-accent-2" />
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
                className="w-4 h-4 accent-tf-accent cursor-pointer"
              />
            </div>

            {/* Offline Profile Backup & Exports */}
            <div className="p-3.5 rounded-xl border border-tf-border/30 bg-tf-bg/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Profile Backup &amp; Export</span>
                <span className="text-[11px] text-slate-500 font-mono">Settings, history &amp; PBs</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tf-accent/40 text-xs font-semibold text-tf-accent hover:bg-tf-accent/10 transition-colors whitespace-nowrap"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tf-accent-2/50 text-xs font-semibold text-slate-100 hover:bg-tf-accent-2/15 transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 text-tf-accent-2" />
                  <span>Import JSON</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tf-border/40 text-xs text-slate-300 hover:text-slate-100 hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {backupStatus && (
                <div
                  className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                    backupStatus.type === 'success'
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/35 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {backupStatus.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{backupStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Done */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-tf-accent hover:bg-tf-accent-hover text-slate-950 font-bold text-xs shadow-[0_0_14px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
