import { createMMKV } from 'react-native-mmkv';

export const localStorage = createMMKV({ id: 'mi-recibo-local' });

export function readJson<T>(key: string, fallback: T): T {
  const value = localStorage.getString(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  localStorage.set(key, JSON.stringify(value));
}
