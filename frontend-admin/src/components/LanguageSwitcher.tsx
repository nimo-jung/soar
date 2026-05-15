import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const isKo = i18n.language.startsWith('ko');

  return (
    <button
      onClick={() => i18n.changeLanguage(isKo ? 'en' : 'ko')}
      aria-label="언어 변경"
      title={isKo ? 'Switch to English' : '한국어로 변경'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 0.6rem',
        height: '2.25rem',
        border: '1px solid var(--surface-border)',
        borderRadius: '6px',
        background: 'transparent',
        color: 'var(--text-color-secondary)',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, color 0.15s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-hover)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-color)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-color-secondary)';
      }}
    >
      {isKo ? 'EN' : 'KO'}
    </button>
  );
};

export default LanguageSwitcher;
