import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { PLAN_FEATURES, SubscriptionPlan } from '../models/subscription.model';
import { LoggerService } from '../services/logger.service';

/**
 * Factory that creates a guard protecting routes behind a subscription feature flag.
 * The feature key must exist in PLAN_FEATURES (see subscription.model.ts).
 * Redirects to /dashboard when the current plan does not include the feature.
 *
 * NOTE: Currently unused — wire into routes when feature gating is needed.
 */
export const featureGuardFactory = (requiredFeature: string): CanActivateFn => {
  return () => {
    const subscriptionService = inject(SubscriptionService);
    const limits = subscriptionService.getCurrentLimits();
    const tier = limits?.tier as SubscriptionPlan | undefined;
    const plan = tier ? PLAN_FEATURES[tier as unknown as SubscriptionPlan] : null;
    const hasFeature = plan ? !!plan[requiredFeature] : false;

    if (hasFeature) return true;

    inject(LoggerService).warn(`Feature "${requiredFeature}" is not available in the current plan.`);
    inject(Router).navigate(['/dashboard']);
    return false;
  };
};

/**
 * Factory that creates a guard requiring a minimum subscription tier.
 * Tier order: starter < pro < business.
 * Redirects to /dashboard when the requirement is not met.
 *
 * NOTE: Currently unused — wire into routes when plan gating is needed.
 */
export const planGuardFactory = (minimumTier: 'starter' | 'pro' | 'business'): CanActivateFn => {
  const TIER_ORDER: Record<string, number> = { starter: 0, pro: 1, business: 2 };
  return () => {
    const limits = inject(SubscriptionService).getCurrentLimits();
    const currentTier = limits?.tier ?? 'starter';
    const meetsRequirement = (TIER_ORDER[currentTier] ?? 0) >= (TIER_ORDER[minimumTier] ?? 0);

    if (meetsRequirement) return true;

    inject(LoggerService).warn(`Tier "${minimumTier}" or higher is required.`);
    inject(Router).navigate(['/dashboard']);
    return false;
  };
};
