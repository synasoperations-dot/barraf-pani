import type { z } from 'zod';
import { ApiErrorBody, type ErrorCode, HEADERS } from '@/lib/contracts';

/** Every failed call surfaces as this. The UI maps `code` to translated copy (errors.<CODE>). */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
    /** Seconds, from Retry-After (RATE_LIMITED, IN_PROGRESS). */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Generate when the checkout screen opens; reuse on every retry (ARCHITECTURE §2.4). */
export const newIdempotencyKey = () => crypto.randomUUID();

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions<S extends z.ZodType> {
  schema: S;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

// ponytail: server-side reads need an absolute URL; set API_BASE_URL when the backend is real.
const base = () =>
  typeof window === 'undefined' ? (process.env.API_BASE_URL ?? 'http://localhost:3000') : '';

function buildUrl(path: string, query?: RequestOptions<z.ZodType>['query']) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) params.append(k, one);
  }
  const qs = params.toString();
  return `${base()}${path}${qs ? `?${qs}` : ''}`;
}

export async function request<S extends z.ZodType>(
  method: Method,
  path: string,
  { schema, body, query, idempotencyKey, signal }: RequestOptions<S>,
): Promise<z.infer<S>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers[HEADERS.idempotencyKey] = idempotencyKey;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
  }

  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = ApiErrorBody.safeParse(json);
    const retry = Number(res.headers.get(HEADERS.retryAfter));
    if (parsed.success) {
      const { code, message, details } = parsed.data;
      throw new ApiError(
        code,
        message,
        res.status,
        details,
        Number.isFinite(retry) ? retry : undefined,
      );
    }
    throw new ApiError('INTERNAL_ERROR', `HTTP ${res.status}`, res.status);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // Contract mismatch: fix it in the backend (ARCHITECTURE §3.6 step 5).
    console.error(`[api] ${method} ${path} response does not match contract`, parsed.error);
    throw new ApiError('INTERNAL_ERROR', 'Response did not match contract', res.status);
  }
  return parsed.data;
}
