import { readJson, writeJson } from '../../../shared/storage/mmkv';
import {
  DEFAULT_CURRENCY_PREFERENCE,
  type CurrencyPreference,
} from '../models/currencyPreference';

const STORAGE_KEY = 'preferences.currency.v1';

export function getCurrencyPreference(): CurrencyPreference {
  return readJson(STORAGE_KEY, DEFAULT_CURRENCY_PREFERENCE);
}

export function saveCurrencyPreference(preference: CurrencyPreference): void {
  if (!/^[A-Z]{3}$/.test(preference.currencyCode)) {
    throw new Error('La moneda debe identificarse con un código ISO de tres letras.');
  }
  if (!preference.locale.trim()) {
    throw new Error('La configuración regional es obligatoria.');
  }
  writeJson(STORAGE_KEY, preference);
}
