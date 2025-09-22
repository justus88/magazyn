const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  token?: string | null;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TResponse> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {};

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const errorPayload = isJson ? await response.json().catch(() => null) : null;
    const message = errorPayload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as unknown as TResponse;
  }

  return (await response.json()) as TResponse;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
