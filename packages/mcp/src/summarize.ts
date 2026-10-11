import type { Attack, AttackDetails, CodeCount, Point } from '@neogate/sdk';

const top = <T>(list: T[] | undefined, n = 5): T[] => (list ?? []).slice(0, n);

export interface TrafficSummary {
  minutes: number;

  peak: { rps: number; at: string } | null;
  avg_rps: number;
  last_rps: number;
  blocked_share_pct: number | null;

  series: { at: string; rps: number; blocked_rps: number }[];
  codes: CodeCount[];
}

export function summarizeTraffic(points: Point[], codes: CodeCount[], minutes: number, buckets = 24): TrafficSummary {
  if (points.length === 0) {
    return { minutes, peak: null, avg_rps: 0, last_rps: 0, blocked_share_pct: null, series: [], codes: top(codes, 8) };
  }
  let peak = points[0]!;
  let sum = 0;
  let blocked = 0;
  for (const p of points) {
    if (p.v > peak.v) peak = p;
    sum += p.v;
    blocked += p.blocked ?? 0;
  }
  const size = Math.max(1, Math.ceil(points.length / buckets));
  const series: TrafficSummary['series'] = [];
  for (let i = 0; i < points.length; i += size) {
    const chunk = points.slice(i, i + size);
    const rps = chunk.reduce((a, p) => a + p.v, 0) / chunk.length;
    const b = chunk.reduce((a, p) => a + (p.blocked ?? 0), 0) / chunk.length;
    series.push({ at: new Date(chunk[0]!.t).toISOString(), rps: round(rps), blocked_rps: round(b) });
  }
  return {
    minutes,
    peak: { rps: round(peak.v), at: new Date(peak.t).toISOString() },
    avg_rps: round(sum / points.length),
    last_rps: round(points[points.length - 1]!.v),
    blocked_share_pct: sum > 0 ? round((blocked / sum) * 100) : null,
    series,
    codes: top(codes, 8),
  };
}

export interface AttackSummary {
  id: number;
  host?: string;
  domain_id?: number;
  signature: string | null;
  layer: string | null;
  severity: string | null;
  started_at: string;

  ended_at: string | null;
  ongoing: boolean;
  peak_rps: number | null;
  mitigation_pct: number | null;
}

export function summarizeAttack(a: Attack): AttackSummary {
  return {
    id: a.id,
    ...(a.host ? { host: a.host } : {}),
    ...(a.domain_id != null ? { domain_id: a.domain_id } : {}),
    signature: a.signature,
    layer: a.layer,
    severity: a.severity,
    started_at: a.started_at,
    ended_at: a.ended_at,
    ongoing: a.ended_at === null,
    peak_rps: a.peak_rps,
    mitigation_pct: a.mitigation_pct,
  };
}

export function explainAttack(a: Attack) {
  const d: AttackDetails = a.details ?? {};
  return {
    ...summarizeAttack(a),
    classification: d.classification ?? null,
    confidence_pct: d.confidence_pct ?? null,
    duration: d.duration ?? null,
    requests: { total: d.total_requests ?? null, blocked: d.blocked_requests ?? null, passed: d.passed_requests ?? null },
    unique_ips: d.unique_ips ?? null,
    countries: top(d.geo_breakdown).map((c) => ({ country: c.country, pct: c.pct })),
    networks: top(d.networks).map((n) => ({ asn: n.asn, name: n.name, pct: n.pct })),
    top_ips: top(d.top_ips).map((i) => ({ ip: i.ip, requests: i.count, asn: i.asn })),
    paths: top(d.paths).map((p) => ({ path: p.path, requests: p.count })),
    user_agents: top(d.user_agents, 3).map((u) => ({ ua: u.ua.slice(0, 120), requests: u.count })),
    drop_reasons: top(d.drop_reasons, 6),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
