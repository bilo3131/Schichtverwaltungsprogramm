import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Public endpoints that do not require an Authorization header. */
const PUBLIC_ENDPOINTS = ['/login/', '/register/'];

/**
 * Attaches the stored auth token to every outgoing request as a
 * `Authorization: Token <token>` header.
 * Skips login and register requests to avoid circular dependencies.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint => req.url.includes(endpoint));
  if (isPublic) return next(req);

  if (!isPlatformBrowser(inject(PLATFORM_ID))) return next(req);

  const token = localStorage.getItem('token');
  if (!token) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Token ${token}` } }));
};
