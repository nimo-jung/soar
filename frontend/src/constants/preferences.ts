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

/**
 * 저장된 테마 모드를 localStorage에 기록하고 DOM 클래스를 즉시 적용한다.
 */
export function storeThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.themeMode, mode);
  applyStoredThemeClass();
}

/**
 * 현재 저장된 테마 모드를 반전하여 토글한다. ('light' ↔ 'dark')
 */
export function toggleTheme(): ThemeMode {
  const current = readStoredThemeMode();
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  storeThemeMode(next);
  return next;
}
