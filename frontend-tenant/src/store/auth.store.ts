import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthPolicy } from '../types/auth-policy';

export interface UserInfo {
  sub: number;
  tenantId: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  authSettings: AuthPolicy | null;
  setAuth: (token: string, user: UserInfo, authSettings: AuthPolicy) => void;
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
      setAuth: (accessToken, user, authSettings) => set({ accessToken, user, authSettings }),
      replaceToken: (accessToken) => set({ accessToken }),
      setAuthSettings: (authSettings) => set({ authSettings }),
      logout: () => set({ accessToken: null, user: null, authSettings: null }),
    }),
    { name: 'tenant-auth' },
  ),
);
