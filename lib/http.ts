/** Small client-side fetch helper that turns API failures into friendly messages. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      ...init,
      headers: init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ApiError('We could not reach Gwizineza Market. Check your connection and try again.', 0);
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && typeof window !== 'undefined' && url.startsWith('/api/admin/')) window.location.href = '/admin/login';
    const fallback = response.status === 503
      ? 'Our store is temporarily unavailable. Please try again in a moment.'
      : response.status === 401
        ? 'Please sign in to continue.'
        : 'Something went wrong. Please try again.';
    throw new ApiError(typeof data.error === 'string' && data.error ? data.error : fallback, response.status);
  }
  return data;
}

export const jsonBody = (value: unknown) => JSON.stringify(value);
