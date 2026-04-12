import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private darkModeSubject = new BehaviorSubject<boolean>(this.loadThemePreference());
  public darkMode$ = this.darkModeSubject.asObservable();
  private readonly API_BASE_URL = getApiUrl('ACCOUNTS');

  constructor(private http: HttpClient) {
    this.applyTheme(this.darkModeSubject.value);
  }

  /** Returns true if dark mode is currently active. */
  get isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  /** Toggles between dark and light mode and persists the preference to the backend. */
  toggleDarkMode(): void {
    const newValue = !this.darkModeSubject.value;
    this.setTheme(newValue);
    this.saveThemeToBackend(newValue ? 'dark' : 'light').subscribe();
  }

  /** Sets the theme to dark or light, updates the DOM class and localStorage. */
  setTheme(isDark: boolean): void {
    this.darkModeSubject.next(isDark);
    this.applyTheme(isDark);
    if (this.isBrowser) localStorage.setItem('darkMode', String(isDark));
  }

  /** Applies the user's stored theme preference after login. */
  loadUserTheme(theme: 'light' | 'dark' | undefined): void {
    if (theme) this.setTheme(theme === 'dark');
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** Reads the theme preference from localStorage (defaults to light). */
  private loadThemePreference(): boolean {
    return this.isBrowser ? localStorage.getItem('darkMode') === 'true' : false;
  }

  /** Sends the theme preference to the backend user profile. */
  private saveThemeToBackend(theme: 'light' | 'dark'): Observable<any> {
    return this.http.patch(`${this.API_BASE_URL}/users/me/`, { theme_preference: theme });
  }

  /** Adds or removes the `dark-theme` CSS class on `document.body`. */
  private applyTheme(isDark: boolean): void {
    if (!this.isBrowser) return;
    document.body.classList.toggle('dark-theme', isDark);
  }
}
