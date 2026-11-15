import * as Keychain from 'react-native-keychain';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

const service = 'com.mirecibo.auth-tokens';
let cachedTokens: AuthTokens | null | undefined;
let readPromise: Promise<AuthTokens | null> | null = null;
let storageWrite = Promise.resolve();

function serializeStorageWrite(action: () => Promise<void>): Promise<void> {
  const nextWrite = storageWrite.then(action);
  storageWrite = nextWrite.catch(() => undefined);
  return nextWrite;
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  if (cachedTokens !== undefined) return cachedTokens;
  if (readPromise) return readPromise;

  readPromise = storageWrite
    .then(() => Keychain.getGenericPassword({ service }))
    .then(result => {
      if (!result) {
        cachedTokens = null;
        return null;
      }
      try {
        cachedTokens = JSON.parse(result.password) as AuthTokens;
        return cachedTokens;
      } catch {
        cachedTokens = null;
        return null;
      }
    })
    .finally(() => {
      readPromise = null;
    });

  return readPromise;
}

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  await serializeStorageWrite(async () => {
    const saved = await Keychain.setGenericPassword(
      'session',
      JSON.stringify(tokens),
      { service },
    );
    if (!saved)
      throw new Error(
        'No se pudieron guardar las credenciales de forma segura.',
      );
    cachedTokens = tokens;
  });
}

export async function clearAuthTokens(): Promise<void> {
  cachedTokens = null;
  await serializeStorageWrite(async () => {
    await Keychain.resetGenericPassword({ service });
  });
}
