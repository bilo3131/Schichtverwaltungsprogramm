import { environment } from '../../../environments/environment';

/**
 * Central API configuration used by core services.
 *
 * `ENDPOINTS` contains versioned base paths for each domain.
 */
export const API_CONFIG = {
  BASE_URL: environment.apiUrl,
  ENDPOINTS: {
    ACCOUNTS: `/api/${environment.apiVersion}/accounts`,
    SHIFTS: `/api/${environment.apiVersion}/shifts`,
    SUBSCRIPTIONS: `/api/${environment.apiVersion}/subscriptions`
  }
} as const;

type ApiEndpoint = keyof typeof API_CONFIG.ENDPOINTS;

/**
 * Builds the absolute API URL for a configured endpoint key.
 */
export function getApiUrl(endpoint: ApiEndpoint): string {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
}
