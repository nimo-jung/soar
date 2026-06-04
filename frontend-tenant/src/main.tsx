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
import { useBrandingStore } from './store/branding.store';

function Root() {
  const { branding, applyBranding } = useBrandingStore();

  // 페이지 로드 시 저장된 브랜딩 재적용
  useEffect(() => {
    applyBranding(branding);
  }, []);

  return (
    <BrowserRouter
      basename={import.meta.env.BASE_URL}
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
