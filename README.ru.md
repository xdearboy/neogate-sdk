# Neogate SDK

[English](README.md) · **Русский**

Всё, чтобы управлять [Neogate](https://neogate.systems) из кода и из ИИ-агентов.

| | |
|---|---|
| [`packages/sdk`](packages/sdk) | `neogate-sdk`: типизированный TypeScript-клиент API панели. Без зависимостей, работает в Node 20+ и Bun. |
| [`packages/mcp`](packages/mcp) | `neogate-mcp`: MCP-сервер для любого MCP-клиента (Claude, Codex, Cursor, Antigravity, Gemini CLI, VS Code…). Агент читает атаки и трафик и, если вы разрешите, меняет защиту. |
| [`skills/`](skills) | Готовые сценарии: разбор атаки, «почему посетитель не может зайти», подключение домена, недельный обзор. Скиллы для Claude Code и [`AGENTS.md`](skills/AGENTS.md) для всех остальных агентов. |

## Быстрый старт

1. В панели откройте **аккаунт → API-токены** и создайте токен. Выбирайте *чтение*, если не нужно ничего менять. Токен показывается один раз.
2. Подключитесь:

```ts
import { Neogate } from 'neogate-sdk';

const neogate = new Neogate({ token: process.env.NEOGATE_TOKEN });
const [project] = await neogate.projects.list();
console.log(await neogate.projects.overview(project.id));
```

```sh
# Claude Code
claude mcp add neogate -e NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp
# Codex
codex mcp add neogate --env NEOGATE_TOKEN=ngt_… -- npx -y neogate-mcp
```

Cursor, Antigravity, VS Code и остальные: [`packages/mcp`](packages/mcp/README.ru.md#установка).

## Что может токен

Токен действует от вашего имени в **API проектов, доменов и статистики** и больше нигде.

- `read`: смотреть всё, что вы видите в панели.
- `write`: плюс создавать проекты, подключать домены, менять настройки защиты и ориджины.
- Ни тот ни другой не могут: аккаунт, пароль, оплату, участников проекта, слияние и удаление проектов. Для этого нужна сессия панели.

Токен может истекать, удаляется в панели в любой момент, в базе хранится только его хеш.

## Структура

```
sdk/
  packages/sdk      клиент: http.ts (транспорт, ретраи, таймауты), errors.ts, resources/
  packages/mcp      сервер: tools/ (чтение, запись), summarize.ts, prompts.ts, bin.ts
  skills/           по SKILL.md на сценарий
```

Только клиент знает про HTTP API. MCP-сервер тонкий слой поверх него: он готовит ответы для модели (сводки вместо 360 сырых точек).

## Разработка

```sh
bun install
bun run check     # типы обоих пакетов и тесты
bun run build
```

В репозитории панели есть контрактный тест (`tests/api/sdkContract.test.ts`): он прогоняет этот SDK против настоящего приложения, поэтому изменение API, ломающее клиент, падает там первым.
