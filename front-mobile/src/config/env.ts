import Config from 'react-native-config';

export const API_BASE_URL = (Config.API_BASE_URL ?? '').replace(/\/+$/, '');

export function requireApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('Falta configurar API_BASE_URL en el archivo .env.');
  }
  return API_BASE_URL;
}
