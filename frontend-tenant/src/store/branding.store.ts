import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BrandingConfig {
  primaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  companyName?: string;
}

interface BrandingState {
  branding: BrandingConfig;
  applyBranding: (config: BrandingConfig | null) => void;
  reset: () => void;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#3B82F6',
  logoUrl: undefined,
  faviconUrl: undefined,
  companyName: 'TMS',
};

/**
 * brandingStore: 로그인 응답의 brandingConfig를 저장하고
 * PrimeReact CSS 변수(:root)를 동적으로 덮어씀
 */
export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      branding: DEFAULT_BRANDING,
      applyBranding: (config) => {
        const merged = { ...DEFAULT_BRANDING, ...config };
        set({ branding: merged });
        applyCssVariables(merged);
        if (merged.faviconUrl) updateFavicon(merged.faviconUrl);
      },
      reset: () => {
        set({ branding: DEFAULT_BRANDING });
        applyCssVariables(DEFAULT_BRANDING);
      },
    }),
    { name: 'tenant-branding' },
  ),
);

function applyCssVariables(config: BrandingConfig): void {
  const root = document.documentElement;
  if (config.primaryColor) {
    root.style.setProperty('--primary-color', config.primaryColor);
    root.style.setProperty('--primary-color-text', '#ffffff');
  }
}

function updateFavicon(url: string): void {
  const link = document.getElementById('favicon') as HTMLLinkElement | null;
  if (link) link.href = url;
}
