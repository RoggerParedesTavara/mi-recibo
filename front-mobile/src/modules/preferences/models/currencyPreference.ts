export interface CurrencyPreference {
  currencyCode: string;
  locale: string;
}

export const DEFAULT_CURRENCY_PREFERENCE: CurrencyPreference = {
  currencyCode: 'PEN',
  locale: 'es-PE',
};
