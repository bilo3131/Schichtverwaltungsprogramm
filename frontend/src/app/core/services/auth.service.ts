import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginRequest, RegisterRequest, AuthResponse, ChangePasswordRequest } from '../models';
import { DashboardFilterService } from './dashboard-filter.service';
import { ThemeService } from './theme.service';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = getApiUrl('ACCOUNTS');
  private readonly ENDPOINTS = {
    login: `${this.API_BASE_URL}/login/`,
    logout: `${this.API_BASE_URL}/logout/`,
    register: `${this.API_BASE_URL}/register/`,
    demoLogin: `${this.API_BASE_URL}/demo-login/`,
    changePassword: `${this.API_BASE_URL}/users/change_password/`,
    currentUser: `${this.API_BASE_URL}/users/me/`
  } as const;
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor(
    private http: HttpClient,
    private router: Router,
    private dashboardFilterService: DashboardFilterService,
    private themeService: ThemeService
  ) {
    // Load user from localStorage on init (only in browser)
    if (this.isBrowser) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        // Setze Abteilungsfilter auch beim Initialisieren
        if (user.employee_profile?.department) {
          this.dashboardFilterService.setDepartmentFilter(user.employee_profile.department);
        }
      }
    }
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentUserValue;
  }

  get isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin';
  }

  get isManager(): boolean {
    return ['hr', 'department_manager'].includes(this.currentUserValue?.role || '') || this.isAdmin;
  }

  get isSupervisor(): boolean {
    return ['hr', 'department_manager', 'team_leader', 'group_leader'].includes(this.currentUserValue?.role || '') || this.isAdmin;
  }

  get isNonEmployee(): boolean {
    const role = this.currentUserValue?.role;
    return role !== 'employee' && !!role;
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.ENDPOINTS.login, credentials).pipe(
      tap(response => {
        if (this.isBrowser) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        }
        this.currentUserSubject.next(response.user);
        
        // Lade User Theme Präferenz
        this.themeService.loadUserTheme(response.user.theme_preference);
        
        this.setDepartmentFilter(response.user);
      })
    );
  }

  demoLogin(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.ENDPOINTS.demoLogin, { email }).pipe(
      tap(response => {
        if (this.isBrowser) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          if ((response as any).is_demo) {
            localStorage.setItem('is_demo', 'true');
          }
        }
        this.currentUserSubject.next(response.user);
        this.themeService.loadUserTheme(response.user.theme_preference);
        this.setDepartmentFilter(response.user);
      })
    );
  }

  get isDemo(): boolean {
    return this.isBrowser ? localStorage.getItem('is_demo') === 'true' : false;
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.ENDPOINTS.register, userData).pipe(
      tap(response => {
        if (this.isBrowser) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
        }
        this.currentUserSubject.next(response.user);        
        this.setDepartmentFilter(response.user);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(this.ENDPOINTS.logout, {}).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/login']);
      })
    );
  }

  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.post(this.ENDPOINTS.changePassword, data);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(this.ENDPOINTS.currentUser).pipe(
      tap(user => {
        if (this.isBrowser) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
        this.currentUserSubject.next(user);
        this.setDepartmentFilter(user);
      })
    );
  }

  private setDepartmentFilter(user: User): void {
    if (user.employee_profile?.department) {
      this.dashboardFilterService.setDepartmentFilter(user.employee_profile.department);
    } else {
      this.dashboardFilterService.setDepartmentFilter('all');
    }
  }

  private clearAuthData(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('is_demo');
    }
    this.currentUserSubject.next(null);
  }
}
