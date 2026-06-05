import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthPolicy } from '../types/auth-policy';

export interface UserInfo {
  sub: number;
  tenantId?: string;
  email?: string;
  role: string;
  isMaster: boolean;
}

export interface TenantWarning {
  daysRemaining: number;
  expiresAt: string;
}

interface AuthState {
  accessToken: string | null;
  sessionType: 'master' | 'tenant' | null;
  user: UserInfo | null;
  authSettings: AuthPolicy | null;
  tenantWarning: TenantWarning | null;
  setAuth: (
    token: string,
    user: UserInfo,
    authSettings: AuthPolicy,
    tenantWarning?: TenantWarning | null,
    sessionType?: 'master' | 'tenant',
  ) => void;
  replaceToken: (token: string) => void;
  setAuthSettings: (authSettings: AuthPolicy) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      sessionType: null,
      user: null,
      authSettings: null,
      tenantWarning: null,
      setAuth: (accessToken, user, authSettings, tenantWarning = null, sessionType = 'tenant') =>
        set({ accessToken, user, authSettings, tenantWarning, sessionType }),
      replaceToken: (accessToken) => set({ accessToken }),
      setAuthSettings: (authSettings) => set({ authSettings }),
      logout: () => set({ accessToken: null, sessionType: null, user: null, authSettings: null, tenantWarning: null }),
    }),
    { name: 'master-auth' },
  ),
);
