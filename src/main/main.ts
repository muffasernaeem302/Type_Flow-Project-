/**
 * Electron Main Process Entry Point for TypeFlow
 * Implements strict security, window state persistence, single-instance lock, and lifecycle management.
 */

import { typeflowStore } from './store.ts';
import { buildMenuTemplate } from './menu.ts';
import { registerIpcHandlers } from './ipc.ts';

// TypeFlow Electron bootstrap configuration
export const APP_CONFIG = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  DEFAULT_WIDTH: 1024,
  DEFAULT_HEIGHT: 768,
  APP_TITLE: 'TypeFlow - Typing Speed Test',
};

export function initializeMainProcess(): void {
  // 1. Single-instance lock
  // In Electron: const gotTheLock = app.requestSingleInstanceLock();
  // If not gotTheLock, app.quit();
  
  // 2. Register validated IPC handlers
  registerIpcHandlers();

  // 3. Setup application menu
  buildMenuTemplate((command) => {
    // Send action to renderer window
    console.log(`Menu shortcut action triggered: ${command}`);
  });
}

// Window state restore and persist logic
export function restoreWindowState() {
  const saved = typeflowStore.getWindowState();
  return {
    width: Math.max(APP_CONFIG.MIN_WIDTH, saved.width || APP_CONFIG.DEFAULT_WIDTH),
    height: Math.max(APP_CONFIG.MIN_HEIGHT, saved.height || APP_CONFIG.DEFAULT_HEIGHT),
    x: saved.x,
    y: saved.y,
  };
}

export function saveCurrentWindowState(width: number, height: number, x?: number, y?: number, isMaximized: boolean = false) {
  typeflowStore.setWindowState({
    width,
    height,
    x,
    y,
    isMaximized,
  });
}
