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

/**
 * Plan Informationen für UI-Anzeige
 */
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
