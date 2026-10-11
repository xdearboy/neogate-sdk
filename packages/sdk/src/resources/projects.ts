import type { Http } from '../http.js';
import type {
  Attack,
  BlockedFeed,
  CodeCount,
  ConnectDomainInput,
  Domain,
  Point,
  Project,
  ProjectOverview,
  ProjectReport,
  TenantFunnel,
} from '../types.js';

/** A project is a root domain (d3vo.ru) with the domains connected under it. */
export class Projects {
  constructor(private readonly http: Http) {}

  list(): Promise<Project[]> {
    return this.http.get('/api/projects');
  }

  get(projectId: number): Promise<Project> {
    return this.http.get(`/api/projects/${projectId}`);
  }

  /** A subdomain is reduced to its root: "api.d3vo.ru" makes the project "d3vo.ru". Needs a write token. */
  create(root: string): Promise<Project> {
    return this.http.post('/api/projects', { root });
  }

  /** Connect the root or a subdomain. The plan's domain limit applies. Needs a write token. */
  connectDomain(projectId: number, input: ConnectDomainInput): Promise<Domain> {
    return this.http.post(`/api/projects/${projectId}/domains`, input);
  }

  /** Current load, response codes and origin health of the whole project. */
  overview(projectId: number): Promise<ProjectOverview> {
    return this.http.get(`/api/projects/${projectId}/overview`);
  }

  /** Requests per second over the last `minutes` (default 360). */
  traffic(projectId: number, minutes = 360): Promise<Point[]> {
    return this.http.get(`/api/projects/${projectId}/rps`, { query: { minutes } });
  }

  codes(projectId: number, minutes = 360): Promise<CodeCount[]> {
    return this.http.get(`/api/projects/${projectId}/codes`, { query: { minutes } });
  }

  attacks(projectId: number): Promise<Attack[]> {
    return this.http.get(`/api/projects/${projectId}/attacks`);
  }

  /** What the edge let through and turned away over the last day. */
  funnel(projectId: number): Promise<TenantFunnel> {
    return this.http.get(`/api/projects/${projectId}/funnel`);
  }

  /** The latest refused requests; `limit` up to what the panel allows. */
  blocked(projectId: number, limit = 100): Promise<BlockedFeed> {
    return this.http.get(`/api/projects/${projectId}/blocked`, { query: { limit } });
  }

  /** Attacks and traffic over 1, 7 or 30 days. */
  report(projectId: number, days: 1 | 7 | 30 = 7): Promise<ProjectReport> {
    return this.http.get(`/api/projects/${projectId}/report`, { query: { days } });
  }
}
