import { apiRoutes } from '../../../config/apiRoutes';
import {
  apiClient,
  clearAuthSession,
  setAuthSession,
} from '../../../shared/api/apiClient';
import type { OwnerDTO } from '../../../shared/api/types';
import { getAuthTokens, type AuthTokens } from './authTokens';

type AuthResponse = {
  access_token?: string;
  token?: string;
  refresh_token: string;
  expires_in: number;
  owner: OwnerDTO;
};

function tokenPair(response: AuthResponse): AuthTokens {
  const accessToken = response.access_token ?? response.token;
  if (!accessToken || !response.refresh_token) {
    throw new Error(
      'La API devolvió una respuesta de autenticación incompleta.',
    );
  }
  return {
    accessToken,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<OwnerDTO> {
  const response = await apiClient.post<AuthResponse>(
    apiRoutes.auth.login(),
    { email, password },
    { skipAuth: true },
  );
  await setAuthSession(tokenPair(response));
  return response.owner;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<OwnerDTO> {
  const response = await apiClient.post<AuthResponse>(
    apiRoutes.auth.register(),
    input,
    { skipAuth: true },
  );
  await setAuthSession(tokenPair(response));
  return response.owner;
}

export function getCurrentOwner(): Promise<OwnerDTO> {
  return apiClient.get<OwnerDTO>(apiRoutes.auth.me());
}

export async function logout(): Promise<void> {
  const tokens = await getAuthTokens();
  await clearAuthSession();
  if (tokens?.refreshToken) {
    await apiClient.post<void>(
      apiRoutes.auth.logout(),
      { refresh_token: tokens.refreshToken },
      { skipAuth: true },
    );
  }
}
