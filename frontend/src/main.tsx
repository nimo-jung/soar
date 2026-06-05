import './i18n';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './layout/layout.css';
import App from './App';
import { applyStoredBrandingVariables, useBrandingStore } from './store/branding.store';
import { applyStoredThemeClass } from './constants/preferences';

// 앱 초기 렌더 이전에 테마 클래스를 적용해 로그인 화면에서도 사용자 선호를 즉시 반영한다.
applyStoredThemeClass();
applyStoredBrandingVariables();

function resolveBasenameFromPathname(pathname: string): string {
  const firstSegment = pathname.split('/').filter(Boolean)[0] ?? '';
  if (firstSegment === 'admin' || firstSegment === 'tenant' || firstSegment === 'master') {
    return `/${firstSegment}`;
  }
  return '/';
}

function Root() {
  const { branding, applyBranding } = useBrandingStore();

  // 페이지 로드 시 저장된 브랜딩 재적용
  useEffect(() => {
    applyBranding(branding);
  }, []);

  return (
    <BrowserRouter
      basename={resolveBasenameFromPathname(window.location.pathname)}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
