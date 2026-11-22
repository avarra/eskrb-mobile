import { API_URL } from '@/config';
import { tokenStore } from '@/data/auth';

/** A non-2xx response. `detail` comes from the server's problem details (RFC 9457) when it sends them. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(`HTTP ${status}: ${detail}`);
  }
}

/** Text to show for a failed request: the server's own `detail` for client errors, else the fallback. */
export function errorDetail(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 401 && e.detail ? e.detail : fallback;
}

let onUnauthorized: (() => void) | null = null;
/** Registered by the root layout so a 401 anywhere signs the patient out. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Init = Omit<RequestInit, 'body'> & {
  /** Plain objects are sent as JSON; FormData as multipart. */
  body?: unknown;
  /** Use this token instead of the stored one (sign-in validation). Such requests never trigger sign-out. */
  token?: string;
};

export async function request(path: string, init: Init = {}): Promise<unknown> {
  const { token: explicit, body, headers, ...rest } = init;
  const token = explicit ?? (await tokenStore.get());
  const isForm = body instanceof FormData;
  const res = await fetch(API_URL + path, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && explicit === undefined) onUnauthorized?.();
  if (!res.ok) throw new ApiError(res.status, await problemDetail(res));
  if (res.status === 204) return undefined;
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

async function problemDetail(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const p = JSON.parse(text) as { detail?: string; title?: string };
    return p.detail ?? p.title ?? text;
  } catch {
    return text || res.statusText;
  }
}

/** expo-image source for an authorized server path like `/media/<logId>`. */
export function mediaSource(path: string) {
  const token = tokenStore.peek();
  return {
    uri: path.startsWith('http') ? path : API_URL + path,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cacheKey: path,
  };
}
