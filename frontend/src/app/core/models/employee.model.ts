// Department Models
export interface Department {
  id: number;
  organization: number;
  name: string;
  description?: string;
  employee_count?: number;
  created_at: string;
  updated_at: string;
}

// Qualification Models
export interface Qualification {
  id: number;
  organization: number;
  name: string;
  description?: string;
  department?: number | null;
  department_name?: string;
  created_at: string;
}

// Employee Models
export type EmploymentType = 'fulltime' | 'parttime' | 'minijob' | 'werkstudent' | 'apprentice';

export interface Employee {
  id: number;
  user: number;
  user_details?: any;
  full_name: string;
  department?: number | null;
  department_details?: Department;
  employment_type: EmploymentType;
  qualifications: number[];
  qualification_details?: Qualification[];
  min_hours_per_week: number;
  max_hours_per_week: number;
  hire_date: string;
  is_active: boolean;
  overtime_hours?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Availability Models
export type AvailabilityType = 'available' | 'unavailable' | 'preferred';

export interface Availability {
  id: number;
  employee: number;
  employee_name: string;
  weekday?: number;
  weekday_display?: string;
  specific_date?: string;
  start_time: string;
  end_time: string;
  availability_type: AvailabilityType;
  notes?: string;
}

// Vacation Request Models
export type VacationStatus = 'pending' | 'approved' | 'rejected';

export interface VacationRequest {
  id: number;
  employee: number;
  employee_name: string;
  employee_department?: number;
  employee_role?: string;
  start_date: string;
  end_date: string;
  status: VacationStatus;
  status_display: string;
  notes?: string;
  approved_by?: number;
  approved_by_name?: string;
  created_at: string;
  updated_at: string;
}

// Absence Record Models
export type AbsenceType = 'sick' | 'vacation' | 'vacation_wish' | 'kug' | 'other';

export interface AbsenceRecord {
  id: number;
  employee: number;
  employee_name: string;
  employee_department?: number;
  absence_type: AbsenceType;
  absence_type_display: string;
  start_date: string;
  end_date: string;
  notes?: string;
  document?: string;
  created_at: string;
  updated_at: string;
}
