---
name: neogate-connect-domain
description: Put a domain behind Neogate protection end to end: project, domain, mode, DNS record, verification. Use when the user wants to connect, add or protect a domain or subdomain.
---

# Connect a domain

Needs the `neogate` MCP server started with `--allow-write` and a token with "read and write" access.

## Collect first

- The domain (`api.example.com`) and where the site really lives (the **origin**: a public IP or host, optional port). Neogate cannot reach private addresses.
- What the site is, to pick the mode. Ask if unclear:
  - `browser`: a site people open in a browser. Adds the invisible challenge.
  - `api`: JSON API or an app that talks to its own backend. No browser challenge.
  - `machine`: webhooks, service to service. Strictest on rate, no challenge.

## Steps

1. `list_projects`. The project root is the registrable domain (`example.com` for `api.example.com`). If there is none, `create_project` with the root.
2. `connect_domain` with `name` as `@` for the root, a label (`api`), or the full name.
3. Tell the user exactly which DNS record to set: the domain pointing at the Neogate edge address shown in the panel's connect screen. Do not invent an address.
4. After the user confirms DNS is changed, `check_connection`. `dns.ok` means DNS points at the edge, `requests > 0` that traffic arrived, `origin_ok > 0` that the origin answered. Retry a few times a minute apart; DNS can take minutes.
5. Report the result in one line per check. If the origin does not answer, say it is the origin's side (firewall, wrong port, TLS) before suggesting anything else.

## Careful

- The plan limits the number of domains; a 403 with a plan message means upgrade, not retry.
- There is no delete tool on purpose. Removing a domain is done in the panel, after DNS is pointed back.
