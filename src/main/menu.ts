/**
 * Native Application Menu & Accelerators for TypeFlow Desktop
 */

export interface MenuItemTemplate {
  label?: string;
  accelerator?: string;
  click?: () => void;
  type?: 'separator' | 'normal' | 'checkbox' | 'radio';
  submenu?: MenuItemTemplate[];
}

export function buildMenuTemplate(onAction: (command: string) => void): MenuItemTemplate[] {
  const isMac = process.platform === 'darwin';

  const template: MenuItemTemplate[] = [
    ...(isMac
      ? [
          {
            label: 'TypeFlow',
            submenu: [
              { label: 'About TypeFlow', click: () => onAction('about') },
              { type: 'separator' as const },
              { label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: () => onAction('open-settings') },
              { type: 'separator' as const },
              { label: 'Quit TypeFlow', accelerator: 'CmdOrCtrl+Q', click: () => onAction('quit') },
            ],
          },
        ]
      : []),
    {
      label: 'Test',
      submenu: [
        {
          label: 'New Test',
          accelerator: 'CmdOrCtrl+N',
          click: () => onAction('new-test'),
        },
        {
          label: 'Restart Test',
          accelerator: 'CmdOrCtrl+R',
          click: () => onAction('restart-test'),
        },
        {
          label: 'Cancel / Home',
          accelerator: 'Esc',
          click: () => onAction('cancel-test'),
        },
        { type: 'separator' },
        {
          label: 'History & Records',
          accelerator: 'CmdOrCtrl+H',
          click: () => onAction('open-history'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Focus Mode',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => onAction('toggle-focus'),
        },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', click: () => onAction('toggle-fullscreen') },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => onAction('shortcuts-guide'),
        },
        {
          label: 'About TypeFlow',
          click: () => onAction('about'),
        },
      ],
    },
  ];

  return template;
}
