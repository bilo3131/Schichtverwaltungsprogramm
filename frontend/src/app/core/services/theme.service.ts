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
  private API_BASE_URL = getApiUrl('ACCOUNTS');

  constructor(private http: HttpClient) {
    this.applyTheme(this.darkModeSubject.value);
  }

  private loadThemePreference(): boolean {
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('darkMode');
      return savedTheme === 'true';
    }
    return false;
  }

  toggleDarkMode(): void {
    const newValue = !this.darkModeSubject.value;
    this.setTheme(newValue);
    this.saveThemeToBackend(newValue ? 'dark' : 'light').subscribe();
  }

  setTheme(isDark: boolean): void {
    this.darkModeSubject.next(isDark);
    this.applyTheme(isDark);
    if (this.isBrowser) {
      localStorage.setItem('darkMode', String(isDark));
    }
  }

  loadUserTheme(theme: 'light' | 'dark' | undefined): void {
    if (theme) {
      const isDark = theme === 'dark';
      this.setTheme(isDark);
    }
  }

  private saveThemeToBackend(theme: 'light' | 'dark'): Observable<any> {
    return this.http.patch(`${this.API_BASE_URL}/users/me/`, { theme_preference: theme });
  }

  private applyTheme(isDark: boolean): void {
    if (this.isBrowser) {
      if (isDark) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }

  get isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}
