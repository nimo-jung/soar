/**
 * ==========================================================================
 * Network Topology — 테마 토큰 팔레트 및 CSS 변수 적용 유틸리티
 * ==========================================================================
 */

export interface NetworkTopologyPalette {
  bgMain: string;
  bgPanel: string;
  bgCard: string;
  bgNode: string;
  bgHover: string;
  borderSubtle: string;
  borderMedium: string;
  borderAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textHeading: string;
  accentBlue: string;
  accentAmber: string;
  accentRed: string;
  accentGreen: string;
  gridDot: string;
  edgeNormal: string;
  edgeActive: string;
  edgeAlert: string;
  ctrlBg: string;
  ctrlBorder: string;
  ctrlHover: string;
  ctrlText: string;
  shadow: string;
}

export const NETWORK_THEMES: Record<'dark' | 'light', NetworkTopologyPalette> = {
  dark: {
    bgMain: '#0f1117', bgPanel: '#1a1d29', bgCard: '#1e2130', bgNode: '#252838', bgHover: '#2a2e3f',
    borderSubtle: '#2a2e3f', borderMedium: '#353a4f', borderAccent: '#4a5072',
    textPrimary: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#64748b', textHeading: '#f1f5f9',
    accentBlue: '#60a5fa', accentAmber: '#fbbf24', accentRed: '#f87171', accentGreen: '#34d399',
    gridDot: '#2a2e3f', edgeNormal: '#64748b', edgeActive: '#94a3b8', edgeAlert: '#f87171',
    ctrlBg: '#1e2130', ctrlBorder: '#353a4f', ctrlHover: '#2a2e3f', ctrlText: '#94a3b8',
    shadow: 'rgba(2,6,23,0.6)',
  },
  light: {
    bgMain: '#f1f5f9', bgPanel: '#ffffff', bgCard: '#ffffff', bgNode: '#ffffff', bgHover: '#f8fafc',
    borderSubtle: '#e2e8f0', borderMedium: '#cbd5e1', borderAccent: '#94a3b8',
    textPrimary: '#1e293b', textSecondary: '#64748b', textMuted: '#94a3b8', textHeading: '#0f172a',
    accentBlue: '#3b82f6', accentAmber: '#f59e0b', accentRed: '#ef4444', accentGreen: '#10b981',
    gridDot: '#cbd5e1', edgeNormal: '#94a3b8', edgeActive: '#64748b', edgeAlert: '#ef4444',
    ctrlBg: '#ffffff', ctrlBorder: '#e2e8f0', ctrlHover: '#f1f5f9', ctrlText: '#64748b',
    shadow: 'rgba(15,23,42,0.06)',
  },
};

/**
 * 테마 팔레트를 문서 root CSS 변수로 일괄 적용
 * branding.store.ts 의 applyCssVariables() 패턴을 차용
 */
export function applyNetworkTopologyTheme(palette: NetworkTopologyPalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--bg-main', palette.bgMain);
  root.style.setProperty('--bg-panel', palette.bgPanel);
  root.style.setProperty('--bg-card', palette.bgCard);
  root.style.setProperty('--bg-node', palette.bgNode);
  root.style.setProperty('--hover-bg', palette.bgHover);
  root.style.setProperty('--highlight-bg', palette.bgHover);
  root.style.setProperty('--panel-border', palette.borderMedium);
  root.style.setProperty('--border-subtle', palette.borderSubtle);
  root.style.setProperty('--border-medium', palette.borderMedium);
  root.style.setProperty('--border-accent', palette.borderAccent);
  root.style.setProperty('--heading-text', palette.textHeading);
  root.style.setProperty('--text-primary', palette.textPrimary);
  root.style.setProperty('--text-secondary', palette.textSecondary);
  root.style.setProperty('--text-muted', palette.textMuted);
  root.style.setProperty('--accent-blue', palette.accentBlue);
  root.style.setProperty('--accent-amber', palette.accentAmber);
  root.style.setProperty('--accent-red', palette.accentRed);
  root.style.setProperty('--accent-green', palette.accentGreen);
  root.style.setProperty('--grid-dot', palette.gridDot);
  root.style.setProperty('--edge-normal', palette.edgeNormal);
  root.style.setProperty('--edge-active', palette.edgeActive);
  root.style.setProperty('--edge-alert', palette.edgeAlert);
  root.style.setProperty('--rf-ctrl-bg', palette.ctrlBg);
  root.style.setProperty('--rf-ctrl-border', palette.ctrlBorder);
  root.style.setProperty('--rf-ctrl-text', palette.ctrlText);
  root.style.setProperty('--rf-ctrl-hover', palette.ctrlHover);
  root.style.setProperty('--shadow', palette.shadow);
}

/**
 * 테마 팔레트를 ReactFlow 노드/에지 데이터용으로 변환 (inline style용)
 */
export function toReactFlowColors(palette: NetworkTopologyPalette): Record<string, any> {
  return {
    ...palette,
    'edge-normal': palette.edgeNormal,
    'edge-active': palette.edgeActive,
    'edge-alert': palette.edgeAlert,
    'grid-dot': palette.gridDot,
    'hover-bg': palette.bgHover,
    'highlight-bg': palette.bgHover,
  };
}
