import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Neogate } from 'neogate-sdk';
import { defineTool } from '../define.js';
import { explainAttack, summarizeAttack, summarizeTraffic } from '../summarize.js';

const id = (what: string) => z.number().int().positive().describe(what);
const projectId = id('Project id, from list_projects');
const domainId = id('Domain id, from get_project');

export function readTools(server: McpServer, ng: Neogate): void {
  defineTool(server, {
    name: 'whoami',
    title: 'Who this token is',
    description: 'The account the token belongs to. Use it to check the connection works.',
    input: {},
    run: () => ng.me(),
  });

  defineTool(server, {
    name: 'list_projects',
    title: 'List projects',
    description:
      'Every project (a root domain such as d3vo.ru) the token can see, with its connected domains. Start here: all other tools take a project or domain id from this list.',
    input: {},
    run: async () =>
      (await ng.projects.list()).map((p) => ({
        id: p.id,
        root: p.root,
        role: p.my_role ?? 'admin',
        domains: p.domains.map((d) => ({ id: d.id, host: d.host, mode: d.mode, cert: d.cert_status, sync: d.sync_status })),
      })),
  });

  defineTool(server, {
    name: 'get_project',
    title: 'Project details',
    description: 'One project: its domains with origin, mode, certificate and sync status, and its notification settings.',
    input: { projectId },
    run: async ({ projectId }) => {
      const p = await ng.projects.get(projectId);
      return {
        id: p.id,
        root: p.root,
        role: p.my_role ?? 'admin',
        telegram: { enabled: !!p.telegram_enabled },
        weekly_report: !!p.weekly_report,
        domains: p.domains.map((d) => ({
          id: d.id,
          host: d.host,
          origin: d.origin,
          mode: d.mode,
          cert: d.cert_status,
          sync: d.sync_status,
          origin_tls: !!d.origin_tls,
        })),
      };
    },
  });

  defineTool(server, {
    name: 'project_status',
    title: 'Is the project OK right now',
    description:
      'Live state of a project: requests per second, how much the edge blocks, whether the origin answers and how fast, load per domain, and any attack that is running now.',
    input: { projectId },
    run: async ({ projectId }) => {
      const [overview, attacks] = await Promise.all([ng.projects.overview(projectId), ng.projects.attacks(projectId)]);
      const ongoing = attacks.filter((a) => a.ended_at === null).map(summarizeAttack);
      return { under_attack: ongoing.length > 0, ongoing_attacks: ongoing, ...overview };
    },
  });

  defineTool(server, {
    name: 'traffic',
    title: 'Traffic over time',
    description:
      'Requests per second over a window, as peak, average, a short trend and the response-code split. Give domainId to narrow to one domain of the project.',
    input: {
      projectId,
      domainId: domainId.optional(),
      minutes: z.number().int().min(5).max(10080).default(360).describe('Window in minutes: 60 = last hour, 1440 = day, 10080 = week'),
    },
    run: async ({ projectId, domainId, minutes }) => {
      const [points, codes] = domainId
        ? await Promise.all([ng.domains.traffic(domainId, minutes), ng.domains.codes(domainId, minutes)])
        : await Promise.all([ng.projects.traffic(projectId, minutes), ng.projects.codes(projectId, minutes)]);
      return summarizeTraffic(points, codes, minutes);
    },
  });

  defineTool(server, {
    name: 'list_attacks',
    title: 'Recent attacks',
    description: 'Attacks the edge recorded on a project, newest first: when, how big, how much was stopped. Use get_attack for the full picture of one.',
    input: { projectId, limit: z.number().int().min(1).max(50).default(10) },
    run: async ({ projectId, limit }) => (await ng.projects.attacks(projectId)).slice(0, limit).map(summarizeAttack),
  });

  defineTool(server, {
    name: 'get_attack',
    title: 'One attack in detail',
    description:
      'Who attacked, from where, what they hit and why the edge refused them: classification, source countries and networks, top addresses, paths, user agents and drop reasons.',
    input: { domainId: id('Domain id the attack was on: the domain_id from list_attacks'), attackId: id('Attack id from list_attacks') },
    run: async ({ domainId, attackId }) => explainAttack(await ng.domains.attack(domainId, attackId)),
  });

  defineTool(server, {
    name: 'blocked_requests',
    title: 'What the edge refused',
    description: 'The latest requests the edge turned away on a project, with the reason, and the reason counts for the last hour. Good for "why can this visitor not get in".',
    input: { projectId, limit: z.number().int().min(1).max(200).default(30) },
    run: async ({ projectId, limit }) => {
      const feed = await ng.projects.blocked(projectId, limit);
      return {
        refused_last_hour: feed.total,
        reasons: feed.reasons.slice(0, 8),
        latest: feed.rows.slice(0, limit).map((r) => ({ at: r.ts, host: r.host, ip: r.ip, method: r.method, path: r.path, reason: r.reason || 'dropped without an answer', status: r.status, country: r.country, ua: r.ua?.slice(0, 100) })),
      };
    },
  });

  defineTool(server, {
    name: 'report',
    title: 'Period report',
    description: 'Attacks and traffic over 1, 7 or 30 days: totals, blocked share, unique addresses, daily trend, top reasons and top addresses.',
    input: { projectId, days: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7) },
    run: async ({ projectId, days }) => {
      const r = await ng.projects.report(projectId, days);
      return {
        days: r.days,
        attacks: { count: r.attacks.count, peak_rps: r.attacks.peak_rps, duration_sec: r.attacks.duration_sec, list: r.attacks.list.slice(0, 10).map(summarizeAttack) },
        traffic: r.traffic && { ...r.traffic, top_ips: r.traffic.top_ips.slice(0, 5), reasons: r.traffic.reasons.slice(0, 8) },
      };
    },
  });

  defineTool(server, {
    name: 'account_summary',
    title: 'All projects at a glance',
    description:
      'Across every domain the token can see: attacks and refused requests over the last N days, the peak, the most common attack kinds, and which domain took the most. The first thing to call for "how are we doing overall".',
    input: { days: z.number().int().min(1).max(365).default(30) },
    run: async ({ days }) => {
      const s = await ng.summary(days);
      return { ...s, top_signatures: s.top_signatures.slice(0, 5), per_domain: [...s.per_domain].sort((a, b) => b.blocked_requests - a.blocked_requests).slice(0, 10) };
    },
  });

  defineTool(server, {
    name: 'domain_status',
    title: 'Is one domain OK right now',
    description: 'Live state of a single domain: requests per second, blocked share, origin health and response times. Use project_status for the whole project.',
    input: { domainId },
    run: ({ domainId }) => ng.domains.overview(domainId),
  });

  defineTool(server, {
    name: 'protection_funnel',
    title: 'What the edge stopped, and how',
    description:
      'Over the last day for a project: how many requests reached the site, how many failed the browser check, how many were cut by limits and filters, and the reasons. Answers "is the protection doing its job".',
    input: { projectId },
    run: ({ projectId }) => ng.projects.funnel(projectId),
  });

  defineTool(server, {
    name: 'get_protection',
    title: 'Protection settings of a domain',
    description: 'What the edge runs for a domain right now (rate limit, scanner denylist, allowed addresses, cache), what was set on purpose, and the defaults of its mode.',
    input: { domainId },
    run: ({ domainId }) => ng.domains.settings(domainId),
  });

  defineTool(server, {
    name: 'check_connection',
    title: 'Is a new domain connected',
    description: 'For a freshly connected domain: does DNS point at the edge, has a first request arrived, does the origin answer. Run it after connect_domain.',
    input: { domainId },
    run: ({ domainId }) => ng.domains.connection(domainId),
  });
}
