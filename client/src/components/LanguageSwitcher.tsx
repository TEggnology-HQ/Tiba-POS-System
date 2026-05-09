import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { preferencesService } from '../lib/preferencesService';

const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ar', nativeName: 'العربية', flag: '🇪🇬' },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentLang = () => {
    return SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];
  };

  const handleChange = async (code: string) => {
    if (user) {
      await preferencesService.setLanguage(user.id, code);
    } else {
      i18n.changeLanguage(code);
    }
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = getCurrentLang();

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button 
        className="lang-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('common.language_selection')}
      >
        <span className="lang-flag">{currentLang.flag}</span>
        <span className="lang-name">{currentLang.nativeName}</span>
        <span className={`lang-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="lang-dropdown">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-option ${lang.code === i18n.language ? 'active' : ''}`}
              onClick={() => handleChange(lang.code)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-name">{lang.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
