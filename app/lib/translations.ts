import { LocalizationDB } from './database';

// Simple translation utility
export class Translations {
  private static instance: Translations;
  private cache: Record<string, Record<string, string>> = {};
  private db = LocalizationDB.getInstance();

  static getInstance(): Translations {
    if (!Translations.instance) {
      Translations.instance = new Translations();
    }
    return Translations.instance;
  }

  // Get translation for a key in a specific locale
  async get(key: string, locale: string = 'en', fallback?: string): Promise<string> {
    // Check cache first
    if (!this.cache[locale]) {
      this.cache[locale] = await this.db.getTranslations(locale);
    }

    const translation = this.cache[locale][key];
    if (translation) {
      return translation;
    }

    // Return fallback or key itself
    return fallback || key;
  }

  // Get all translations for a locale
  async getAll(locale: string = 'en'): Promise<Record<string, string>> {
    if (!this.cache[locale]) {
      this.cache[locale] = await this.db.getTranslations(locale);
    }
    return this.cache[locale];
  }

  // Clear cache (call when translations are updated)
  clearCache(locale?: string): void {
    if (locale) {
      delete this.cache[locale];
    } else {
      this.cache = {};
    }
  }

  // Available locales
  getAvailableLocales(): Array<{ code: string; name: string; flag: string }> {
    return [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
    ];
  }
}

// Simple helper functions for easy access
export const translations = Translations.getInstance();

// Get a translation
export const t = (key: string, locale: string = 'en', fallback?: string) => 
  translations.get(key, locale, fallback);

// Get all translations for a locale
export const getTranslations = (locale: string = 'en') => 
  translations.getAll(locale); 