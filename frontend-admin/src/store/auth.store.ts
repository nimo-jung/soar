import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthPolicy } from '../types/auth-policy';

export interface LicenseWarning {
  daysRemaining: number;
  expiresAt: string;
}

interface AuthState {
  accessToken: string | null;
  authSettings: AuthPolicy | null;
  licenseWarning: LicenseWarning | null;
  hydrated: boolean;
  setToken: (token: string) => void;
  setAuth: (token: string, authSettings: AuthPolicy, licenseWarning?: LicenseWarning | null) => void;
  replaceToken: (token: string) => void;
  setAuthSettings: (authSettings: AuthPolicy) => void;
  setHydrated: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      authSettings: null,
      licenseWarning: null,
      hydrated: false,
      setToken: (token) => set({ accessToken: token }),
      setAuth: (accessToken, authSettings, licenseWarning = null) =>
        set({ accessToken, authSettings, licenseWarning }),
      replaceToken: (accessToken) => set({ accessToken }),
      setAuthSettings: (authSettings) => set({ authSettings }),
      setHydrated: (hydrated) => set({ hydrated }),
      logout: () => set({ accessToken: null, authSettings: null, licenseWarning: null }),
    }),
    {
      name: 'admin-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
