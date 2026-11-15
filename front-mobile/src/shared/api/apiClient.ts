import { apiRoutes } from '../../config/apiRoutes';
import {
  clearAuthTokens,
  getAuthTokens,
  saveAuthTokens,
  type AuthTokens,
} from '../../modules/auth/api/authTokens';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 0) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('aborted') ||
      msg.includes('timeout') ||
      error.name === 'AbortError'
    );
  }
  return false;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuth?: boolean;
}

const DEFAULT_TIMEOUT_MS = 10000;
let refreshPromise: Promise<string> | null = null;
let sessionRevision = 0;
let authExpiredHandler: (() => void) | undefined;

export function onAuthExpired(handler: () => void): () => void {
  authExpiredHandler = handler;
  return () => {
    if (authExpiredHandler === handler) authExpiredHandler = undefined;
  };
}

async function expireAuthSession(): Promise<void> {
  sessionRevision += 1;
  await clearAuthTokens();
  authExpiredHandler?.();
}

interface AuthResponse {
  access_token?: string;
  token?: string;
  refresh_token: string;
  expires_in: number;
}

function errorCode(error: unknown): string | undefined {
  if (
    !(error instanceof ApiError) ||
    typeof error.data !== 'object' ||
    error.data === null
  )
    return undefined;
  const code = (error.data as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

async function send<T>(
  url: string,
  method: string,
  body: unknown,
  options: RequestOptions | undefined,
  accessToken?: string,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...options?.headers,
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        isJson && typeof data === 'object' && data !== null && 'error' in data
          ? String((data as { error: unknown }).error)
          : `Error HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof ApiError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'La solicitud al servidor excedió el tiempo límite (timeout).',
        0,
      );
    }

    const message =
      error instanceof Error ? error.message : 'Error desconocido de red.';
    throw new ApiError(`Error de conexión con el backend: ${message}`, 0);
  }
}

async function refreshAccessToken(): Promise<string> {
  const revisionAtStart = sessionRevision;
  const tokens = await getAuthTokens();
  if (revisionAtStart !== sessionRevision) {
    throw new ApiError('La sesión cambió durante la renovación.', 401, {
      code: 'SESSION_CHANGED',
    });
  }
  if (!tokens?.refreshToken) {
    await expireAuthSession();
    throw new ApiError('La sesión venció.', 401, { code: 'UNAUTHORIZED' });
  }

  try {
    const response = await send<AuthResponse>(
      apiRoutes.auth.refresh(),
      'POST',
      { refresh_token: tokens.refreshToken },
      { skipAuth: true },
    );
    if (revisionAtStart !== sessionRevision) {
      throw new ApiError('La sesión cambió durante la renovación.', 401, {
        code: 'SESSION_CHANGED',
      });
    }

    const accessToken = response.access_token ?? response.token;
    if (!accessToken || !response.refresh_token) {
      throw new Error(
        'La API devolvió una respuesta de renovación incompleta.',
      );
    }
    const nextTokens: AuthTokens = {
      accessToken,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
    };
    await saveAuthTokens(nextTokens);
    return nextTokens.accessToken;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      revisionAtStart === sessionRevision
    ) {
      await expireAuthSession();
    }
    throw error;
  }
}

function getFreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function accessTokenAfterCurrentRefresh(): Promise<string> {
  try {
    return await refreshPromise!;
  } catch (error) {
    const currentTokens = await getAuthTokens();
    if (errorCode(error) === 'SESSION_CHANGED' && currentTokens?.accessToken) {
      return currentTokens.accessToken;
    }
    throw error;
  }
}

async function request<T>(
  url: string,
  method: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  let tokens = options?.skipAuth ? null : await getAuthTokens();
  if (tokens && refreshPromise) {
    const accessToken = await accessTokenAfterCurrentRefresh();
    return send<T>(url, method, body, options, accessToken);
  }

  const usedAccessToken = tokens?.accessToken;
  try {
    return await send<T>(url, method, body, options, usedAccessToken);
  } catch (error) {
    if (
      options?.skipAuth ||
      errorCode(error) !== 'ACCESS_TOKEN_EXPIRED' ||
      !usedAccessToken
    ) {
      throw error;
    }

    // A delayed 401 may arrive after a sibling request already rotated the token.
    tokens = await getAuthTokens();
    if (!tokens) throw error;
    const accessToken =
      tokens.accessToken !== usedAccessToken
        ? tokens.accessToken
        : await getFreshAccessToken();

    // Replay once: protected routes must reject expired JWTs before handler effects.
    return send<T>(url, method, body, options, accessToken);
  }
}

export async function setAuthSession(tokens: AuthTokens): Promise<void> {
  sessionRevision += 1;
  await saveAuthTokens(tokens);
}

export async function clearAuthSession(): Promise<void> {
  sessionRevision += 1;
  await clearAuthTokens();
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'GET', undefined, options),

  post: <T>(
    url: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> => request<T>(url, 'POST', body, options),

  put: <T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'PUT', body, options),

  patch: <T>(
    url: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> => request<T>(url, 'PATCH', body, options),

  delete: <T>(url: string, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'DELETE', undefined, options),
};
