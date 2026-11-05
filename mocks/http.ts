import { http, HttpResponse, type HttpResponseResolver } from 'msw';
import type { z } from 'zod';
import { ERROR_STATUS } from '@/lib/contracts';
import { fail, MockError, tick } from './db';
import { networkConditions } from './scenario';

type Info = Parameters<HttpResponseResolver>[0];
type Method = 'get' | 'post' | 'patch' | 'delete';

/** Every mock route: network scenario → advance timers → resolver → contract-shaped errors. */
export const route = (
  method: Method,
  path: string,
  resolver: (info: Info) => Response | Promise<Response>,
) =>
  // `*` origin: matches relative browser requests and absolute server-side ones alike.
  http[method](`*${path}`, async (info) => {
    const blocked = await networkConditions();
    if (blocked) return blocked;
    tick();
    try {
      return await resolver(info);
    } catch (e) {
      if (!(e instanceof MockError)) throw e;
      return HttpResponse.json(
        { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) },
        { status: ERROR_STATUS[e.code], headers: e.headers },
      );
    }
  });

export const json = (data: unknown, status = 200) => HttpResponse.json(data as never, { status });
export const ok = () => json({ ok: true });

/** Validate a request body against the contract; 400 VALIDATION_FAILED otherwise. */
export async function body<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const raw: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return fail('VALIDATION_FAILED', 'Invalid request', { issues: parsed.error.issues });
  return parsed.data;
}

export const param = (info: Info, name: string) => String(info.params[name]);
