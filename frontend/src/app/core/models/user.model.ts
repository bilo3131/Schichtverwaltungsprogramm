// Organization Models
export interface Organization {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  subscription_plan: 'low' | 'mid' | 'high';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User Models
export type UserRole = 'admin' | 'hr' | 'department_manager' | 'team_leader' | 'group_leader' | 'employee';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  employee_id?: string;
  employee_profile?: { id: number; department?: number | null };
  organization: number;
  organization_name: string;
  subscription_plan: 'low' | 'mid' | 'high';
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  theme_preference?: 'light' | 'dark';
  tutorial_completed?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone?: string;
  organization: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password2: string;
}
