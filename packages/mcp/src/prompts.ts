import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const user = (text: string) => ({ messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] });

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'triage_attack',
    {
      title: 'Triage an attack',
      description: 'What is happening on a project and whether to act',
      argsSchema: { project: z.string().optional().describe('Project root, e.g. d3vo.ru. Leave empty to check them all') },
    },
    ({ project }) =>
      user(
        `Check ${project ? `the Neogate project ${project}` : 'every Neogate project'} for an attack. ` +
          'Use list_projects, then project_status for each. If something is under attack, get_attack for the biggest one and tell me in plain words: ' +
          'what kind it is, how big, how much the edge stopped, whether real visitors are affected (blocked_requests, origin errors), and what, if anything, I should change. ' +
          'Do not change settings without asking me.'
      )
  );

  server.registerPrompt(
    'weekly_review',
    {
      title: 'Weekly review',
      description: 'A short written review of the last week',
      argsSchema: { project: z.string().optional() },
    },
    ({ project }) =>
      user(
        `Write a short weekly review of ${project ? `Neogate project ${project}` : 'my Neogate projects'}. ` +
          'Use report with days=7 and compare with traffic over the same window. Cover: attacks (count, biggest, when), blocked share, origin health, anything odd. ' +
          'End with at most three concrete suggestions.'
      )
  );

  server.registerPrompt(
    'connect_domain',
    {
      title: 'Connect a domain',
      description: 'Walk through putting a domain behind Neogate',
      argsSchema: { domain: z.string().describe('The domain, e.g. api.example.com'), origin: z.string().describe('Where the site really lives, e.g. 203.0.113.10') },
    },
    ({ domain, origin }) =>
      user(
        `Connect ${domain} to Neogate with origin ${origin}. Find the project whose root it sits under (create_project if there is none), ` +
          'pick the mode from what the site is (ask me if unclear), call connect_domain, tell me exactly which DNS record to set, then check_connection until DNS and origin are OK or I tell you to stop.'
      )
  );
}
