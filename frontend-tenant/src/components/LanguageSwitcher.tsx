import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const isKo = i18n.language.startsWith('ko');

  return (
    <button
      onClick={() => i18n.changeLanguage(isKo ? 'en' : 'ko')}
      className="topbar-icon-btn"
      aria-label="언어 변경"
      title={isKo ? 'Switch to English' : '한국어로 변경'}
      style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        width: 'auto',
        padding: '0 0.6rem',
        border: '1px solid var(--surface-border)',
        borderRadius: '6px',
      }}
    >
      {isKo ? 'EN' : 'KO'}
    </button>
  );
};

export default LanguageSwitcher;
