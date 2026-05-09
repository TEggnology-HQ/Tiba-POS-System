import { invoke } from '@tauri-apps/api/core';

export const tauriService = {
  async getSettings() {
    try {
      return await invoke('get_settings');
    } catch (error) {
      console.error('Error getting settings from Tauri:', error);
      return null;
    }
  },

  async saveServerUrl(url: string) {
    try {
      return await invoke('save_server_url', { url });
    } catch (error) {
      console.error('Error saving server URL to Tauri:', error);
      throw error;
    }
  },

  async saveLanguage(lang: string) {
    try {
      return await invoke('save_language', { lang });
    } catch (error) {
      console.error('Error saving language to Tauri:', error);
      throw error;
    }
  },

  async getSystemLocale() {
    try {
      return await invoke('get_system_locale');
    } catch (error) {
      console.error('Error getting system locale from Tauri:', error);
      return 'en';
    }
  }
};
