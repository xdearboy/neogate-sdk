import type { Http } from '../http.js';
import type {
  Attack,
  CodeCount,
  ConnectionCheck,
  Domain,
  DomainSettingsPatch,
  DomainSettingsView,
  Overview,
  Point,
  TenantFunnel,
  UpdateOriginInput,
} from '../types.js';

/** One connected domain: its protection settings and its own traffic. */
export class Domains {
  constructor(private readonly http: Http) {}

  /** Every domain you can see, across projects. */
  list(): Promise<Domain[]> {
    return this.http.get('/api/domains');
  }

  /** Protection settings: what is stored, the mode's defaults, and what the edge runs now. */
  settings(domainId: number): Promise<DomainSettingsView> {
    return this.http.get(`/api/domains/${domainId}/settings`);
  }

  /** Needs a write token. Returns the new view; the edge picks it up within seconds. */
  updateSettings(domainId: number, patch: DomainSettingsPatch): Promise<DomainSettingsView> {
    return this.http.put(`/api/domains/${domainId}/settings`, patch);
  }

  /** Needs a write token. */
  updateOrigin(domainId: number, input: UpdateOriginInput): Promise<Domain> {
    return this.http.patch(`/api/domains/${domainId}`, input);
  }

  /** Needs a write token. Takes the domain off the protection; point its DNS back first. */
  remove(domainId: number): Promise<{ ok: true }> {
    return this.http.delete(`/api/domains/${domainId}`);
  }

  /** DNS, first request and an answering origin for a freshly connected domain. */
  connection(domainId: number): Promise<ConnectionCheck> {
    return this.http.get(`/api/stats/${domainId}/connection`);
  }

  overview(domainId: number): Promise<Overview> {
    return this.http.get(`/api/stats/${domainId}/overview`);
  }

  traffic(domainId: number, minutes = 360): Promise<Point[]> {
    return this.http.get(`/api/stats/${domainId}/rps`, { query: { minutes } });
  }

  codes(domainId: number, minutes = 360): Promise<CodeCount[]> {
    return this.http.get(`/api/stats/${domainId}/codes`, { query: { minutes } });
  }

  attacks(domainId: number): Promise<Attack[]> {
    return this.http.get(`/api/stats/${domainId}/attacks`);
  }

  /** One attack with its full breakdown: sources, paths, agents, drop reasons. */
  attack(domainId: number, attackId: number | string): Promise<Attack> {
    return this.http.get(`/api/stats/${domainId}/attacks/${attackId}`);
  }

  funnel(domainId: number): Promise<TenantFunnel> {
    return this.http.get(`/api/stats/${domainId}/funnel`);
  }
}
