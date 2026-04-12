// ── Legacy plan enum (used by feature guard) ──────────────────────────────

export enum SubscriptionPlan {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high'
}

export const PLAN_FEATURES: Record<SubscriptionPlan, Record<string, boolean>> = {
  [SubscriptionPlan.LOW]: {
    dashboard: true,
    schichtplan: true,
    mitarbeiter: true,
    qualifikationen: false,
    urlaubsantraege: false,
    abwesenheiten: false,
    aiSuggestions: false,
    employeeQualifications: false,
  },
  [SubscriptionPlan.MID]: {
    dashboard: true,
    schichtplan: true,
    mitarbeiter: true,
    qualifikationen: false,
    urlaubsantraege: false,
    abwesenheiten: true,
    aiSuggestions: false,
    employeeQualifications: false,
  },
  [SubscriptionPlan.HIGH]: {
    dashboard: true,
    schichtplan: true,
    mitarbeiter: true,
    qualifikationen: true,
    urlaubsantraege: true,
    abwesenheiten: true,
    aiSuggestions: true,
    employeeQualifications: true,
  }
};

/** Plan display info for UI rendering. */
export interface PlanInfo {
  name: string;
  displayName: string;
  description: string;
  features: string[];
}

export const PLAN_INFO: Record<SubscriptionPlan, PlanInfo> = {
  [SubscriptionPlan.LOW]: {
    name: 'low',
    displayName: 'Low Budget - Basis',
    description: 'Grundlegende Schichtplanung ohne erweiterte Features',
    features: [
      'Dashboard',
      'Schichtplanung (Basis)',
      'Mitarbeiterverwaltung (Basis)'
    ]
  },
  [SubscriptionPlan.MID]: {
    name: 'mid',
    displayName: 'Mid Budget - Standard',
    description: 'Erweiterte Funktionen mit Abwesenheitsverwaltung',
    features: [
      'Alle Low Budget Features',
      'Abwesenheitsverwaltung',
      'Erweiterte Schichtplanung'
    ]
  },
  [SubscriptionPlan.HIGH]: {
    name: 'high',
    displayName: 'High Budget - Premium',
    description: 'Vollständige Suite mit KI-Unterstützung',
    features: [
      'Alle Mid Budget Features',
      'Qualifikationsverwaltung',
      'Urlaubsantragssystem',
      'KI-gestützte Mitarbeitervorschläge',
      'Erweiterte Analysen'
    ]
  }
};

// ── API response types (used by SubscriptionService and consumers) ─────────

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

/** Static UI configuration for each billing tier. */
export interface TierInfo {
  name: string;
  maxDepartments: number;
  maxEmployees: number;
  basePrice: number;
  pricePerEmployee: number;
  originalBasePrice?: number;
  originalPricePerEmployee?: number;
  isTrial?: boolean;
  earlyAccessPrice?: number;
  standardPrice?: number;
  features: string[];
}

/** Lookup table for all available billing tiers. */
export const TIER_INFO: Record<'starter' | 'pro' | 'business', TierInfo> = {
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
