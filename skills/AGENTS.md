# Neogate playbooks

For any agent with the `neogate` MCP server connected (`neogate-mcp`). Paste into a project's `AGENTS.md`, Cursor rules, a Codex prompt or an Antigravity rule. The same four workflows are Claude Code skills in the folders next to this file.

General rules: answer in the user's language, plainly. Read before you change anything, say what you will change before you change it, and never change settings the user did not ask about. Start with `list_projects`: every other tool takes an id from it.

## Triage an attack ("are we under attack", "what was that spike")

1. `account_summary` for the overall picture, `list_projects`, then `project_status` per project: `under_attack`, `blockedPct`, `originUp`, `origin_ms.p95`, `originErrPct`.
2. If an attack is running or recent: `list_attacks` (limit 5), then `get_attack` on the biggest, using its `domain_id`.
3. `blocked_requests` to see whether real visitors were refused: a normal browser agent with one or two refusals is a visitor, hundreds from the same networks is the attacker.
4. `traffic` with `minutes=180` for the shape: spike, plateau, ended.

Report: what (kind, layer, peak, duration, still going or not), effect (share stopped, origin up, visitors affected), who (top countries and networks, one line), action (usually none). Never call an attack finished while `ongoing` is true. 5xx from the origin are the site's own failures, check `originErrPct` before blaming the edge.

## A visitor cannot get in

Ask for the visitor's public IP and the time.

1. `blocked_requests` with `limit=200`, find the IP; `reason` says why.
2. Not there but the visitor sees timeouts: the edge may have cut the connection before HTTP, which leaves no request line. Repeated drops can also earn an address-level ban of about 30 minutes that only operators lift. Say so.
3. `get_protection`: a tight `rate_limit_per_min` refuses real visitors behind one shared address (offices, mobile carriers).
4. `check_connection` if the whole domain seems unreachable: DNS pointing elsewhere is the usual cause.

Reasons: `challenge_failer` = the browser did not finish the invisible check (blocked JavaScript, privacy extension, old browser); `global_req_limit` and `aggregate_host_flood` = too many requests in a short time; `xxe_huge_payload` = body over the size cap (answered 413); `headless_ua` = looks like a script.

Offer, do not apply: add the address to `allowed_ips`, or raise the per-address limit, with `update_protection` (needs `--allow-write` and a write token). Show the current value first.

## Connect a domain

Needs `--allow-write` and a write token. Collect the domain, the origin (a public IP or host, optional port; private addresses cannot be reached) and the mode: `browser` for sites people open (adds the invisible challenge), `api` for JSON APIs and apps, `machine` for webhooks and service to service.

1. `list_projects`; the project root is the registrable domain. `create_project` if there is none.
2. `connect_domain` (`name` is `@` for the root, a label, or the full name).
3. Tell the user which DNS record to set, pointing at the Neogate edge address from the panel's connect screen. Never invent an address.
4. After they confirm DNS, `check_connection`: `dns.ok`, `requests > 0`, `origin_ok > 0`. Retry a few times a minute apart. If the origin does not answer, it is the origin's side (firewall, port, TLS).

A 403 with a plan message means upgrade, not retry. There is no delete tool: removing a domain is done in the panel after DNS is pointed back.

## Weekly review

1. `list_projects`, then `report` with `days=7` (30 for monthly), `traffic` with `minutes=10080`, `project_status`. `get_attack` on the largest attack if any.
2. Write a note a customer could read: a one-sentence headline; numbers (requests, blocked share, unique addresses, attacks and peak); attacks one line each, at most five; origin problems that were the site's own; at most three suggestions, only where the data shows a reason. Compare with the previous period when given. No filler, no emoji.
