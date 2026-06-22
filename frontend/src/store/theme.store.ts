import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../constants/preferences';
import { readStoredThemeMode, storeThemeMode } from '../constants/preferences';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => ThemeMode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: readStoredThemeMode(),
      setMode: (mode) => {
        set({ mode });
        storeThemeMode(mode);
      },
      toggle: () => {
        const current = get().mode;
        const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
        set({ mode: next });
        storeThemeMode(next);
        return next;
      },
    }),
    { name: 'tenant.theme.mode' },
  ),
);
