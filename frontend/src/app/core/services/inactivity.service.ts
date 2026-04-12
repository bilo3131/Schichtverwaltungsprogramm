import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'] as const;

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  private readonly INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes
  private readonly WARNING_MS = 14 * 60 * 1000;    // warn after 14 minutes

  private inactivityTimer: any;
  private warningTimer: any;
  private isBrowser: boolean;
  private isMonitoring = false;
  private warningShown = false;
  private warningSnackBarRef: MatSnackBarRef<TextOnlySnackBar> | null = null;

  // Stored bound reference so addEventListener and removeEventListener use the same function object.
  private readonly boundActivityHandler = this.onUserActivity.bind(this);

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /** Starts monitoring user activity. No-op if already monitoring or not in a browser. */
  startMonitoring(): void {
    if (!this.isBrowser || this.isMonitoring) return;
    this.isMonitoring = true;
    this.setupEventListeners();
    this.resetTimers();
  }

  /** Stops monitoring and clears all timers. */
  stopMonitoring(): void {
    if (!this.isBrowser) return;
    this.isMonitoring = false;
    this.clearTimers();
    this.removeEventListeners();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** Attaches DOM event listeners that count as user activity. */
  private setupEventListeners(): void {
    ACTIVITY_EVENTS.forEach(event =>
      document.addEventListener(event, this.boundActivityHandler, true)
    );
  }

  /** Removes all previously attached activity listeners. */
  private removeEventListeners(): void {
    ACTIVITY_EVENTS.forEach(event =>
      document.removeEventListener(event, this.boundActivityHandler, true)
    );
  }

  /** Resets both timers on every user activity event. */
  private onUserActivity(): void {
    if (!this.isMonitoring) return;
    if (this.warningShown && this.warningSnackBarRef) {
      this.warningSnackBarRef.dismiss();
      this.warningSnackBarRef = null;
    }
    this.warningShown = false;
    this.resetTimers();
  }

  /** Clears existing timers and starts fresh countdown timers. */
  private resetTimers(): void {
    this.clearTimers();
    this.warningTimer = setTimeout(() => this.showWarning(), this.WARNING_MS);
    this.inactivityTimer = setTimeout(() => this.logout(), this.INACTIVITY_MS);
  }

  /** Cancels both running timers. */
  private clearTimers(): void {
    clearTimeout(this.inactivityTimer);
    clearTimeout(this.warningTimer);
    this.inactivityTimer = null;
    this.warningTimer = null;
  }

  /** Shows a snackbar warning one minute before automatic logout. */
  private showWarning(): void {
    if (this.warningShown) return;
    this.warningShown = true;
    this.warningSnackBarRef = this.snackBar.open(
      'Sie werden in 1 Minute aufgrund von Inaktivität automatisch abgemeldet.',
      'Aktivität fortsetzen',
      { duration: 55_000, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['warning-snackbar'] }
    );
    this.warningSnackBarRef.onAction().subscribe(() => this.onUserActivity());
  }

  /** Performs automatic logout after the inactivity timeout expires. */
  private logout(): void {
    if (!this.isMonitoring) return;
    this.stopMonitoring();
    this.snackBar.open(
      'Sie wurden aufgrund von Inaktivität automatisch abgemeldet.',
      'OK',
      { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' }
    );
    this.authService.logout().subscribe();
  }
}
