import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/TenantButton';
import { STORAGE_KEYS } from '../constants/preferences';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const isKo = i18n.language.startsWith('ko');

  const handleLanguageToggle = () => {
    const nextLanguage = isKo ? 'en' : 'ko';
    window.localStorage.setItem(STORAGE_KEYS.language, nextLanguage);
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <Button
      text
      onClick={handleLanguageToggle}
      className="topbar-icon-btn topbar-lang-btn"
      aria-label={t('common.languageSwitch')}
      tooltip={isKo ? t('common.switchToEnglish') : t('common.switchToKorean')}
      tooltipOptions={{ position: 'bottom' }}
    >
      {isKo ? 'EN' : 'KO'}
    </Button>
  );
};

export default LanguageSwitcher;
