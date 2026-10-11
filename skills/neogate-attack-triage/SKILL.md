---
name: neogate-attack-triage
description: Check whether a Neogate-protected site is under attack or degraded and explain what happened. Use when the user asks "are we under attack", "what was that spike", "why is the site slow", or pastes an attack alert.
---

# Triage an attack

Needs the `neogate` MCP server (read-only is enough). Answer in the user's language, plainly, without jargon dumps.

## Steps

1. `list_projects`. If the user named a site, pick that project; otherwise check all.
2. `project_status` per project. Look at `under_attack`, `blockedPct`, `originUp`, `origin_ms.p95`, `originErrPct`.
3. If an attack is running or recent (`list_attacks`, limit 5), run `get_attack` on the biggest one. Use the `domain_id` from the list.
4. Check the people it may have hurt: `blocked_requests` for the project. Real visitors show up as one or two refused requests from a normal browser agent, an attacker as hundreds from the same networks or fingerprints.
5. `traffic` with `minutes=180` to put the peak in context (was it a spike or a plateau, did it end).

## Say

- **What**: classification, layer, peak rps, how long, whether it is still going.
- **Effect**: share the edge stopped (`mitigation_pct`), whether the origin stayed up, whether real visitors were refused.
- **Who**: top countries and networks, one line. Do not list addresses unless asked.
- **Action**: usually none. The edge already handled it. Only suggest a change when something is clearly off, and name it (a rate limit that is too low for a busy API, an origin that errors on its own).

## Do not

- Change settings without asking. This skill reads.
- Call an attack "stopped" while `ongoing` is true.
- Blame the origin for 5xx before checking `origin_errors` and `originErrPct`: those are the origin's own failures, not the edge's.
