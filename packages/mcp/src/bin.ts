#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Neogate } from 'neogate-sdk';
import { createServer, SERVER_VERSION } from './server.js';

const HELP = `neogate-mcp ${SERVER_VERSION}: Neogate for Claude and other MCP clients (stdio)

  NEOGATE_TOKEN   personal API token (panel: аккаунт → API-токены)
  NEOGATE_URL     panel address, default https://dash.neogate.systems

  --allow-write   also expose the tools that change settings (needs a write token)
  --help          this text

Claude Code:  claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp
Codex:        codex mcp add neogate --env NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp
Others:       docs in the package README (Cursor, Antigravity, VS Code, Gemini CLI…)
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  if (!process.env.NEOGATE_TOKEN) {
    process.stderr.write('neogate-mcp: NEOGATE_TOKEN is not set. Make a token in the panel (аккаунт → API-токены).\n');
    process.exit(2);
  }
  const allowWrite = args.includes('--allow-write') || process.env.NEOGATE_MCP_WRITE === '1';
  const server = createServer({ client: new Neogate(), allowWrite });
  await server.connect(new StdioServerTransport());
  process.stderr.write(`neogate-mcp ${SERVER_VERSION} ready${allowWrite ? ' (writes enabled)' : ' (read-only)'}\n`);
}

main().catch((e) => {
  process.stderr.write(`neogate-mcp: ${(e as Error).message}\n`);
  process.exit(1);
});
