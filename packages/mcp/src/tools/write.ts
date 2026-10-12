import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Neogate } from 'neogate-sdk';
import { defineTool } from '../define.js';

export function writeTools(server: McpServer, ng: Neogate): void {
  defineTool(server, {
    name: 'create_project',
    title: 'Create a project',
    description: 'Create a project for a root domain. A subdomain is reduced to its root ("api.d3vo.ru" makes "d3vo.ru"). Then connect domains with connect_domain.',
    write: true,
    input: { root: z.string().min(3).describe('Root domain, e.g. example.com') },
    run: ({ root }) => ng.projects.create(root),
  });

  defineTool(server, {
    name: 'connect_domain',
    title: 'Connect a domain',
    description:
      'Put a domain behind the protection. The origin is where the site really lives (a public IP or host, optional port). The result says which DNS record to set; afterwards run check_connection. The plan\'s domain limit applies.',
    write: true,
    input: {
      projectId: z.number().int().positive().describe('Project id from list_projects'),
      name: z.string().describe('"@" for the root itself, a label such as "api", or a full name under the root'),
      origin: z.string().min(1).describe('Origin server, e.g. 203.0.113.10 or 203.0.113.10:8443'),
      mode: z.enum(['browser', 'api', 'machine']).describe('browser: sites with visitors, adds the invisible challenge. api: JSON APIs and apps. machine: webhooks and service-to-service, no challenge'),
    },
    run: ({ projectId, name, origin, mode }) => ng.projects.connectDomain(projectId, { name, origin, mode }),
  });

  defineTool(server, {
    name: 'update_protection',
    title: 'Change protection settings',
    description:
      'Change a domain\'s protection. Only the fields you give are changed; null resets a field to its mode default; rate_limit_per_min 0 removes the per-address cap. Read get_protection first and say what you are changing.',
    write: true,
    idempotent: true,
    input: {
      domainId: z.number().int().positive(),
      rate_limit_per_min: z.number().int().min(0).nullable().optional().describe('Requests per minute per address; 0 = no cap; null = mode default'),
      scanner_denylist: z.boolean().nullable().optional().describe('Block known scanner paths and agents'),
      allowed_ips: z.array(z.string()).nullable().optional().describe('Addresses or CIDRs that skip the limits'),
      cache: z.boolean().nullable().optional().describe('Serve through the edge cache (subscription mode only)'),
    },
    run: ({ domainId, ...patch }) => ng.domains.updateSettings(domainId, patch),
  });

  defineTool(server, {
    name: 'update_origin',
    title: 'Change a domain\'s origin',
    description: 'Point a domain at another origin server. All three origin fields are replaced, so read get_project first and send the values you are keeping.',
    write: true,
    idempotent: true,
    input: {
      domainId: z.number().int().positive(),
      origin: z.string().min(1),
      origin_tls: z.boolean().describe('Connect to the origin over TLS'),
      origin_sni: z.string().nullable().describe('SNI to send to the origin, or null for the domain itself'),
    },
    run: ({ domainId, ...body }) => ng.domains.updateOrigin(domainId, body),
  });
}
