import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Factory that creates a guard allowing only the specified roles.
 * Redirects to '/' when the current user's role is not in the allowed list.
 */
export function roleGuardFactory(allowedRoles: string[]): CanActivateFn {
  return (_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const user = authService.currentUserValue;
    if (user && allowedRoles.includes(user.role)) return true;
    inject(Router).navigate(['/']);
    return false;
  };
}
