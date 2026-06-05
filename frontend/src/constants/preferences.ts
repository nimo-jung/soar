export const STORAGE_KEYS = {
  language: 'tms-lang',
  themeMode: 'tenant.theme.mode',
  sidebarMode: 'tenant.sidebar.mode',
  sidebarExpandedRoots: 'tenant.sidebar.expandedOpenRoots',
} as const;

export const UI_CLASSES = {
  darkMode: 'tenant-dark-mode',
} as const;

export type ThemeMode = 'light' | 'dark';

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.localStorage.getItem(STORAGE_KEYS.themeMode) === 'dark' ? 'dark' : 'light';
}

export function applyStoredThemeClass(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle(UI_CLASSES.darkMode, readStoredThemeMode() === 'dark');
}
