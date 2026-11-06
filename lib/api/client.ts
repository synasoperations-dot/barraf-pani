import type { z } from 'zod';
import { ApiErrorBody, type ErrorCode, HEADERS } from '@/lib/contracts';
import { USE_MOCKS } from '@/lib/flags';

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

/** Generate when the checkout screen opens; reuse on every retry (§2.4). */
export const newIdempotencyKey = () => crypto.randomUUID();

/* ---------- Turnstile (§2.3: order, OTP, booking) ---------- */

type TurnstileProvider = () => Promise<string>;
// The checkout's Turnstile widget registers the real provider (prompt 3). Mocks accept any token.
let turnstile: TurnstileProvider = async () => (USE_MOCKS ? 'mock-turnstile-token' : '');
export const setTurnstileProvider = (p: TurnstileProvider) => {
  turnstile = p;
};

/* ---------- Request ---------- */

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions<S extends z.ZodType> {
  schema: S;
  body?: Record<string, unknown> | unknown[];
  query?: Record<string, string | readonly string[] | undefined>;
  /** Sets the Idempotency-Key header. IN_PROGRESS is retried after Retry-After with this key. */
  idempotencyKey?: string;
  /** Adds `turnstileToken` to the body. */
  turnstile?: boolean;
  signal?: AbortSignal;
  /** Server Component reads only: Next.js data cache (tag `menu`, or a short revalidate). */
  cache?: ServerCache;
}

/** Next.js fetch cache options for Server Component reads (ARCHITECTURE §2.1). */
export interface ServerCache {
  tags?: string[];
  /** Seconds. */
  revalidate?: number;
}

const MAX_IN_PROGRESS_RETRIES = 5;

// ponytail: server-side reads need an absolute URL; set API_BASE_URL when the backend is real.
const base = () =>
  typeof window === 'undefined' ? (process.env.API_BASE_URL ?? 'http://localhost:3000') : '';

function buildUrl(path: string, query?: RequestOptions<z.ZodType>['query']) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined) continue;
    for (const one of typeof v === 'string' ? [v] : v) params.append(k, one);
  }
  const qs = params.toString();
  return `${base()}${path}${qs ? `?${qs}` : ''}`;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

async function once(
  method: Method,
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
  signal?: AbortSignal,
  cache?: ServerCache,
) {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      signal,
      ...(cache ? { next: cache } : {}),
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
  }
  const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return json;

  const parsed = ApiErrorBody.safeParse(json);
  const retry = Number(res.headers.get(HEADERS.retryAfter));
  if (!parsed.success) throw new ApiError('INTERNAL_ERROR', `HTTP ${res.status}`, res.status);
  const { code, message, details } = parsed.data;
  throw new ApiError(
    code,
    message,
    res.status,
    details,
    Number.isFinite(retry) && retry > 0 ? retry : undefined,
  );
}

export async function request<S extends z.ZodType>(
  method: Method,
  path: string,
  {
    schema,
    body,
    query,
    idempotencyKey,
    turnstile: withTurnstile,
    signal,
    cache,
  }: RequestOptions<S>,
): Promise<z.infer<S>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers[HEADERS.idempotencyKey] = idempotencyKey;
  const payload =
    withTurnstile && body && !Array.isArray(body)
      ? { ...body, turnstileToken: await turnstile() }
      : body;
  const serialized = payload === undefined ? undefined : JSON.stringify(payload);
  const url = buildUrl(path, query);

  let json: unknown;
  for (let attempt = 0; ; attempt++) {
    try {
      json = await once(method, url, headers, serialized, signal, cache);
      break;
    } catch (e) {
      // §4.1: the same key is still processing → wait Retry-After and ask again (same key, same body).
      if (
        idempotencyKey &&
        e instanceof ApiError &&
        e.code === 'IN_PROGRESS' &&
        attempt < MAX_IN_PROGRESS_RETRIES
      ) {
        await sleep((e.retryAfter ?? 2) * 1000, signal);
        continue;
      }
      throw e;
    }
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    // Contract mismatch: fix it in the backend (§3.6 step 5).
    console.error(`[api] ${method} ${path} response does not match contract`, parsed.error);
    throw new ApiError('INTERNAL_ERROR', 'Response did not match contract', 200);
  }
  return parsed.data;
}
