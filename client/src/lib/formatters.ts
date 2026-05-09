import i18n from '../i18n';

const currencyMap: Record<string, string> = {
  'ar': 'EGP', // Egyptian Pound for Arabic
  'en': 'PHP', // Philippine Peso for English
  'es': 'PHP', // Philippine Peso for Spanish
};

export const formatCurrency = (value: number) => {
  const lang = i18n.language || 'en';
  const currencyCode = currencyMap[lang] || 'PHP';
  
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: currencyCode,
  }).format(value);
};

export const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat(i18n.language).format(
    typeof date === 'string' ? new Date(date) : date
  );
};
