/**
 * Theme Presets & Palette Definitions for TypeFlow
 * Centralizes metadata, swatch previews, and programmatic chart/SVG colors
 * for Cyberpunk, Deep Ocean, Forest, Midnight, Studio Light, and System themes.
 */

import { ThemeMode } from './types.ts';

export interface ThemePreset {
  id: ThemeMode;
  label: string;
  subtitle: string;
  swatches: [string, string, string]; // [background, primary accent, secondary accent]
  isDarkBase: boolean;
}

export interface ThemePalette {
  bg: string;
  card: string;
  elevated: string;
  border: string;
  accent: string;
  accentHover: string;
  accent2: string;
  accent2Hover: string;
  axisText: string;
  gridStroke: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cyberpunk',
    label: 'Cyberpunk Neon',
    subtitle: 'Violet & electric cyan',
    swatches: ['#0b0514', '#00f5d4', '#f72585'],
    isDarkBase: true,
  },
  {
    id: 'deep_ocean',
    label: 'Deep Ocean',
    subtitle: 'Abyssal navy & sky',
    swatches: ['#040d1a', '#38bdf8', '#0d9488'],
    isDarkBase: true,
  },
  {
    id: 'forest',
    label: 'Forest',
    subtitle: 'Pine canopy & emerald',
    swatches: ['#05120c', '#34d399', '#16a34a'],
    isDarkBase: true,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    subtitle: 'Obsidian & indigo',
    swatches: ['#08090f', '#818cf8', '#9333ea'],
    isDarkBase: true,
  },
  {
    id: 'light',
    label: 'Studio Light',
    subtitle: 'Bright canvas, dark cards',
    swatches: ['#f8fafc', '#00f5d4', '#f72585'],
    isDarkBase: false,
  },
  {
    id: 'system',
    label: 'System Default',
    subtitle: 'Matches OS appearance',
    swatches: ['#0f172a', '#94a3b8', '#00f5d4'],
    isDarkBase: true,
  },
];

const PALETTES: Record<Exclude<ThemeMode, 'system'>, ThemePalette> = {
  cyberpunk: {
    bg: '#0b0514',
    card: '#120a20',
    elevated: '#140c24',
    border: '#581c87',
    accent: '#00f5d4',
    accentHover: '#26ffe2',
    accent2: '#f72585',
    accent2Hover: '#ff3b95',
    axisText: '#94a3b8',
    gridStroke: 'rgba(168, 85, 247, 0.14)',
  },
  deep_ocean: {
    bg: '#040d1a',
    card: '#09182e',
    elevated: '#0d213d',
    border: '#1e4976',
    accent: '#38bdf8',
    accentHover: '#7dd3fc',
    accent2: '#0d9488',
    accent2Hover: '#14b8a6',
    axisText: '#94a3b8',
    gridStroke: 'rgba(56, 189, 248, 0.14)',
  },
  forest: {
    bg: '#05120c',
    card: '#0a1f15',
    elevated: '#0f291c',
    border: '#1e5638',
    accent: '#34d399',
    accentHover: '#6ee7b7',
    accent2: '#16a34a',
    accent2Hover: '#22c55e',
    axisText: '#94a3b8',
    gridStroke: 'rgba(52, 211, 153, 0.14)',
  },
  midnight: {
    bg: '#08090f',
    card: '#11131f',
    elevated: '#171a2b',
    border: '#334155',
    accent: '#818cf8',
    accentHover: '#a5b4fc',
    accent2: '#9333ea',
    accent2Hover: '#a855f7',
    axisText: '#94a3b8',
    gridStroke: 'rgba(129, 140, 248, 0.14)',
  },
  light: {
    bg: '#f8fafc',
    card: '#120a20',
    elevated: '#140c24',
    border: '#581c87',
    accent: '#00f5d4',
    accentHover: '#26ffe2',
    accent2: '#f72585',
    accent2Hover: '#ff3b95',
    axisText: '#475569',
    gridStroke: 'rgba(15, 23, 42, 0.08)',
  },
};

export function resolveEffectiveTheme(
  theme: ThemeMode,
  systemPrefersDark: boolean = true
): Exclude<ThemeMode, 'system'> {
  if (theme === 'system') {
    return systemPrefersDark ? 'cyberpunk' : 'light';
  }
  return theme in PALETTES ? theme : 'cyberpunk';
}

export function isLightTheme(theme: ThemeMode, systemPrefersDark: boolean = true): boolean {
  return resolveEffectiveTheme(theme, systemPrefersDark) === 'light';
}

export function getThemePalette(theme: ThemeMode, systemPrefersDark: boolean = true): ThemePalette {
  const effective = resolveEffectiveTheme(theme, systemPrefersDark);
  return PALETTES[effective];
}
