import { Http, type ClientOptions } from './http.js';
import { Domains } from './resources/domains.js';
import { Projects } from './resources/projects.js';
import type { Me, ReportSummary } from './types.js';

/**
 * ```ts
 * const neogate = new Neogate({ token: process.env.NEOGATE_TOKEN });
 * const [project] = await neogate.projects.list();
 * const now = await neogate.projects.overview(project.id);
 * ```
 */
export class Neogate {
  readonly projects: Projects;
  readonly domains: Domains;
  private readonly http: Http;

  constructor(options: ClientOptions = {}) {
    this.http = new Http(options);
    this.projects = new Projects(this.http);
    this.domains = new Domains(this.http);
  }

  get baseUrl(): string {
    return this.http.baseUrl;
  }

  /** Who the token speaks for. A cheap way to check a token works. */
  me(): Promise<Me> {
    return this.http.get('/api/me');
  }

  /** Attacks and blocked requests across all your domains. */
  summary(days = 30): Promise<ReportSummary> {
    return this.http.get('/api/reports/summary', { query: { days } });
  }
}
