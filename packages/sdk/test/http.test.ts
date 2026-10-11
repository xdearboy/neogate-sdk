import { describe, expect, test } from 'bun:test';
import { ApiError, AuthenticationError, NetworkError, NeogateError, NotFoundError, PermissionError, RateLimitError, ValidationError } from '../src/errors.js';
import { Neogate } from '../src/index.js';

const TOKEN = `ngt_${'a'.repeat(48)}`;

type Call = { url: string; init: RequestInit };
function fake(...answers: (Response | Error)[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const a = answers[Math.min(calls.length - 1, answers.length - 1)]!;
    if (a instanceof Error) throw a;
    return a.clone();
  }) as unknown as typeof fetch;
  return { f, calls };
}
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const client = (f: typeof fetch, extra = {}) => new Neogate({ token: TOKEN, baseUrl: 'https://panel.test/', fetch: f, retries: 2, ...extra });

describe('requests', () => {
  test('sends the token as a Bearer and asks for JSON', async () => {
    const { f, calls } = fake(json({ id: 1, email: 'a@b.c', role: 'client', emailVerified: true }));
    expect((await client(f).me()).email).toBe('a@b.c');
    expect(calls[0]!.url).toBe('https://panel.test/api/me');
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(h.authorization).toBe(`Bearer ${TOKEN}`);
    expect(h.accept).toBe('application/json');
  });

  test('query values go on the URL, undefined ones stay off', async () => {
    const { f, calls } = fake(json([]));
    await client(f).projects.traffic(7, 60);
    expect(calls[0]!.url).toBe('https://panel.test/api/projects/7/rps?minutes=60');
  });

  test('a body is JSON with the content type', async () => {
    const { f, calls } = fake(json({ id: 3 }));
    await client(f).projects.create('d3vo.ru');
    expect(calls[0]!.init.method).toBe('POST');
    expect((calls[0]!.init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect(calls[0]!.init.body).toBe('{"root":"d3vo.ru"}');
  });

  test('no token is a TypeError before any request', () => {
    const old = process.env.NEOGATE_TOKEN;
    delete process.env.NEOGATE_TOKEN;
    try {
      expect(() => new Neogate()).toThrow(/NEOGATE_TOKEN/);
    } finally {
      if (old) process.env.NEOGATE_TOKEN = old;
    }
  });
});

describe('errors', () => {
  const cases: [number, new (...a: never[]) => ApiError][] = [
    [401, AuthenticationError],
    [403, PermissionError],
    [402, PermissionError],
    [404, NotFoundError],
    [422, ValidationError],
    [400, ValidationError],
  ];
  for (const [status, cls] of cases) {
    test(`${status} becomes ${cls.name}, with the panel's own words`, async () => {
      const { f } = fake(json({ error: 'Токен только для чтения' }, status));
      const e = await client(f).projects.list().catch((x) => x);
      expect(e).toBeInstanceOf(cls);
      expect(e).toBeInstanceOf(NeogateError);
      expect(e.status).toBe(status);
      expect(e.message).toBe('Токен только для чтения');
      expect(e.path).toBe('/api/projects');
    });
  }

  test('a plain-text error body is still the message', async () => {
    const { f } = fake(new Response('Bad gateway', { status: 500 }));
    const e = await client(f, { retries: 0 }).me().catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toBe('Bad gateway');
  });
});

describe('retries', () => {
  test('a read retries a 503 and then succeeds', async () => {
    const { f, calls } = fake(json({ error: 'down' }, 503), json({ id: 1, email: 'x', role: 'client', emailVerified: true }));
    await client(f).me();
    expect(calls.length).toBe(2);
  });

  test('a read gives up after the retries', async () => {
    const { f, calls } = fake(json({ error: 'down' }, 503));
    const e = await client(f, { retries: 1 }).me().catch((x) => x);
    expect(e.status).toBe(503);
    expect(calls.length).toBe(2);
  });

  test('a write is never retried', async () => {
    const { f, calls } = fake(json({ error: 'down' }, 503));
    await client(f).projects.create('a.ru').catch(() => {});
    expect(calls.length).toBe(1);
  });

  test('a 404 is not retried', async () => {
    const { f, calls } = fake(json({ error: 'no' }, 404));
    await client(f).projects.get(9).catch(() => {});
    expect(calls.length).toBe(1);
  });

  test('429 is retried after the wait the panel asked for, and surfaces as RateLimitError when it persists', async () => {
    const { f, calls } = fake(json({ error: 'slow down' }, 429, { 'retry-after': '1' }));
    const t0 = Date.now();
    const e = await client(f, { retries: 1 }).me().catch((x) => x);
    expect(e).toBeInstanceOf(RateLimitError);
    expect(e.retryAfter).toBe(1);
    expect(calls.length).toBe(2);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900);
  });

  test('a network error on a read is retried, then reported as NetworkError', async () => {
    const { f, calls } = fake(new TypeError('fetch failed'));
    const e = await client(f, { retries: 1 }).me().catch((x) => x);
    expect(e).toBeInstanceOf(NetworkError);
    expect(e.timedOut).toBe(false);
    expect(calls.length).toBe(2);
  });

  test('a slow answer times out', async () => {
    const f = ((_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as unknown as typeof fetch;
    const e = await client(f, { timeoutMs: 40, retries: 0 }).me().catch((x) => x);
    expect(e).toBeInstanceOf(NetworkError);
    expect(e.timedOut).toBe(true);
  });
});
