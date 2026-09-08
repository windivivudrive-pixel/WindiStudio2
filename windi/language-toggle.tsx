'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from './language-mode';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const next = language === 'vi' ? 'en' : 'vi';
  return <button data-windi-no-translate className="language-toggle" onClick={() => setLanguage(next)} aria-label={language === 'vi' ? 'Switch website language to English' : 'Chuyển ngôn ngữ website sang tiếng Việt'} title={language === 'vi' ? 'English' : 'Tiếng Việt'}><Languages size={16} /><span>{language === 'vi' ? 'EN' : 'VI'}</span></button>;
}
