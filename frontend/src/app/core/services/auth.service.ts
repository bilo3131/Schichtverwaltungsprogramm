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
    this.restoreSessionFromStorage();
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  /** Returns the current user value synchronously. */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /** Returns the stored auth token, or null if not in a browser context. */
  get token(): string | null {
    return this.isBrowser ? localStorage.getItem('token') : null;
  }

  /** Returns true if a token and user are present. */
  get isAuthenticated(): boolean {
    return !!this.token && !!this.currentUserValue;
  }

  /** Returns true if the current user has the admin role. */
  get isAdmin(): boolean {
    return this.currentUserValue?.role === 'admin';
  }

  /** Returns true for HR and department manager roles (and admin). */
  get isManager(): boolean {
    return ['hr', 'department_manager'].includes(this.currentUserValue?.role || '') || this.isAdmin;
  }

  /** Returns true for any supervisory role (team/group leader, HR, manager, admin). */
  get isSupervisor(): boolean {
    return ['hr', 'department_manager', 'team_leader', 'group_leader'].includes(
      this.currentUserValue?.role || ''
    ) || this.isAdmin;
  }

  /** Returns true if the current user is NOT a plain employee (i.e. has an elevated role). */
  get isNonEmployee(): boolean {
    const role = this.currentUserValue?.role;
    return role !== 'employee' && !!role;
  }

  /** Returns true if the current session is a demo session. */
  get isDemo(): boolean {
    return this.isBrowser ? localStorage.getItem('is_demo') === 'true' : false;
  }

  // ── Auth Actions ─────────────────────────────────────────────────────────

  /** Authenticates with email + password credentials. */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.ENDPOINTS.login, credentials).pipe(
      tap(response => this.persistAuthData(response))
    );
  }

  /** Authenticates as a demo user by email (no password required). */
  demoLogin(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.ENDPOINTS.demoLogin, { email }).pipe(
      tap(response => {
        this.persistAuthData(response);
        if (this.isBrowser && (response as any).is_demo) {
          localStorage.setItem('is_demo', 'true');
        }
      })
    );
  }

  /** Registers a new user and immediately signs them in. */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.ENDPOINTS.register, userData).pipe(
      tap(response => this.persistAuthData(response))
    );
  }

  /** Logs out the current user and redirects to /login. */
  logout(): Observable<any> {
    return this.http.post(this.ENDPOINTS.logout, {}).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/login']);
      })
    );
  }

  /** Sends a password-change request for the currently authenticated user. */
  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.post(this.ENDPOINTS.changePassword, data);
  }

  /** Fetches fresh user data from the API and updates local state. */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(this.ENDPOINTS.currentUser).pipe(
      tap(user => {
        if (this.isBrowser) localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.applyUserContext(user);
      })
    );
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /** Restores user session from localStorage on service initialisation. */
  private restoreSessionFromStorage(): void {
    if (!this.isBrowser) return;
    const stored = localStorage.getItem('currentUser');
    if (!stored) return;
    const user: User = JSON.parse(stored);
    this.currentUserSubject.next(user);
    this.applyUserContext(user);
  }

  /** Stores auth token + user in localStorage and updates all derived state. */
  private persistAuthData(response: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    }
    this.currentUserSubject.next(response.user);
    this.themeService.loadUserTheme(response.user.theme_preference);
    this.applyUserContext(response.user);
  }

  /** Applies user-specific UI context: department filter. */
  private applyUserContext(user: User): void {
    const department = user.employee_profile?.department ?? 'all';
    this.dashboardFilterService.setDepartmentFilter(department);
  }

  /** Removes all auth data from localStorage and clears the user subject. */
  private clearAuthData(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('is_demo');
    }
    this.currentUserSubject.next(null);
  }
}
