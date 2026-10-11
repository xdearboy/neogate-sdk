export type DomainMode = 'browser' | 'api' | 'machine';
export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface Me {
  id: number;
  email: string;
  role: 'admin' | 'client';
  emailVerified: boolean;
}

export interface Domain {
  id: number;
  host: string;
  origin: string;
  mode: DomainMode;
  cert_status: string;
  sync_status: string;
  origin_tls?: boolean;
  origin_sni?: string | null;
  telegram_chat_id?: string;
  telegram_enabled?: boolean;
  project_id?: number | null;
  /** your role in the domain's project */
  my_role?: ProjectRole;
}

/** A registrable root (d3vo.ru) and the domains connected under it. */
export interface Project {
  id: number;
  root: string;
  customer_id: number;
  created_at: string;
  telegram_chat_id?: string | null;
  telegram_enabled?: boolean;
  weekly_report?: boolean;
  my_role?: ProjectRole;
  domains: Domain[];
}

export interface Overview {
  /** requests per second reaching the edge, served plus blocked */
  rps: number;
  blockedRps: number;
  /** share that reached the origin and came back OK; null with no traffic */
  okPct: number | null;
  blockedPct: number;
  /** share the origin itself failed on (5xx) */
  originErrPct: number;
  bandwidthMbps: number;
  originUp: boolean;
  /** origin response time over the last 5 minutes, ms */
  origin_ms?: { p50: number; p95: number; n: number; p95_total?: number; slow_share?: number } | null;
  origin_errors?: { answers: number; errors: number; share: number } | null;
}

export interface ProjectOverview extends Overview {
  /** current load per host, busiest first */
  byHost: { host: string; rps: number; blockedRps: number }[];
}

export interface Point {
  /** unix ms */
  t: number;
  /** total requests per second, passed plus blocked */
  v: number;
  passed?: number;
  blocked?: number;
  unreachable?: number;
}

export interface CodeCount {
  code: string;
  count: number;
}

export interface AttackDetails {
  classification?: string;
  confidence_pct?: number;
  duration?: string;
  total_requests?: number;
  blocked_requests?: number;
  passed_requests?: number;
  unique_ips?: number;
  countries_count?: number;
  asns_count?: number;
  geo_breakdown?: { code?: string; country: string; count: number; pct: number }[];
  networks?: { asn: number; name: string; country: string; count: number; pct: number }[];
  top_ips?: { ip: string; country?: string; asn?: string; count: number; pct?: number }[];
  paths?: { path: string; count: number; pct?: number }[];
  user_agents?: { ua: string; count: number }[];
  status_codes?: { code: string; count: number }[];
  drop_reasons?: { reason: string; count: number }[];
  [key: string]: unknown;
}

export interface Attack {
  id: number;
  signature: string | null;
  layer: string | null;
  severity: string | null;
  started_at: string;
  /** null while it runs */
  ended_at: string | null;
  peak_rps: number | null;
  mitigation_pct: number | null;
  details?: AttackDetails;
  /** set on project-wide lists */
  host?: string;
  domain_id?: number;
}

export interface BlockedRequest {
  ts: string;
  host: string;
  ip: string;
  method: string;
  path: string;
  reason: string;
  status: number;
  ua?: string;
  country?: string;
  asn?: string;
}

export interface BlockedFeed {
  rows: BlockedRequest[];
  reasons: { reason: string; count: number }[];
  /** refused in the last hour */
  total: number;
}

export interface TenantFunnel {
  hours: number;
  since: string;
  passed: number | null;
  blocked_challenge: number;
  blocked_pre: number;
  blockedPct: number | null;
  reasons: { reason: string; count: number }[];
}

export interface ProjectReport {
  days: number;
  attacks: { count: number; peak_rps: number; duration_sec: number; list: Attack[] };
  traffic: {
    total_requests: number;
    blocked_requests: number;
    passed_requests: number;
    unique_ips: number;
    bytes_out: number;
    daily: { day: string; total: number; blocked: number }[];
    reasons: { reason: string; count: number }[];
    top_ips: { ip: string; count: number; asn?: string }[];
  } | null;
}

export interface ConnectionCheck {
  dns: { ok: boolean; ips: string[]; expected: string };
  requests: number;
  last_seen: string | null;
  origin_ok: number;
}

export interface DomainSettings {
  /** per-source-address cap over 60 s at the edge; null = none */
  rate_limit_per_min: number | null;
  scanner_denylist: boolean;
  allowed_ips: string[];
  cache: boolean;
}

export interface DomainSettingsView {
  mode: DomainMode;
  /** only what was set on purpose */
  stored: Partial<DomainSettings>;
  defaults: DomainSettings;
  /** what the edge runs with right now */
  effective: DomainSettings;
  sync_status?: string;
}

/** A key left out is untouched, null resets it to the mode default, rate_limit_per_min 0 turns the cap off. */
export interface DomainSettingsPatch {
  rate_limit_per_min?: number | null;
  scanner_denylist?: boolean | null;
  allowed_ips?: string[] | null;
  cache?: boolean | null;
}

export interface ReportSummary {
  days: number;
  since: string;
  domain_count: number;
  total_attacks: number;
  total_blocked_requests: number;
  peak_rps: number;
  top_signatures: { signature: string; count: number }[];
  per_domain: { host: string; mode: string; attack_count: number; blocked_requests: number }[];
}

export interface ConnectDomainInput {
  /** "" or "@" for the root itself, a label ("api") or a full name under the root */
  name: string;
  /** where the site really lives: a public IP or host, with an optional port */
  origin: string;
  mode: DomainMode;
}

export interface UpdateOriginInput {
  origin: string;
  origin_tls: boolean;
  origin_sni: string | null;
  mode?: DomainMode;
}
