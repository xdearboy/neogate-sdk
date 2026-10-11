import { NetworkError, apiError } from './errors.js';

export interface ClientOptions {
  /** A personal token (ngt_…), made in the panel under "аккаунт". Defaults to NEOGATE_TOKEN. */
  token?: string;
  /** Defaults to NEOGATE_URL, then https://dash.neogate.systems */
  baseUrl?: string;
  /** Per attempt. Default 30 000 ms. */
  timeoutMs?: number;
  /** Extra attempts for reads after a network error, 429 or 502-504. Default 2; writes are never retried. */
  retries?: number;
  /** For tests, proxies and runtimes without a global fetch. */
  fetch?: typeof fetch;
}

export const DEFAULT_BASE_URL = 'https://dash.neogate.systems';
const RETRY_STATUS = new Set([429, 502, 503, 504]);

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

const env = (k: string): string | undefined => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[k];

export class Http {
  readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClientOptions = {}) {
    const token = opts.token ?? env('NEOGATE_TOKEN');
    if (!token) throw new TypeError('Neogate: no token. Pass { token } or set NEOGATE_TOKEN (make one in the panel: аккаунт → API-токены).');
    this.token = token;
    this.baseUrl = (opts.baseUrl ?? env('NEOGATE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.retries = Math.max(0, opts.retries ?? 2);
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  get<T>(path: string, o: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, o);
  }
  post<T>(path: string, body?: unknown, o: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...o, body });
  }
  put<T>(path: string, body?: unknown, o: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...o, body });
  }
  patch<T>(path: string, body?: unknown, o: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, { ...o, body });
  }
  delete<T>(path: string, o: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, o);
  }

  private url(path: string, query?: RequestOptions['query']): string {
    const u = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) u.searchParams.set(k, String(v));
    return u.toString();
  }

  async request<T>(method: string, path: string, o: RequestOptions = {}): Promise<T> {
    const idempotent = method === 'GET' || method === 'HEAD';
    const attempts = idempotent ? this.retries + 1 : 1;
    const url = this.url(path, o.query);
    let last: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      if (attempt > 0) await sleep(backoff(attempt, last), o.signal);
      try {
        return await this.once<T>(method, path, url, o);
      } catch (e) {
        last = e;
        const retryable = e instanceof NetworkError ? !o.signal?.aborted : e instanceof Object && 'status' in e && RETRY_STATUS.has((e as { status: number }).status);
        if (!retryable || attempt === attempts - 1) throw e;
      }
    }
    throw last;
  }

  private async once<T>(method: string, path: string, url: string, o: RequestOptions): Promise<T> {
    const timer = AbortSignal.timeout(this.timeoutMs);
    const signal = o.signal ? AbortSignal.any([o.signal, timer]) : timer;
    const headers: Record<string, string> = { authorization: `Bearer ${this.token}`, accept: 'application/json' };
    if (o.body !== undefined) headers['content-type'] = 'application/json';

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), signal });
    } catch (e) {
      const timedOut = timer.aborted;
      throw new NetworkError(timedOut ? `${method} ${path}: no answer in ${this.timeoutMs} ms` : `${method} ${path}: ${(e as Error).message}`, timedOut, e);
    }

    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
    }
    if (res.ok) return body as T;

    const message = (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : text) || res.statusText || `HTTP ${res.status}`;
    const ra = Number(res.headers.get('retry-after'));
    throw apiError(res.status, message, method, path, body, Number.isFinite(ra) && ra > 0 ? ra : undefined);
  }
}

function backoff(attempt: number, last: unknown): number {
  const asked = last && typeof last === 'object' && 'retryAfter' in last ? Number((last as { retryAfter?: number }).retryAfter) : 0;
  if (asked > 0) return Math.min(asked, 30) * 1000;
  return 300 * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new NetworkError('aborted', false, signal.reason));
    });
  });
}
