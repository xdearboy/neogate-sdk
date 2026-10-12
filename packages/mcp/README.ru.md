# neogate-mcp

[English](README.md) · **Русский**

[MCP](https://modelcontextprotocol.io)-сервер для Neogate. Спросите агента «нас атакуют?», «что за всплеск в 3 ночи?», «почему клиент не может открыть сайт?», и он прочитает настоящие данные.

Сервер говорит на обычном MCP по stdio, поэтому подходит любому клиенту, который так умеет: Claude Code и Desktop, Codex, Cursor, Antigravity, Gemini CLI, VS Code, Windsurf, Zed и остальным.

## Установка

Создайте токен в панели (**аккаунт → API-токены**) и добавьте сервер в клиент. Команда всегда одна: `npx -y neogate-mcp`, а `NEOGATE_TOKEN` лежит в её окружении.

**Claude Code**

```sh
claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp
```

**Codex** (CLI или IDE)

```sh
codex mcp add neogate --env NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp
```

или в `~/.codex/config.toml`:

```toml
[mcp_servers.neogate]
command = "npx"
args = ["-y", "neogate-mcp"]

[mcp_servers.neogate.env]
NEOGATE_TOKEN = "ngt_…"
```

**Antigravity** (CLI; IDE читает тот же `~/.gemini/config/mcp_config.json`). Флаги идут до имени:

```sh
agy mcp add --env NEOGATE_TOKEN=ngt_… neogate npx -y neogate-mcp
```

**Gemini CLI**

```sh
gemini mcp add -s user -e NEOGATE_TOKEN=ngt_… neogate npx -y neogate-mcp
```

**Cursor** (`~/.cursor/mcp.json` или `.cursor/mcp.json` в проекте). Cursor раскрывает `${env:NAME}`, так что токен можно держать в окружении:

```json
{
  "mcpServers": {
    "neogate": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "neogate-mcp"],
      "env": { "NEOGATE_TOKEN": "${env:NEOGATE_TOKEN}" }
    }
  }
}
```

**Claude Desktop, Windsurf и другие клиенты, читающие `mcpServers`:**

```json
{
  "mcpServers": {
    "neogate": {
      "command": "npx",
      "args": ["-y", "neogate-mcp"],
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
      "args": ["-y", "neogate-mcp"],
      "env": { "NEOGATE_TOKEN": "ngt_…" }
    }
  }
}
```

Не коммитьте токен в файлы репозитория: используйте секреты или переменные окружения клиента, где они есть.

## Сценарии для агентов без скиллов

Claude Code читает папку [`skills/`](../../skills). Остальные агенты могут взять [`skills/AGENTS.md`](../../skills/AGENTS.md): те же четыре сценария одним файлом, готовым для вставки в `AGENTS.md` проекта, правила Cursor или промпт Codex. Три из них сервер ещё отдаёт как MCP-промпты (`triage_attack`, `weekly_review`, `connect_domain`) клиентам, которые их показывают.

## Только чтение по умолчанию

Без `--allow-write` сервер не регистрирует ни одной функции, которая что-то меняет. Чтобы агент мог подключать домены и настраивать защиту, нужен токен с доступом *«чтение и запись»* **и** флаг:

```sh
claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp --allow-write
```

Нужны оба условия сознательно: флаг решает, что видит модель, токен решает, что разрешит панель. Функции удаления нет.

## Функции

Чтение: `whoami`, `account_summary`, `list_projects`, `get_project`, `project_status`, `domain_status`, `traffic`, `list_attacks`, `get_attack`, `blocked_requests`, `protection_funnel`, `report`, `get_protection`, `check_connection`.

Запись (`--allow-write`): `create_project`, `connect_domain`, `update_protection`, `update_origin`.

Ответы сжаты для модели: `traffic` отдаёт пик, среднее и не больше 24 точек тренда вместо сотен сырых замеров, `get_attack` отдаёт топ-5 каждой разбивки.

Промпты: `triage_attack`, `weekly_review`, `connect_domain`.

## Окружение

| | |
|---|---|
| `NEOGATE_TOKEN` | обязателен |
| `NEOGATE_URL` | по умолчанию `https://dash.neogate.systems` |
| `NEOGATE_MCP_WRITE=1` | то же, что `--allow-write` |
