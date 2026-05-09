import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setApiBaseUrl } from '../lib/api';
import { preferencesService } from '../lib/preferencesService';
import { tauriService } from '../lib/tauriService';

export default function Settings() {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState('http://pos-server.local:3001');
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    let savedUrl = localStorage.getItem('server_url');
    let savedLang = localStorage.getItem('user_lang_1');

    if (window.__TAURI_INTERNALS__) {
      const settings = await tauriService.getSettings();
      if (settings) {
        savedUrl = settings.server_url || savedUrl;
        savedLang = settings.language || savedLang;
      }
    }

    if (savedUrl) setServerUrl(savedUrl);
    if (savedLang) setLanguage(savedLang);
  };

  const handleSave = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('server_url', serverUrl);
      setApiBaseUrl(serverUrl);
      
      // Save language
      await preferencesService.setLanguage(1, language);

      if (window.__TAURI_INTERNALS__) {
        await tauriService.saveServerUrl(serverUrl);
        await tauriService.saveLanguage(language);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(t('common.save', 'Failed to save settings'));
    }
  };

  const handleTestConnection = async () => {
    try {
      const testApi = (await import('../lib/api')).default;
      await testApi.get('/health'); // Assuming server has a health endpoint
      alert(t('common.save', 'Connection successful!'));
    } catch {
      alert(t('common.error', 'Connection failed. Please check the URL.'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('pages.settings.title', 'Settings')}</h1>
      </div>

      <div className="settings-form">
        <div className="form-group">
          <label>{t('pages.settings.server_url', 'Server URL')}</label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://pos-server.local:3001"
            className="settings-input"
          />
          <button onClick={handleTestConnection} className="test-btn">
            {t('pages.settings.test_connection', 'Test Connection')}
          </button>
        </div>

        <div className="form-group">
          <label>{t('pages.settings.language', 'Language')}</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <button onClick={handleSave} className="save-btn">
          {t('common.save')}
        </button>

        {saved && (
          <div className="success-message">
            {t('common.save', 'Settings saved successfully!')}
          </div>
        )}
      </div>
    </div>
  );
}
