import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'primereact/button';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const isKo = i18n.language.startsWith('ko');

  return (
    <Button
      text
      onClick={() => i18n.changeLanguage(isKo ? 'en' : 'ko')}
      className="topbar-icon-btn topbar-lang-btn"
      aria-label={t('common.languageSwitch')}
      title={isKo ? t('common.switchToEnglish') : t('common.switchToKorean')}
    >
      {isKo ? 'EN' : 'KO'}
    </Button>
  );
};

export default LanguageSwitcher;
