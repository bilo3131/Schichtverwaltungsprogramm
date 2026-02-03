import { environment } from '../../../environments/environment';

export const API_CONFIG = {
  BASE_URL: environment.apiUrl,
  API_VERSION: environment.apiVersion,
  ENDPOINTS: {
    ACCOUNTS: `/api/${environment.apiVersion}/accounts`,
    SHIFTS: `/api/${environment.apiVersion}/shifts`
  }
} as const;

export const getApiUrl = (endpoint: keyof typeof API_CONFIG.ENDPOINTS): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
};
