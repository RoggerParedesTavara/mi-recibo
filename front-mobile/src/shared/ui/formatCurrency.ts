import { getCurrencyPreference } from '../../modules/preferences/api/localCurrencyPreference';
import { roundUpToTenth } from './roundUpToTenth';

export function formatCurrency(amount: string | number): string {
  const preference = getCurrencyPreference();
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(preference.locale, {
    style: 'currency',
    currency: preference.currencyCode,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(roundUpToTenth(value));
}

export function formatUnitPrice(amount: string | number): string {
  const preference = getCurrencyPreference();
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(preference.locale, {
    style: 'currency',
    currency: preference.currencyCode,
    minimumFractionDigits: 1,
    maximumFractionDigits: 6,
  }).format(value);
}
