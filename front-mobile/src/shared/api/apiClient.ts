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
}

const DEFAULT_TIMEOUT_MS = 10000;

async function request<T>(
  url: string,
  method: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...options?.headers,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

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
      throw new ApiError('La solicitud al servidor excedió el tiempo límite (timeout).', 0);
    }

    const message = error instanceof Error ? error.message : 'Error desconocido de red.';
    throw new ApiError(`Error de conexión con el backend: ${message}`, 0);
  }
}

export const apiClient = {
  get: <T>(url: string, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'GET', undefined, options),

  post: <T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'POST', body, options),

  put: <T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'PUT', body, options),

  patch: <T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'PATCH', body, options),

  delete: <T>(url: string, options?: RequestOptions): Promise<T> =>
    request<T>(url, 'DELETE', undefined, options),
};
