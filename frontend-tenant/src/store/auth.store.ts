import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthPolicy } from '../types/auth-policy';

export interface UserInfo {
  sub: number;
  tenantId: string;
  role: string;
}

export interface TenantWarning {
  daysRemaining: number;
  expiresAt: string;
}

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  authSettings: AuthPolicy | null;
  tenantWarning: TenantWarning | null;
  setAuth: (token: string, user: UserInfo, authSettings: AuthPolicy, tenantWarning?: TenantWarning | null) => void;
  replaceToken: (token: string) => void;
  setAuthSettings: (authSettings: AuthPolicy) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      authSettings: null,
      tenantWarning: null,
      setAuth: (accessToken, user, authSettings, tenantWarning = null) =>
        set({ accessToken, user, authSettings, tenantWarning }),
      replaceToken: (accessToken) => set({ accessToken }),
      setAuthSettings: (authSettings) => set({ authSettings }),
      logout: () => set({ accessToken: null, user: null, authSettings: null, tenantWarning: null }),
    }),
    { name: 'tenant-auth' },
  ),
);
