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

const BRANDING_STORAGE_KEY = 'tenant-branding';

const DEFAULT_BRANDING: BrandingConfig = {
  // Keep tenant fallback aligned with the Verona-based palette used in frontend.
  primaryColor: '#34d3c3',
  logoUrl: undefined,
  faviconUrl: undefined,
  companyName: 'Sniper TMS',
};

function readStoredBranding(): BrandingConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_BRANDING;
  }

  try {
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_BRANDING;
    }

    const parsed = JSON.parse(raw) as { state?: { branding?: BrandingConfig } };
    const stored = parsed?.state?.branding;
    if (!stored) {
      return DEFAULT_BRANDING;
    }

    return { ...DEFAULT_BRANDING, ...normalizeBrandingConfig(stored) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function applyStoredBrandingVariables(): void {
  applyCssVariables(readStoredBranding());
}

/**
 * brandingStore: 로그인 응답의 brandingConfig를 저장하고
 * PrimeReact CSS 변수(:root)를 동적으로 덮어씀
 */
export const useBrandingStore = create<BrandingState>()(
  persist(
    (set) => ({
      branding: DEFAULT_BRANDING,
      applyBranding: (config) => {
        const merged = { ...DEFAULT_BRANDING, ...normalizeBrandingConfig(config) };
        set({ branding: merged });
        applyCssVariables(merged);
        if (merged.faviconUrl) updateFavicon(merged.faviconUrl);
      },
      reset: () => {
        set({ branding: DEFAULT_BRANDING });
        applyCssVariables(DEFAULT_BRANDING);
      },
    }),
    { name: BRANDING_STORAGE_KEY },
  ),
);

function normalizeBrandingConfig(config: BrandingConfig | null): BrandingConfig {
  if (!config) {
    return {};
  }

  const normalized = { ...config };
  const companyName = normalized.companyName?.trim();
  if (companyName && companyName.toUpperCase() === 'SOAR') {
    normalized.companyName = 'Sniper TMS';
  }

  return normalized;
}

function applyCssVariables(config: BrandingConfig): void {
  const root = document.documentElement;
  if (config.primaryColor) {
    root.style.setProperty('--brand-primary', config.primaryColor);
    root.style.setProperty('--brand-gradient-from', config.primaryColor);
    root.style.setProperty('--brand-gradient-to', config.primaryColor);
    root.style.setProperty('--ca-accent-a', config.primaryColor);
    root.style.setProperty('--ca-accent-b', config.primaryColor);
    root.style.setProperty('--primary-color', config.primaryColor);
    root.style.setProperty('--primary-400', config.primaryColor);
    root.style.setProperty('--primary-500', config.primaryColor);
    root.style.setProperty('--primary-color-text', '#ffffff');
  }
}

function updateFavicon(url: string): void {
  const link = document.getElementById('favicon') as HTMLLinkElement | null;
  if (link) link.href = url;
}
