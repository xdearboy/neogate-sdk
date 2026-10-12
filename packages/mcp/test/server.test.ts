import { afterEach, describe, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Neogate } from 'neogate-sdk';
import { createServer } from '../src/index.js';

function panel(routes: Record<string, unknown | ((init: RequestInit) => Response)>) {
  const asked: { method: string; path: string; body?: string }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const u = new URL(url);
    const key = `${init.method} ${u.pathname}`;
    asked.push({ method: init.method!, path: u.pathname + u.search, body: init.body as string | undefined });
    const r = routes[key];
    if (r === undefined) return new Response(JSON.stringify({ error: 'Не найдено' }), { status: 404 });
    if (typeof r === 'function') return r(init);
    return new Response(JSON.stringify(r), { status: 200 });
  }) as unknown as typeof fetch;
  return { f, asked };
}

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  while (closers.length) await closers.pop()!();
});

async function connect(routes: Record<string, unknown>, allowWrite = false) {
  const { f, asked } = panel(routes);
  const client = new Neogate({ token: `ngt_${'b'.repeat(48)}`, baseUrl: 'https://panel.test', fetch: f, retries: 0 });
  const server = createServer({ client, allowWrite });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const mcp = new Client({ name: 'test', version: '0' });
  await Promise.all([server.connect(a), mcp.connect(b)]);
  closers.push(() => mcp.close());
  return { mcp, asked };
}

const text = (r: any): string => r.content[0].text;
const data = (r: any) => JSON.parse(text(r));

describe('tools', () => {
  test('read-only by default: no tool can change anything', async () => {
    const { mcp } = await connect({});
    const tools = (await mcp.listTools()).tools;
    const names = tools.map((t) => t.name);
    expect(names).toContain('project_status');
    for (const w of ['create_project', 'connect_domain', 'update_protection', 'update_origin']) expect(names).not.toContain(w);
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  test('--allow-write adds the write tools, marked as writes, none of them destructive', async () => {
    const { mcp } = await connect({}, true);
    const tools = (await mcp.listTools()).tools;
    const w = tools.filter((t) => t.annotations?.readOnlyHint === false).map((t) => t.name).sort();
    expect(w).toEqual(['connect_domain', 'create_project', 'update_origin', 'update_protection']);
    expect(tools.every((t) => t.annotations?.destructiveHint === false)).toBe(true);
    expect(tools.find((t) => t.name === 'update_protection')!.annotations?.idempotentHint).toBe(true);
    expect(tools.some((t) => /delete|remove/.test(t.name))).toBe(false);
  });

  test('account_summary ranks domains by what was blocked and trims the lists', async () => {
    const { mcp, asked } = await connect({
      'GET /api/reports/summary': {
        days: 30, since: 'x', domain_count: 12, total_attacks: 9, total_blocked_requests: 500, peak_rps: 9000,
        top_signatures: Array.from({ length: 8 }, (_, i) => ({ signature: `s${i}`, count: 8 - i })),
        per_domain: Array.from({ length: 12 }, (_, i) => ({ host: `h${i}`, mode: 'browser', attack_count: 1, blocked_requests: i * 10 })),
      },
    });
    const out = data(await mcp.callTool({ name: 'account_summary', arguments: { days: 7 } }));
    expect(asked[0]!.path).toBe('/api/reports/summary?days=7');
    expect(out.top_signatures).toHaveLength(5);
    expect(out.per_domain).toHaveLength(10);
    expect(out.per_domain[0].host).toBe('h11');
  });

  test('every tool has a description a model can choose by', async () => {
    const { mcp } = await connect({}, true);
    for (const t of (await mcp.listTools()).tools) expect((t.description ?? '').length).toBeGreaterThan(30);
  });

  test('list_projects is cut down to what is needed to pick the next call', async () => {
    const { mcp } = await connect({
      'GET /api/projects': [
        { id: 1, root: 'd3vo.ru', customer_id: 9, created_at: 'x', my_role: 'owner', domains: [{ id: 4, host: 'api.d3vo.ru', origin: '1.2.3.4', mode: 'api', cert_status: 'ready', sync_status: 'synced' }] },
      ],
    });
    const out = data(await mcp.callTool({ name: 'list_projects', arguments: {} }));
    expect(out).toEqual([{ id: 1, root: 'd3vo.ru', role: 'owner', domains: [{ id: 4, host: 'api.d3vo.ru', mode: 'api', cert: 'ready', sync: 'synced' }] }]);
  });

  test('project_status says whether an attack is running now', async () => {
    const { mcp } = await connect({
      'GET /api/projects/1/overview': { rps: 900, blockedRps: 850, okPct: 99, blockedPct: 94, originErrPct: 0, bandwidthMbps: 1, originUp: true, byHost: [] },
      'GET /api/projects/1/attacks': [
        { id: 7, signature: 'HTTP flood', layer: 'L7', severity: 'critical', started_at: 'a', ended_at: null, peak_rps: 12000, mitigation_pct: 99, host: 'd3vo.ru', domain_id: 1 },
        { id: 6, signature: 'HTTP flood', layer: 'L7', severity: 'high', started_at: 'a', ended_at: 'b', peak_rps: 300, mitigation_pct: 100 },
      ],
    });
    const out = data(await mcp.callTool({ name: 'project_status', arguments: { projectId: 1 } }));
    expect(out.under_attack).toBe(true);
    expect(out.ongoing_attacks).toHaveLength(1);
    expect(out.ongoing_attacks[0]).toMatchObject({ id: 7, ongoing: true, peak_rps: 12000 });
    expect(out.rps).toBe(900);
  });

  test('traffic is summarised, not dumped, and a domain narrows it', async () => {
    const points = Array.from({ length: 360 }, (_, i) => ({ t: 1_700_000_000_000 + i * 60_000, v: i === 200 ? 5000 : 10, blocked: i === 200 ? 4900 : 0 }));
    const { mcp, asked } = await connect({
      'GET /api/stats/4/rps': points,
      'GET /api/stats/4/codes': [{ code: '2xx', count: 100 }, { code: '4xx', count: 5 }],
    });
    const out = data(await mcp.callTool({ name: 'traffic', arguments: { projectId: 1, domainId: 4, minutes: 360 } }));
    expect(asked[0]!.path).toBe('/api/stats/4/rps?minutes=360');
    expect(out.peak.rps).toBe(5000);
    expect(out.series.length).toBeLessThanOrEqual(24);
    expect(text(await mcp.callTool({ name: 'traffic', arguments: { projectId: 1, domainId: 4 } })).length).toBeLessThan(4000);
  });

  test('get_attack explains who, from where and why', async () => {
    const { mcp } = await connect({
      'GET /api/stats/1/attacks/7': {
        id: 7, signature: 'HTTP flood', layer: 'L7', severity: 'critical', started_at: 'a', ended_at: 'b', peak_rps: 12000, mitigation_pct: 99,
        details: {
          classification: 'botnet', unique_ips: 237,
          geo_breakdown: Array.from({ length: 12 }, (_, i) => ({ country: `C${i}`, count: 10, pct: 8 })),
          top_ips: [{ ip: '1.1.1.1', count: 900, asn: 'AS1' }],
          user_agents: [{ ua: 'x'.repeat(500), count: 5 }],
          drop_reasons: [{ reason: 'challenge_failer', count: 9000 }],
        },
      },
    });
    const out = data(await mcp.callTool({ name: 'get_attack', arguments: { domainId: 1, attackId: 7 } }));
    expect(out.classification).toBe('botnet');
    expect(out.countries).toHaveLength(5);
    expect(out.user_agents[0].ua.length).toBe(120);
    expect(out.drop_reasons[0].reason).toBe('challenge_failer');
  });
});

describe('writes', () => {
  test('connect_domain posts what it was given', async () => {
    const { mcp, asked } = await connect({ 'POST /api/projects/1/domains': { id: 9, host: 'api.d3vo.ru' } }, true);
    const r = await mcp.callTool({ name: 'connect_domain', arguments: { projectId: 1, name: 'api', origin: '203.0.113.10', mode: 'api' } });
    expect(r.isError).toBeFalsy();
    expect(JSON.parse(asked[0]!.body!)).toEqual({ name: 'api', origin: '203.0.113.10', mode: 'api' });
  });

  test('update_protection sends only the fields that were given', async () => {
    const { mcp, asked } = await connect({ 'PUT /api/domains/4/settings': { mode: 'api' } }, true);
    await mcp.callTool({ name: 'update_protection', arguments: { domainId: 4, rate_limit_per_min: 120 } });
    expect(JSON.parse(asked[0]!.body!)).toEqual({ rate_limit_per_min: 120 });
  });

  test('bad arguments are refused before the panel is asked', async () => {
    const { mcp, asked } = await connect({}, true);
    const r = await mcp.callTool({ name: 'connect_domain', arguments: { projectId: 1, name: 'api', origin: '1.2.3.4', mode: 'nonsense' } }).catch((e) => e);
    expect(r instanceof Error || (r as any).isError).toBe(true);
    expect(asked).toHaveLength(0);
  });
});

describe('errors', () => {
  test('a read-only token on a write explains itself, as a tool error not a crash', async () => {
    const { mcp } = await connect({ 'POST /api/projects': (() => new Response(JSON.stringify({ error: 'Токен только для чтения' }), { status: 403 })) as never }, true);
    const r: any = await mcp.callTool({ name: 'create_project', arguments: { root: 'example.com' } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('Токен только для чтения');
    expect(text(r)).toContain('чтение и запись');
  });

  test('a rejected token says how to get a new one', async () => {
    const { mcp } = await connect({ 'GET /api/me': (() => new Response(JSON.stringify({ error: 'Sign in first' }), { status: 401 })) as never });
    const r: any = await mcp.callTool({ name: 'whoami', arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('API-токены');
  });

  test('a missing project is a plain not-found', async () => {
    const { mcp } = await connect({});
    const r: any = await mcp.callTool({ name: 'get_project', arguments: { projectId: 99 } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('404');
  });
});

describe('prompts', () => {
  test('the three workflows are offered', async () => {
    const { mcp } = await connect({});
    expect((await mcp.listPrompts()).prompts.map((p) => p.name).sort()).toEqual(['connect_domain', 'triage_attack', 'weekly_review']);
    const p = await mcp.getPrompt({ name: 'triage_attack', arguments: { project: 'd3vo.ru' } });
    expect((p.messages[0]!.content as any).text).toContain('d3vo.ru');
  });
});
