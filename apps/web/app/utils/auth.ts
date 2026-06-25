import type { User, UserRole } from '@playplus/shared';
import type { LocationQuery, LocationQueryValue } from 'vue-router';

const DEFAULT_POST_LOGIN_PATH = '/';

function queryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export interface ApiAuthResponse {
  access_token: string;
  expires_in: number;
}

export interface ApiMeResponse {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function mapAuthResponse(api: ApiAuthResponse): { accessToken: string; expiresIn: number } {
  return {
    accessToken: api.access_token,
    expiresIn: api.expires_in,
  };
}

export function mapMeResponse(api: ApiMeResponse): User {
  return {
    id: api.id,
    email: api.email,
    role: api.role,
    createdAt: api.created_at,
  };
}

export function isValidRedirect(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false;
  }

  if (path.includes('://') || path.startsWith('/\\')) {
    return false;
  }

  return true;
}

export function resolvePostLoginRedirect(query: LocationQuery): string {
  const redirect = queryValue(query.redirect);

  if (redirect && isValidRedirect(redirect)) {
    return redirect;
  }

  return DEFAULT_POST_LOGIN_PATH;
}

export function getInitialFromEmail(email: string): string {
  const trimmed = email.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
}

export function getDisplayNameFromEmail(email: string): string {
  const localPart = email.trim().split('@')[0] ?? '';

  if (localPart.length === 0) {
    return 'Viewer';
  }

  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

export function parseApiError(error: unknown): ApiErrorBody['error'] | null {
  if (error === null || typeof error !== 'object' || !('data' in error)) {
    return null;
  }

  const data = (error as { data: unknown }).data;

  if (data === null || typeof data !== 'object' || !('error' in data)) {
    return null;
  }

  const apiError = (data as ApiErrorBody).error;

  if (typeof apiError.code !== 'string' || typeof apiError.message !== 'string') {
    return null;
  }

  return apiError;
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('statusCode' in error)) {
    return false;
  }

  return (error as { statusCode: unknown }).statusCode === 401;
}
