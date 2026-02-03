import { Routes } from '@angular/router';
import { authGuard, managerGuard, nonEmployeeGuard } from './core/guards/auth.guard';
import { roleGuardFactory } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'change-password',
    loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard-layout/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      {
        path: 'shifts',
        loadChildren: () => import('./features/shifts/shifts.routes').then(m => m.SHIFTS_ROUTES),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee'])]
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar-main/calendar.component').then(m => m.CalendarComponent),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee'])]
      },
      {
        path: 'employees',
        loadChildren: () => import('./features/employees/employees.routes').then(m => m.EMPLOYEES_ROUTES),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'])]
      },
      {
        path: 'shift-types',
        loadComponent: () => import('./features/shift-types/shift-type-list/shift-type-list.component').then(m => m.ShiftTypeListComponent),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager'])]
      },
      {
        path: 'qualifications',
        loadComponent: () => import('./features/qualifications/qualification-list/qualification-list.component').then(m => m.QualificationListComponent),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'])]
      },
      {
        path: 'departments',
        loadComponent: () => import('./features/departments/department-list/department-list.component').then(m => m.DepartmentListComponent),
        canActivate: [roleGuardFactory(['admin', 'hr'])]
      },
      {
        path: 'vacations',
        loadComponent: () => import('./features/vacations/vacation-list/vacation-list.component').then(m => m.VacationListComponent),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager', 'team_leader', 'group_leader', 'employee'])]
      },
      {
        path: 'absences',
        loadComponent: () => import('./features/absences/absence-list/absence-list.component').then(m => m.AbsenceListComponent),
        canActivate: [roleGuardFactory(['admin', 'hr', 'department_manager', 'team_leader', 'group_leader'])]
      },
      {
        path: 'subscription',
        loadComponent: () => import('./features/subscription/subscription-management.component').then(m => m.SubscriptionManagementComponent),
        canActivate: [roleGuardFactory(['admin', 'hr'])]
      },
      {
        path: 'privacy-policy',
        loadComponent: () => import('./features/legal/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent)
      },
      {
        path: 'imprint',
        loadComponent: () => import('./features/legal/imprint/imprint.component').then(m => m.ImprintComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
