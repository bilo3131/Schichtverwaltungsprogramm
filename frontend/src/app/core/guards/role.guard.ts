import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export function roleGuardFactory(allowedRoles: string[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.currentUserValue;
    if (user && allowedRoles.includes(user.role)) {
      return true;
    }
    // Optional: Zeige eine Info oder leite auf Startseite
    router.navigate(['/']);
    return false;
  };
}