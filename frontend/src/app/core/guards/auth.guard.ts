import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirects unauthenticated users to /login, preserving the intended URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated) return true;
  inject(Router).navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

// ── Role-based guard factory ──────────────────────────────────────────────

/**
 * Creates a guard that checks authentication AND a role-specific predicate.
 * Redirects to '/' if the check fails.
 */
function createRoleGuard(check: (auth: AuthService) => boolean): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    if (auth.isAuthenticated && check(auth)) return true;
    inject(Router).navigate(['/']);
    return false;
  };
}

/** Allows access only to managers (HR, department manager) and admins. */
export const managerGuard = createRoleGuard(auth => auth.isManager);

/** Allows access to any non-employee role (supervisor and above). */
export const nonEmployeeGuard = createRoleGuard(auth => auth.isNonEmployee);

/** Allows access only to admin users. */
export const adminGuard = createRoleGuard(auth => auth.isAdmin);
