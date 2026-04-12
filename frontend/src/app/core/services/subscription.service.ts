import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getApiUrl } from '../config/api.config';
import {
  Subscription,
  SubscriptionLimits,
  TierInfo,
  TIER_INFO
} from '../models/subscription.model';

// Re-export API types so existing consumers keep working without import changes.
export type { EarlyAccessSavings, EarlyAccessInfo, SubscriptionLimits, Subscription } from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiUrl = `${getApiUrl('SUBSCRIPTIONS')}`;
  private currentSubscription$ = new BehaviorSubject<Subscription | null>(null);
  private limits$ = new BehaviorSubject<SubscriptionLimits | null>(null);

  constructor(private http: HttpClient) {
    this.loadSubscription();
  }

  /** Returns an observable of the current subscription. */
  getCurrentSubscription(): Observable<Subscription | null> {
    return this.currentSubscription$.asObservable();
  }

  /** Returns an observable of the current subscription limits. */
  getLimits(): Observable<SubscriptionLimits | null> {
    return this.limits$.asObservable();
  }

  /** Loads the organisation's subscription from the API and caches it. */
  loadSubscription(): void {
    this.http.get<Subscription>(`${this.apiUrl}/my_subscription/`).subscribe({
      next: subscription => this.cacheSubscription(subscription),
      error: () => {
        this.currentSubscription$.next(null);
        this.limits$.next(null);
      }
    });
  }

  /** Fetches current limits from the API and updates the cache. */
  checkLimits(): Observable<SubscriptionLimits> {
    return this.http.get<SubscriptionLimits>(`${this.apiUrl}/check_limits/`).pipe(
      tap(limits => this.limits$.next(limits))
    );
  }

  /** Returns true if the subscription allows adding another employee. */
  canAddEmployee(): boolean {
    return this.limits$.value?.employees.can_add ?? false;
  }

  /** Returns true if the subscription allows adding another department. */
  canAddDepartment(): boolean {
    return this.limits$.value?.departments.can_add ?? false;
  }

  /** Returns the current limits synchronously (may be null if not yet loaded). */
  getCurrentLimits(): SubscriptionLimits | null {
    return this.limits$.value;
  }

  /** Creates a Stripe checkout session for the given tier and returns its URL. */
  createCheckoutSession(tier: string): Observable<{ checkout_url: string }> {
    return this.http.post<{ checkout_url: string }>(
      `${this.apiUrl}/create-checkout-session/`,
      { tier }
    );
  }

  /** Verifies a completed Stripe checkout and returns the updated subscription details. */
  verifyCheckoutSuccess(
    sessionId: string
  ): Observable<{ message: string; tier: string; subscription_end_date: string }> {
    return this.http.get<{ message: string; tier: string; subscription_end_date: string }>(
      `${this.apiUrl}/checkout-success/?session_id=${sessionId}`
    );
  }

  /** Upgrades the subscription to a new tier and refreshes the local cache. */
  upgrade(subscriptionId: number, newTier: string): Observable<Subscription> {
    return this.http.post<Subscription>(
      `${this.apiUrl}/${subscriptionId}/upgrade/`,
      { tier: newTier }
    ).pipe(
      tap(subscription => this.cacheSubscription(subscription))
    );
  }

  /** Returns static display information for a given billing tier. */
  getTierInfo(tier: 'starter' | 'pro' | 'business'): TierInfo {
    return TIER_INFO[tier];
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /** Stores a loaded subscription and its limits in the local BehaviorSubjects. */
  private cacheSubscription(subscription: Subscription): void {
    this.currentSubscription$.next(subscription);
    this.limits$.next(subscription.limits_info);
  }
}
