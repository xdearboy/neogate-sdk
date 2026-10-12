# neogate-sdk

[English](README.md) · **Русский**

TypeScript-клиент API панели Neogate. Без зависимостей; Node 20+ и Bun (проверено). Использует только `fetch` и `AbortSignal`, так что другие современные рантаймы тоже должны подойти.

```sh
npm i neogate-sdk
```

```ts
import { Neogate, PermissionError } from 'neogate-sdk';

const neogate = new Neogate({ token: process.env.NEOGATE_TOKEN });

const projects = await neogate.projects.list();
const now = await neogate.projects.overview(projects[0].id);
console.log(`${now.rps} rps, заблокировано ${now.blockedPct}%, ориджин ${now.originUp ? 'жив' : 'лежит'}`);

const [domain] = projects[0].domains;
const attacks = await neogate.domains.attacks(domain.id);
const detail = await neogate.domains.attack(domain.id, attacks[0].id);
```

Токен (`ngt_…`) создаётся в панели: **аккаунт → API-токены**.

## Опции

| опция | по умолчанию | |
|---|---|---|
| `token` | `NEOGATE_TOKEN` | персональный токен из панели |
| `baseUrl` | `NEOGATE_URL`, затем `https://dash.neogate.systems` | |
| `timeoutMs` | `30000` | на одну попытку |
| `retries` | `2` | дополнительные попытки для **чтений** после сетевой ошибки, 429 или 502-504 с учётом `Retry-After`. Записи не повторяются никогда. |
| `fetch` | глобальный | для тестов и прокси |

## API

```
neogate.me()                                  neogate.summary(days)

neogate.projects.list() / get(id)             neogate.domains.list()
  .create(root)           запись                .settings(id) / .updateSettings(id, patch)   запись
  .connectDomain(id, {name, origin, mode})      .updateOrigin(id, …) / .remove(id)           запись
  .overview(id) .traffic(id, minutes)           .connection(id)
  .codes(id, minutes) .funnel(id)               .overview(id) .traffic(id, minutes) .codes(id, minutes)
  .attacks(id) .blocked(id, limit)              .attacks(id) .attack(id, attackId) .funnel(id)
  .report(id, 1 | 7 | 30)
```

«Запись» требует токен с доступом «чтение и запись».

## Ошибки

Любая ошибка это `NeogateError`.

```ts
try {
  await neogate.domains.updateSettings(4, { rate_limit_per_min: 120 });
} catch (e) {
  if (e instanceof PermissionError) console.error('токен только для чтения?', e.message);
}
```

`AuthenticationError` (401), `PermissionError` (402, 403), `NotFoundError` (404), `ValidationError` (400, 422), `RateLimitError` (429, с `retryAfter`), прочие `ApiError` и `NetworkError` (нет ответа, поле `timedOut`). `message` это собственный текст панели.
