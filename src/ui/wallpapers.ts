/**
 * Client-side Wallpaper Registry & Custom Image Compression Helpers
 * Keeps static asset imports strictly in UI code so server-side TSX processes never import binary images.
 */

import cyberCityImg from '../assets/images/wallpaper_cyber_city_1794683250499.jpg';
import deepOceanImg from '../assets/images/wallpaper_deep_ocean_1794683250909.jpg';
import mistyForestImg from '../assets/images/wallpaper_misty_forest_1794683252285.jpg';
import midnightCosmosImg from '../assets/images/wallpaper_midnight_cosmos_1794683251944.jpg';
import { AppSettings, WallpaperId } from '../shared/types.ts';

export interface WallpaperPreset {
  id: Exclude<WallpaperId, 'custom'>;
  label: string;
  subtitle: string;
  src: string | null;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'none',
    label: 'None',
    subtitle: 'Solid theme canvas',
    src: null,
  },
  {
    id: 'cyber_city',
    label: 'Cyber Skyline',
    subtitle: 'Neon rain horizon',
    src: cyberCityImg,
  },
  {
    id: 'deep_ocean',
    label: 'Deep Ocean',
    subtitle: 'Bioluminescent abyss',
    src: deepOceanImg,
  },
  {
    id: 'misty_forest',
    label: 'Misty Forest',
    subtitle: 'Emerald woodland fog',
    src: mistyForestImg,
  },
  {
    id: 'midnight_cosmos',
    label: 'Midnight Horizon',
    subtitle: 'Deep indigo aurora',
    src: midnightCosmosImg,
  },
];

export const DEFAULT_WALLPAPER_DIM = 0.65;
export const DEFAULT_WALLPAPER_BLUR = 2;

export function resolveWallpaperSrc(settings: AppSettings): string | null {
  const id = settings.wallpaper || 'none';
  if (id === 'none') return null;
  if (id === 'custom') {
    return settings.customWallpaper && settings.customWallpaper.startsWith('data:image/')
      ? settings.customWallpaper
      : null;
  }
  const preset = WALLPAPER_PRESETS.find((p) => p.id === id);
  return preset?.src ?? null;
}

/**
 * Resizes and compresses a user-selected image file to fit comfortably within browser storage limits.
 */
export async function compressWallpaperFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP).');
  }

  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1080;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read the selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Selected file could not be decoded as an image.'));
    image.src = dataUrl;
  });

  const ratio = Math.min(1, MAX_WIDTH / Math.max(1, img.width), MAX_HEIGHT / Math.max(1, img.height));
  const targetWidth = Math.max(1, Math.round(img.width * ratio));
  const targetHeight = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image processing canvas is unavailable in this browser.');
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const compressed = canvas.toDataURL('image/jpeg', 0.82);
  if (compressed.length > 2_200_000) {
    return canvas.toDataURL('image/jpeg', 0.65);
  }
  return compressed;
}
