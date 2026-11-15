import { ApiError, apiClient, isNetworkError } from './apiClient';

describe('apiClient & isNetworkError', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('detecta errores de red y timeout con isNetworkError', () => {
    expect(isNetworkError(new ApiError('Error de red', 0))).toBe(true);
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('The user aborted a request.'))).toBe(true);
    expect(isNetworkError(new ApiError('Recurso no encontrado', 404))).toBe(false);
  });

  it('ejecuta peticiones GET exitosas devolviendo el JSON parseado', async () => {
    const mockData = { status: 'ok' };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockData,
    });

    const result = await apiClient.get<typeof mockData>('http://localhost:8080/health');
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('lanza ApiError con el mensaje del backend cuando response.ok es false', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Datos inválidos' }),
    });

    await expect(apiClient.post('http://localhost:8080/api/v1/owners', {})).rejects.toThrow(
      'Datos inválidos',
    );
  });
});
