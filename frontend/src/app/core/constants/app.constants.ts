/**
 * Central configuration constants for the Angular frontend.
 * Maintains consistency with backend constants and improves maintainability.
 */

/**
 * User role constants matching backend UserRoles
 */
export const UserRoles = {
  ADMIN: 'admin',
  HR: 'hr',
  DEPARTMENT_MANAGER: 'department_manager',
  TEAM_LEADER: 'team_leader',
  GROUP_LEADER: 'group_leader',
  EMPLOYEE: 'employee',

  // Role groups for permission checks
  ADMIN_ROLES: ['admin', 'hr'] as readonly string[],
  MANAGER_ROLES: ['admin', 'hr', 'department_manager'] as readonly string[],
  SUPERVISOR_ROLES: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'] as readonly string[],
  NON_EMPLOYEE_ROLES: ['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'] as readonly string[],

  // Display names
  DISPLAY_NAMES: {
    admin: 'Administrator',
    hr: 'Personalwesen',
    department_manager: 'Abteilungsleiter',
    team_leader: 'Teamleiter',
    group_leader: 'Gruppenleiter',
    employee: 'Mitarbeiter',
  } as const,
} as const;

/**
 * Status constants for vacation requests
 */
export const VacationRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',

  DISPLAY_NAMES: {
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
  } as const,
} as const;

/**
 * Status constants for shifts
 */
export const ShiftStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',

  DISPLAY_NAMES: {
    draft: 'Entwurf',
    published: 'Veröffentlicht',
  } as const,
} as const;

/**
 * Status constants for shift swap requests
 */
export const ShiftSwapRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',

  DISPLAY_NAMES: {
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
  } as const,
} as const;

/**
 * German working time law (Arbeitszeitgesetz) compliance rules
 */
export const WorkingTimeRules = {
  MINIMUM_REST_HOURS: 11,
  MINIMUM_REST_HOURS_REDUCED: 10,
  REGULAR_MAX_DAILY_HOURS: 8,
  EXTENDED_MAX_DAILY_HOURS: 10,
  REGULAR_MAX_WEEKLY_HOURS: 48,
  NIGHT_SHIFT_START_HOUR: 23,
  NIGHT_SHIFT_END_HOUR: 6,
  NIGHT_SHIFT_MAX_HOURS: 8,
} as const;

/**
 * System default values
 */
export const SystemDefaults = {
  DEFAULT_PASSWORD_LENGTH: 8,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  DEFAULT_SHIFT_COLOR: '#3498db',
  DEFAULT_MIN_EMPLOYEES_PER_SHIFT: 1,
} as const;

/**
 * Date and time format constants
 */
export const DateTimeFormats = {
  DATE: 'yyyy-MM-dd',
  DATE_DE: 'dd.MM.yyyy',
  TIME: 'HH:mm',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  DATETIME_DE: 'dd.MM.yyyy HH:mm',
} as const;

/**
 * Notification type constants
 */
export const NotificationTypes = {
  SHIFT_PUBLISHED: 'shift_published',
  SHIFT_UPDATED: 'shift_updated',
  SHIFT_DELETED: 'shift_deleted',
  SHIFT_WEEK_PUBLISHED: 'shift_week_published',
  VACATION_APPROVED: 'vacation_approved',
  VACATION_REJECTED: 'vacation_rejected',
  VACATION_REQUESTED: 'vacation_requested',
  SWAP_REQUESTED: 'swap_requested',
  SWAP_APPROVED: 'swap_approved',
  SWAP_REJECTED: 'swap_rejected',
  EVENT_CREATED: 'event_created',
  EVENT_UPDATED: 'event_updated',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_ATTENDED: 'event_attended',
} as const;

/**
 * Employment type constants
 */
export const EmploymentTypes = {
  FULLTIME: 'fulltime',
  PARTTIME: 'parttime',
  MINIJOB: 'minijob',
  WERKSTUDENT: 'werkstudent',
  APPRENTICE: 'apprentice',

  DISPLAY_NAMES: {
    fulltime: 'Vollzeit',
    parttime: 'Teilzeit',
    minijob: 'Minijob',
    werkstudent: 'Werkstudent',
    apprentice: 'Ausbildung',
  } as const,
} as const;

/**
 * Helper functions for role checks
 */
export class RoleHelper {
  static isAdminOrHr(role: string): boolean {
    return UserRoles.ADMIN_ROLES.includes(role);
  }

  static isManagerOrAbove(role: string): boolean {
    return UserRoles.MANAGER_ROLES.includes(role);
  }

  static isSupervisorOrAbove(role: string): boolean {
    return UserRoles.SUPERVISOR_ROLES.includes(role);
  }

  static isNonEmployee(role: string): boolean {
    return UserRoles.NON_EMPLOYEE_ROLES.includes(role);
  }

  static getRoleDisplayName(role: string): string {
    return UserRoles.DISPLAY_NAMES[role as keyof typeof UserRoles.DISPLAY_NAMES] || role;
  }
}

/**
 * Type definitions for type safety
 */
export type UserRole = typeof UserRoles.ADMIN | typeof UserRoles.HR | typeof UserRoles.DEPARTMENT_MANAGER |
  typeof UserRoles.TEAM_LEADER | typeof UserRoles.GROUP_LEADER | typeof UserRoles.EMPLOYEE;

export type VacationStatus = typeof VacationRequestStatus.PENDING | typeof VacationRequestStatus.APPROVED |
  typeof VacationRequestStatus.REJECTED;

export type ShiftStatusType = typeof ShiftStatus.DRAFT | typeof ShiftStatus.PUBLISHED;

export type EmploymentType = typeof EmploymentTypes.FULLTIME | typeof EmploymentTypes.PARTTIME |
  typeof EmploymentTypes.MINIJOB | typeof EmploymentTypes.WERKSTUDENT |
  typeof EmploymentTypes.APPRENTICE;
