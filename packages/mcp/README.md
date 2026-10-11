# @neogate/mcp

**English** · [Русский](README.ru.md)

An [MCP](https://modelcontextprotocol.io) server for Neogate. Ask your agent "are we under attack?", "what was that spike at 3 am?", "why can this customer not open the site?" and it reads the real data.

It speaks plain MCP over stdio, so it works with any client that does: Claude Code and Desktop, Codex, Cursor, Antigravity, Gemini CLI, VS Code, Windsurf, Zed and the rest.

## Install

Make a token in the panel (**аккаунт → API-токены**), then add the server to your client. The command is always `npx -y @neogate/mcp` with `NEOGATE_TOKEN` in its environment.

**Claude Code**

```sh
claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y @neogate/mcp
```

**Codex** (CLI or IDE)

```sh
codex mcp add neogate --env NEOGATE_TOKEN=ngt_… -- npx -y @neogate/mcp
```

or in `~/.codex/config.toml`:

```toml
[mcp_servers.neogate]
command = "npx"
args = ["-y", "@neogate/mcp"]

[mcp_servers.neogate.env]
NEOGATE_TOKEN = "ngt_…"
```

**Antigravity** (CLI; the IDE reads the same `~/.gemini/config/mcp_config.json`). Flags go before the name:

```sh
agy mcp add --env NEOGATE_TOKEN=ngt_… neogate npx -y @neogate/mcp
```

**Gemini CLI**

```sh
gemini mcp add -s user -e NEOGATE_TOKEN=ngt_… neogate npx -y @neogate/mcp
```

**Cursor** (`~/.cursor/mcp.json`, or `.cursor/mcp.json` in a project). Cursor expands `${env:NAME}`, so the token can stay in your environment:

```json
{
  "mcpServers": {
    "neogate": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@neogate/mcp"],
      "env": { "NEOGATE_TOKEN": "${env:NEOGATE_TOKEN}" }
    }
  }
}
```

**Claude Desktop, Windsurf and other clients that read `mcpServers`:**

```json
{
  "mcpServers": {
    "neogate": {
      "command": "npx",
      "args": ["-y", "@neogate/mcp"],
      "env": { "NEOGATE_TOKEN": "ngt_…" }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`)

```json
{
  "servers": {
    "neogate": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@neogate/mcp"],
      "env": { "NEOGATE_TOKEN": "ngt_…" }
    }
  }
}
```

Keep the token out of files you commit: use your client's secret or environment support where it has one.

## Playbooks for agents without skills

Claude Code reads the [`skills/`](../../skills) folder. Other agents can use [`skills/AGENTS.md`](../../skills/AGENTS.md): the same four workflows in one file, ready to paste into a project's `AGENTS.md`, Cursor rules or a Codex prompt. The MCP server also offers three of them as prompts (`triage_attack`, `weekly_review`, `connect_domain`) to clients that show MCP prompts.

## Read-only by default

Without `--allow-write` the server registers no tool that can change anything. To let an agent connect domains and tune protection, use a *write* token **and** add the flag:

```sh
claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y @neogate/mcp --allow-write
```

Both are needed on purpose: the flag decides what the model is offered, the token decides what the panel permits. There is no delete tool.

## Tools

Read: `whoami`, `account_summary`, `list_projects`, `get_project`, `project_status`, `domain_status`, `traffic`, `list_attacks`, `get_attack`, `blocked_requests`, `protection_funnel`, `report`, `get_protection`, `check_connection`.

Write (`--allow-write`): `create_project`, `connect_domain`, `update_protection`, `update_origin`.

Answers are cut down for a model: `traffic` gives peak, average and at most 24 trend points instead of hundreds of raw samples; `get_attack` gives the top five of each breakdown.

Prompts: `triage_attack`, `weekly_review`, `connect_domain`.

## Environment

| | |
|---|---|
| `NEOGATE_TOKEN` | required |
| `NEOGATE_URL` | default `https://dash.neogate.systems` |
| `NEOGATE_MCP_WRITE=1` | same as `--allow-write` |
