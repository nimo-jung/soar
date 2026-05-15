import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInfo {
  sub: number;
  tenantId: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  user: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: 'tenant-auth' },
  ),
);
