# @neogate/sdk

TypeScript client for the Neogate panel API. Zero dependencies; Node 20+ and Bun (tested). It uses only `fetch` and `AbortSignal`, so other modern runtimes should work too.

```sh
npm i @neogate/sdk
```

```ts
import { Neogate, PermissionError } from '@neogate/sdk';

const neogate = new Neogate({ token: process.env.NEOGATE_TOKEN }); // ngt_…

const projects = await neogate.projects.list();
const now = await neogate.projects.overview(projects[0].id);
console.log(`${now.rps} rps, ${now.blockedPct}% blocked, origin ${now.originUp ? 'up' : 'down'}`);

// narrow to one domain
const [domain] = projects[0].domains;
const attacks = await neogate.domains.attacks(domain.id);
const detail = await neogate.domains.attack(domain.id, attacks[0].id);
```

## Options

| option | default | |
|---|---|---|
| `token` | `NEOGATE_TOKEN` | personal token from the panel |
| `baseUrl` | `NEOGATE_URL`, then `https://dash.neogate.systems` | |
| `timeoutMs` | `30000` | per attempt |
| `retries` | `2` | extra attempts for **reads** after a network error, 429 or 502-504, honouring `Retry-After`. Writes are never retried. |
| `fetch` | global | for tests and proxies |

## API

```
neogate.me()                                  neogate.summary(days)

neogate.projects.list() / get(id)             neogate.domains.list()
  .create(root)           write                 .settings(id) / .updateSettings(id, patch)   write
  .connectDomain(id, {name, origin, mode})      .updateOrigin(id, …) / .remove(id)           write
  .overview(id) .traffic(id, minutes)           .connection(id)
  .codes(id, minutes) .funnel(id)               .overview(id) .traffic(id, minutes) .codes(id, minutes)
  .attacks(id) .blocked(id, limit)              .attacks(id) .attack(id, attackId) .funnel(id)
  .report(id, 1 | 7 | 30)
```

## Errors

Every failure is a `NeogateError`.

```ts
try {
  await neogate.domains.updateSettings(4, { rate_limit_per_min: 120 });
} catch (e) {
  if (e instanceof PermissionError) console.error('read-only token?', e.message);
}
```

`AuthenticationError` (401), `PermissionError` (402, 403), `NotFoundError` (404), `ValidationError` (400, 422), `RateLimitError` (429, with `retryAfter`), other `ApiError`, and `NetworkError` (no answer, `timedOut`). The `message` is the panel's own text.
