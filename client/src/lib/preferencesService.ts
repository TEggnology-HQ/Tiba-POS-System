import i18n from '../i18n';
import { tauriService } from './tauriService';

export const preferencesService = {
  /**
   * Gets the language preference for a specific user.
   * Fallback to current i18n language if no preference is stored.
   */
  getLanguage: (userId: number): string => {
    const savedLang = localStorage.getItem(`user_lang_${userId}`);
    return savedLang || i18n.language || 'en';
  },

  /**
   * Saves the language preference for a specific user.
   */
  setLanguage: async (userId: number, lang: string): Promise<void> => {
    localStorage.setItem(`user_lang_${userId}`, lang);
    i18n.changeLanguage(lang);

    if (window.__TAURI_INTERNALS__) {
      await tauriService.saveLanguage(lang);
    }
  },

  /**
   * Applies the stored language preference for a specific user.
   */
  applyLanguage: (userId: number): void => {
    const lang = preferencesService.getLanguage(userId);
    i18n.changeLanguage(lang);
  },
};
