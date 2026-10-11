export { Neogate } from './client.js';
export { DEFAULT_BASE_URL, type ClientOptions } from './http.js';
export {
  NeogateError,
  ApiError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  NetworkError,
} from './errors.js';
export { Projects } from './resources/projects.js';
export { Domains } from './resources/domains.js';
export type * from './types.js';
