import { HttpParams } from '@angular/common/http';

/**
 * Converts a plain params object into Angular HttpParams.
 * Skips keys whose value is null or undefined.
 * Used across all services that pass query parameters to the API.
 */
export function buildHttpParams(params?: Record<string, any>): HttpParams {
  let httpParams = new HttpParams();
  if (!params) return httpParams;
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      httpParams = httpParams.set(key, value.toString());
    }
  });
  return httpParams;
}
