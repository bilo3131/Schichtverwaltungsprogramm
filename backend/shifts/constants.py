"""
Central configuration constants for the shift management system.

This module contains all magic strings and numbers used throughout the application,
making it easier to maintain and modify business rules.
"""
from typing import List, Tuple


class UserRoles:
    """User role constants for permission checks."""
    
    # Individual roles
    ADMIN = 'admin'
    HR = 'hr'
    DEPARTMENT_MANAGER = 'department_manager'
    TEAM_LEADER = 'team_leader'
    GROUP_LEADER = 'group_leader'
    EMPLOYEE = 'employee'
    
    # Role groups for common permission patterns
    ADMIN_ROLES: List[str] = [ADMIN, HR]
    MANAGER_ROLES: List[str] = [ADMIN, HR, DEPARTMENT_MANAGER]
    SUPERVISOR_ROLES: List[str] = [ADMIN, HR, DEPARTMENT_MANAGER, TEAM_LEADER, GROUP_LEADER]
    NON_EMPLOYEE_ROLES: List[str] = [ADMIN, HR, DEPARTMENT_MANAGER, TEAM_LEADER, GROUP_LEADER]
    
    # Human-readable names for display
    ROLE_DISPLAY_NAMES = {
        ADMIN: 'Administrator',
        HR: 'Personalwesen',
        DEPARTMENT_MANAGER: 'Abteilungsleiter',
        TEAM_LEADER: 'Teamleiter',
        GROUP_LEADER: 'Gruppenleiter',
        EMPLOYEE: 'Mitarbeiter',
    }
    
    @classmethod
    def is_admin_or_hr(cls, role: str) -> bool:
        """Check if role is admin or HR."""
        return role in cls.ADMIN_ROLES
    
    @classmethod
    def is_manager_or_above(cls, role: str) -> bool:
        """Check if role is manager level or above."""
        return role in cls.MANAGER_ROLES
    
    @classmethod
    def is_supervisor_or_above(cls, role: str) -> bool:
        """Check if role is supervisor level or above."""
        return role in cls.SUPERVISOR_ROLES
    
    @classmethod
    def is_non_employee(cls, role: str) -> bool:
        """Check if role is anything other than employee."""
        return role in cls.NON_EMPLOYEE_ROLES


class VacationRequestStatus:
    """Status choices for vacation requests."""
    
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    
    CHOICES: List[Tuple[str, str]] = [
        (PENDING, 'Ausstehend'),
        (APPROVED, 'Genehmigt'),
        (REJECTED, 'Abgelehnt'),
    ]
    
    # For validation
    ALL_STATUSES: List[str] = [PENDING, APPROVED, REJECTED]


class ShiftStatus:
    """Status choices for shifts."""
    
    DRAFT = 'draft'
    PUBLISHED = 'published'
    
    CHOICES: List[Tuple[str, str]] = [
        (DRAFT, 'Entwurf'),
        (PUBLISHED, 'Veröffentlicht'),
    ]
    
    ALL_STATUSES: List[str] = [DRAFT, PUBLISHED]


class ShiftSwapRequestStatus:
    """Status choices for shift swap requests."""
    
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    
    CHOICES: List[Tuple[str, str]] = [
        (PENDING, 'Ausstehend'),
        (APPROVED, 'Genehmigt'),
        (REJECTED, 'Abgelehnt'),
    ]
    
    ALL_STATUSES: List[str] = [PENDING, APPROVED, REJECTED]


class WorkingTimeRules:
    """German working time law (Arbeitszeitgesetz) compliance rules."""
    
    # Rest periods
    MINIMUM_REST_HOURS = 11  # Minimum hours between shifts
    MINIMUM_REST_HOURS_REDUCED = 10  # Reduced rest period (exceptions apply)
    
    # Daily working time
    REGULAR_MAX_DAILY_HOURS = 8  # Regular maximum daily working hours
    EXTENDED_MAX_DAILY_HOURS = 10  # Extended maximum (with compensation)
    
    # Weekly working time
    REGULAR_MAX_WEEKLY_HOURS = 48  # Regular maximum weekly working hours
    
    # Break rules (in minutes)
    BREAK_THRESHOLD_6_HOURS = 360  # 6 hours in minutes
    BREAK_THRESHOLD_9_HOURS = 540  # 9 hours in minutes
    BREAK_MINIMUM_30_MIN = 30  # Minimum 30 minutes break after 6 hours
    BREAK_MINIMUM_45_MIN = 45  # Minimum 45 minutes break after 9 hours
    
    # Night shift rules
    NIGHT_SHIFT_START_HOUR = 23  # 23:00
    NIGHT_SHIFT_END_HOUR = 6    # 06:00
    NIGHT_SHIFT_MAX_HOURS = 8    # Maximum night shift hours
    
    # Sunday and holiday work
    SUNDAY_WORK_MAX_PER_YEAR = 15  # Maximum Sundays worked per year
    
    @classmethod
    def calculate_required_break(cls, working_minutes: int) -> int:
        """
        Calculate required break duration based on working time.
        
        Args:
            working_minutes: Total working time in minutes
            
        Returns:
            Required break duration in minutes
        """
        if working_minutes >= cls.BREAK_THRESHOLD_9_HOURS:
            return cls.BREAK_MINIMUM_45_MIN
        elif working_minutes >= cls.BREAK_THRESHOLD_6_HOURS:
            return cls.BREAK_MINIMUM_30_MIN
        return 0


class SystemDefaults:
    """Default values used throughout the system."""
    
    # Password generation
    DEFAULT_PASSWORD_LENGTH = 8
    
    # Pagination
    DEFAULT_PAGE_SIZE = 50
    MAX_PAGE_SIZE = 200
    
    # Date/Time formats
    DATE_FORMAT = '%Y-%m-%d'
    DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'
    TIME_FORMAT = '%H:%M'
    
    # Week display format
    WEEK_DISPLAY_FORMAT = 'KW {week_number} ({start_date} - {end_date})'
    
    # Shift planning defaults
    DEFAULT_MIN_EMPLOYEES_PER_SHIFT = 1
    DEFAULT_SHIFT_COLOR = '#3498db'
    
    # Notification defaults
    NOTIFICATION_BATCH_SIZE = 100
    EMAIL_RETRY_LIMIT = 3


class NotificationTypes:
    """Types of notifications sent to users."""
    
    # Shift notifications
    SHIFT_PUBLISHED = 'shift_published'
    SHIFT_UPDATED = 'shift_updated'
    SHIFT_DELETED = 'shift_deleted'
    SHIFT_WEEK_PUBLISHED = 'shift_week_published'
    
    # Vacation notifications
    VACATION_APPROVED = 'vacation_approved'
    VACATION_REJECTED = 'vacation_rejected'
    VACATION_REQUESTED = 'vacation_requested'
    
    # Shift swap notifications
    SWAP_REQUESTED = 'swap_requested'
    SWAP_APPROVED = 'swap_approved'
    SWAP_REJECTED = 'swap_rejected'
    
    # Event notifications
    EVENT_CREATED = 'event_created'
    EVENT_UPDATED = 'event_updated'
    EVENT_CANCELLED = 'event_cancelled'
    EVENT_ATTENDED = 'event_attended'
    
    # Human-readable titles
    NOTIFICATION_TITLES = {
        SHIFT_PUBLISHED: 'Schicht veröffentlicht',
        SHIFT_UPDATED: 'Schicht geändert',
        SHIFT_DELETED: 'Schicht gelöscht',
        SHIFT_WEEK_PUBLISHED: 'Wochenplan veröffentlicht',
        VACATION_APPROVED: 'Urlaubsantrag genehmigt',
        VACATION_REJECTED: 'Urlaubsantrag abgelehnt',
        VACATION_REQUESTED: 'Neuer Urlaubsantrag',
        SWAP_REQUESTED: 'Schichttausch angefragt',
        SWAP_APPROVED: 'Schichttausch genehmigt',
        SWAP_REJECTED: 'Schichttausch abgelehnt',
        EVENT_CREATED: 'Neuer Termin',
        EVENT_UPDATED: 'Termin geändert',
        EVENT_CANCELLED: 'Termin abgesagt',
        EVENT_ATTENDED: 'Termin-Teilnahme',
    }


class ValidationMessages:
    """Standard validation and error messages."""
    
    # Permission errors
    PERMISSION_DENIED = 'Sie haben keine Berechtigung für diese Aktion'
    ADMIN_ONLY = 'Nur Administratoren dürfen diese Aktion ausführen'
    ADMIN_HR_ONLY = 'Nur Administratoren und Personalwesen dürfen diese Aktion ausführen'
    NON_EMPLOYEE_ONLY = 'Nur Nutzer mit Führungsrollen dürfen diese Aktion ausführen'
    MANAGER_ONLY = 'Nur Manager und Administratoren dürfen diese Aktion ausführen'
    
    # Organization errors
    NO_ORGANIZATION = 'Sie müssen einer Organisation zugeordnet sein'
    
    # Subscription errors
    SUBSCRIPTION_LIMIT_REACHED = 'Das Limit Ihres Abonnements wurde erreicht'
    SUBSCRIPTION_LIMIT_TEMPLATE = 'Limit erreicht: Sie können maximal {limit} {resource} im {tier}-Plan erstellen. Bitte upgraden Sie Ihr Abonnement.'
    
    # Validation errors
    REQUIRED_FIELD = '{field} ist erforderlich'
    INVALID_DATE_RANGE = 'Ungültiger Datumsbereich'
    INVALID_TIME_RANGE = 'Ungültige Zeitangabe'
    SHIFT_OVERLAP = 'Diese Schicht überschneidet sich mit einer anderen'
    
    # Status errors
    ALREADY_APPROVED = 'Dieser Antrag wurde bereits genehmigt'
    ALREADY_REJECTED = 'Dieser Antrag wurde bereits abgelehnt'
    CANNOT_MODIFY_APPROVED = 'Genehmigte Anträge können nicht mehr geändert werden'
    MUST_BE_PENDING = 'Nur ausstehende Anträge können geändert werden'
    
    # Working time violations
    REST_PERIOD_VIOLATION = 'Ruhezeit zu kurz: {actual}h (mindestens {required}h erforderlich)'
    WEEKLY_HOURS_VIOLATION = 'Wochenstunden überschritten: {actual}h (maximal {max}h erlaubt)'
    DAILY_HOURS_VIOLATION = 'Tagesarbeitszeit überschritten: {actual}h (maximal {max}h erlaubt)'
