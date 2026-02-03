import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Feature Guard Factory: Prüft ob ein bestimmtes Feature im aktuellen Subscription Plan verfügbar ist
 * @param requiredFeature Das erforderliche Feature
 * @returns CanActivateFn Guard Function
 */
export const featureGuardFactory = (requiredFeature: string): CanActivateFn => {
  return () => {
    const subscriptionService = inject(SubscriptionService);
    const router = inject(Router);

    if (subscriptionService.hasFeature(requiredFeature)) {
      return true;
    }

    // Benutzer hat keinen Zugriff - leite zur Upgrade-Seite oder Dashboard
    console.warn(`Feature "${requiredFeature}" ist im aktuellen Plan nicht verfügbar`);
    router.navigate(['/dashboard']);
    return false;
  };
};

/**
 * Plan Guard Factory: Prüft ob der aktuelle Plan mindestens dem erforderlichen Plan entspricht
 * @param requiredPlan Der minimal erforderliche Plan ('low', 'mid', 'high')
 * @returns CanActivateFn Guard Function
 */
export const planGuardFactory = (requiredPlan: string): CanActivateFn => {
  return () => {
    const subscriptionService = inject(SubscriptionService);
    const router = inject(Router);

    if (subscriptionService.hasMinimumPlan(requiredPlan)) {
      return true;
    }

    // Benutzer hat keinen Zugriff
    console.warn(`Mindestens "${requiredPlan}" Plan erforderlich`);
    router.navigate(['/dashboard']);
    return false;
  };
};
