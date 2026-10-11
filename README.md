# Neogate SDK

Everything for driving [Neogate](https://neogate.systems) from code and from AI agents.

| | |
|---|---|
| [`packages/sdk`](packages/sdk) | `@neogate/sdk`: typed TypeScript client for the panel API. No dependencies, works in Node 20+ and Bun. |
| [`packages/mcp`](packages/mcp) | `@neogate/mcp`: an MCP server for any MCP client (Claude, Codex, Cursor, Antigravity, Gemini CLI, VS Code…), so an agent can read attacks and traffic and, when you allow it, change protection. |
| [`skills/`](skills) | Playbooks for the common jobs: attack triage, "why can this visitor not get in", connecting a domain, the weekly review. Claude Code skills, plus [`AGENTS.md`](skills/AGENTS.md) for every other agent. |

## Start

1. In the panel open **аккаунт → API-токены** and create a token. Choose *чтение* unless you need to change things. The token is shown once.
2. Pick your way in:

```ts
import { Neogate } from '@neogate/sdk';

const neogate = new Neogate({ token: process.env.NEOGATE_TOKEN });
const [project] = await neogate.projects.list();
console.log(await neogate.projects.overview(project.id));
```

```sh
# Claude Code
claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y @neogate/mcp
# Codex
codex mcp add neogate --env NEOGATE_TOKEN=ngt_… -- npx -y @neogate/mcp
```

Cursor, Antigravity, VS Code and the rest: see [`packages/mcp`](packages/mcp#install).

## What a token can do

A token speaks for you on the **project, domain and stats API** and nothing else.

- `read`: look at everything you can see in the panel.
- `write`: also create projects, connect domains, change protection settings and origins.
- Never, with either: your account, password, billing, project members, merging or deleting projects. Those need a panel session.

Tokens can expire, are deleted in the panel at any time, and only their hash is stored.

## Layout

```
sdk/
  packages/sdk      client: http.ts (transport, retries, timeouts), errors.ts, resources/
  packages/mcp      server: tools/ (read, write), summarize.ts, prompts.ts, bin.ts
  skills/           SKILL.md per workflow
```

The client is the only place that knows the HTTP API; the MCP server is a thin layer on top of it that shapes answers for a model (summaries instead of 360 raw points).

## Develop

```sh
bun install
bun run check     # typecheck both packages + tests
bun run build
```

The panel repo runs a contract test (`tests/api/sdkContract.test.ts`) that drives this SDK against the real application, so an API change that breaks the client fails there first.
