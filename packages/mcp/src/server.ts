import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Neogate } from 'neogate-sdk';
import { registerPrompts } from './prompts.js';
import { readTools } from './tools/read.js';
import { writeTools } from './tools/write.js';

export const SERVER_NAME = 'neogate';
export const SERVER_VERSION = '0.1.0';

export interface ServerOptions {
  client: Neogate;
  allowWrite?: boolean;
}

export function createServer({ client, allowWrite = false }: ServerOptions): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        'Neogate protects websites from DDoS and bots. Start with list_projects: every other tool takes a project or domain id from it. ' +
        'Prefer project_status for "is it OK", list_attacks and get_attack for "what happened", blocked_requests for "why can this visitor not get in". ' +
        (allowWrite
          ? 'Tools that change settings are enabled: say what you will change before calling them, and read the current value first.'
          : 'This server is read-only: it cannot change anything.'),
    }
  );
  readTools(server, client);
  if (allowWrite) writeTools(server, client);
  registerPrompts(server);
  return server;
}
