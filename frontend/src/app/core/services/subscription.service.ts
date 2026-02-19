import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface EarlyAccessSavings {
  is_early_access_customer: boolean;
  savings_per_employee: number;
  standard_price_per_employee: number;
  monthly_savings: number;
  message: string;
}

export interface EarlyAccessInfo {
  is_active: boolean;
  start_date: string;
  end_date: string;
  max_customers: number;
  current_customers: number;
  remaining_slots: number;
  days_remaining: number;
  duration_months: number;
}

export interface SubscriptionLimits {
  tier: 'starter' | 'pro' | 'business';
  tier_display: string;
  departments: {
    current: number;
    max: number;
    unlimited: boolean;
    can_add: boolean;
  };
  employees: {
    current: number;
    max: number;
    unlimited: boolean;
    can_add: boolean;
  };
  pricing: {
    base_price: number;
    price_per_employee: number;
    monthly_cost: number;
    original_base_price?: number;
    original_price_per_employee?: number;
    is_trial?: boolean;
  };
  status: {
    is_active: boolean;
    trial_end_date: string | null;
    subscription_end_date: string | null;
  };
  early_access_savings?: EarlyAccessSavings;
  early_access_info?: EarlyAccessInfo;
  pricing_type?: string;
}

export interface Subscription {
  id: number;
  company_name: string;
  tier: 'starter' | 'pro' | 'business';
  tier_display: string;
  max_departments: number;
  max_employees: number;
  base_price: number;
  price_per_employee: number;
  is_active: boolean;
  is_early_access?: boolean;
  pricing_type?: string;
  trial_end_date: string | null;
  subscription_start_date: string;
  subscription_end_date: string | null;
  current_employee_count: number;
  current_department_count: number;
  can_add_employee: boolean;
  can_add_department: boolean;
  monthly_cost: number;
  limits_info: SubscriptionLimits;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${environment.apiUrl}/api/v1/subscriptions`;
  private currentSubscription$ = new BehaviorSubject<Subscription | null>(null);
  private limits$ = new BehaviorSubject<SubscriptionLimits | null>(null);

  constructor(private http: HttpClient) {
    this.loadSubscription();
  }

  getCurrentSubscription(): Observable<Subscription | null> {
    return this.currentSubscription$.asObservable();
  }

  getLimits(): Observable<SubscriptionLimits | null> {
    return this.limits$.asObservable();
  }

  loadSubscription(): void {
    this.http.get<Subscription>(`${this.apiUrl}/my_subscription/`).subscribe({
      next: (subscription) => {
        this.currentSubscription$.next(subscription);
        this.limits$.next(subscription.limits_info);
      },
      error: () => {
        this.currentSubscription$.next(null);
        this.limits$.next(null);
      }
    });
  }

  checkLimits(): Observable<SubscriptionLimits> {
    return this.http.get<SubscriptionLimits>(`${this.apiUrl}/check_limits/`).pipe(
      tap(limits => this.limits$.next(limits))
    );
  }

  canAddEmployee(): boolean {
    const limits = this.limits$.value;
    return limits?.employees.can_add ?? false;
  }

  canAddDepartment(): boolean {
    const limits = this.limits$.value;
    return limits?.departments.can_add ?? false;
  }

  getCurrentLimits(): SubscriptionLimits | null {
    return this.limits$.value;
  }

  createCheckoutSession(tier: string): Observable<{ checkout_url: string }> {
    return this.http.post<{ checkout_url: string }>(
      `${this.apiUrl}/create-checkout-session/`,
      { tier }
    );
  }

  verifyCheckoutSuccess(sessionId: string): Observable<{ message: string; tier: string; subscription_end_date: string }> {
    return this.http.get<{ message: string; tier: string; subscription_end_date: string }>(
      `${this.apiUrl}/checkout-success/?session_id=${sessionId}`
    );
  }

  upgrade(subscriptionId: number, newTier: string): Observable<Subscription> {
    return this.http.post<Subscription>(
      `${this.apiUrl}/${subscriptionId}/upgrade/`,
      { tier: newTier }
    ).pipe(
      tap(subscription => {
        this.currentSubscription$.next(subscription);
        this.limits$.next(subscription.limits_info);
      })
    );
  }

  getTierInfo(tier: 'starter' | 'pro' | 'business') {
    const tierInfo = {
      starter: {
        name: 'Starter',
        maxDepartments: 1,
        maxEmployees: 20,
        basePrice: 0,
        pricePerEmployee: 0,
        originalBasePrice: 29,
        originalPricePerEmployee: 2.00,
        isTrial: true,
        features: [
          '1 Abteilung',
          'Bis zu 20 Mitarbeiter',
          'Schichtplanung',
          'Urlaubsverwaltung',
          'Basis-Support'
        ]
      },
      pro: {
        name: 'Pro',
        maxDepartments: 10,
        maxEmployees: 150,
        basePrice: 59,
        pricePerEmployee: 1.00,
        earlyAccessPrice: 1.00,
        standardPrice: 1.50,
        features: [
          'Bis zu 10 Abteilungen',
          'Bis zu 150 Mitarbeiter',
          'Erweiterte Schichtplanung',
          'Urlaubsverwaltung',
          'Abwesenheitsmanagement',
          'Qualifikationsverwaltung',
          'Priority-Support'
        ]
      },
      business: {
        name: 'Business',
        maxDepartments: -1,
        maxEmployees: -1,
        basePrice: 99,
        pricePerEmployee: 0.80,
        earlyAccessPrice: 0.80,
        standardPrice: 1.00,
        features: [
          'Unbegrenzte Abteilungen',
          'Unbegrenzte Mitarbeiter',
          'Alle Features',
          'API-Zugang',
          'Dedizierter Account Manager',
          '24/7 Premium-Support',
          'Custom Integrationen'
        ]
      }
    };
    return tierInfo[tier];
  }
}
