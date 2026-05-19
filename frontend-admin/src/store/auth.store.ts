import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthPolicy } from '../types/auth-policy';

interface AuthState {
  accessToken: string | null;
  authSettings: AuthPolicy | null;
  setToken: (token: string) => void;
  setAuth: (token: string, authSettings: AuthPolicy) => void;
  replaceToken: (token: string) => void;
  setAuthSettings: (authSettings: AuthPolicy) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      authSettings: null,
      setToken: (token) => set({ accessToken: token }),
      setAuth: (accessToken, authSettings) => set({ accessToken, authSettings }),
      replaceToken: (accessToken) => set({ accessToken }),
      setAuthSettings: (authSettings) => set({ authSettings }),
      logout: () => set({ accessToken: null, authSettings: null }),
    }),
    { name: 'admin-auth' },
  ),
);
