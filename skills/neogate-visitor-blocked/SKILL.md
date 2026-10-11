---
name: neogate-visitor-blocked
description: Find out why one visitor cannot reach a Neogate-protected site (timeouts, "site not available", blocked). Use when a user or customer reports that a site works for others but not for them, and gives an IP or a time.
---

# Why can this visitor not get in

Needs the `neogate` MCP server. Ask for the visitor's public IP and roughly when it happened if the user did not say.

## Steps

1. `list_projects` and pick the project that owns the site.
2. `blocked_requests` with `limit=200`. Look for the IP in `latest`. The `reason` says why the edge refused it.
3. If the IP is absent but the visitor sees timeouts: the edge may have cut the connection before HTTP, which leaves no request line. Say so, and note that Neogate keeps an address-level ban for a while after repeated drops (about 30 minutes) that only operators can lift.
4. `get_protection` for the domain. A tight `rate_limit_per_min` on a busy API or a page with many assets refuses real visitors behind one shared address (offices, mobile carriers).
5. `check_connection` if the whole domain seems unreachable: DNS pointing elsewhere is the common cause.

## Reasons, in plain words

- `challenge_failer`: the browser did not finish the invisible check (blocked JavaScript, a privacy extension, an old browser).
- `global_req_limit`, `aggregate_host_flood`: too many requests from the address or to the host in a short time.
- `xxe_huge_payload`: a request body over the size cap. Uploads larger than the cap are answered with 413.
- `headless_ua`: the agent looks like a script or headless browser.

## Offer, never apply on your own

- Add the visitor's address to `allowed_ips` with `update_protection` (needs the write server and a write token). Read `get_protection` first and show the user the current list.
- Raise the per-address limit when the cause is a shared address.
