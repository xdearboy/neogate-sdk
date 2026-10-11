---
name: neogate-weekly-review
description: Write a short review of the last week for one or all Neogate projects: attacks, blocked share, origin health, oddities. Use for weekly or monthly reports, "how did we do", or status updates for a team or customer.
---

# Weekly review

Needs the `neogate` MCP server (read-only is enough).

## Steps

1. `list_projects`. One review per project the user named, otherwise all.
2. `report` with `days=7` (or 30 for a monthly one).
3. `traffic` with `minutes=10080` for the shape of the week, and `project_status` for how it looks now.
4. If there were attacks, `get_attack` on the largest.

## Write

A short note a customer could read:

- **Headline**: one sentence, e.g. "3 attacks, biggest 12k rps on Tuesday night, all stopped, no visitors affected".
- **Numbers**: total requests, blocked share, unique addresses, attack count and peak.
- **Attacks**: when, kind, size, stopped share. One line each, at most five.
- **Origin**: any 5xx or slow answers that were the site's own.
- **Next**: at most three concrete suggestions, only where the data shows a reason.

Compare with the previous period when `report` provides it, and say "up" or "down" with the number. No filler, no scores, no emoji. Write in the language the user writes in.
