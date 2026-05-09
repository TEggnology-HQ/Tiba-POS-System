import { setApiBaseUrl } from './api';
import { preferencesService } from './preferencesService';
import { tauriService } from './tauriService';
import i18n from '../i18n';

export async function initApp() {
  let serverUrl = localStorage.getItem('server_url') || 'http://pos-server.local:3001';
  let language = localStorage.getItem('user_lang_1');

  if (window.__TAURI_INTERNALS__) {
    const settings = await tauriService.getSettings();
    if (settings) {
      serverUrl = settings.server_url || serverUrl;
      language = settings.language || language;
    }

    if (!language) {
      language = await tauriService.getSystemLocale();
    }
  }

  if (serverUrl) {
    setApiBaseUrl(serverUrl);
  }

  if (language) {
    i18n.changeLanguage(language);
    localStorage.setItem('user_lang_1', language);
  }
}
