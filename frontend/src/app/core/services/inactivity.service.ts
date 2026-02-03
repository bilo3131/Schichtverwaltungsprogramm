import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  
  private readonly INACTIVITY_TIME = 15 * 60 * 1000; // 15 Minuten in Millisekunden
  private readonly WARNING_TIME = 14 * 60 * 1000; // Warnung nach 14 Minuten
  
  private inactivityTimer: any;
  private warningTimer: any;
  private isBrowser: boolean;
  private isMonitoring = false;
  private warningShown = false;
  private warningSnackBarRef: MatSnackBarRef<TextOnlySnackBar> | null = null;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Startet die Überwachung der User-Aktivität
   */
  startMonitoring(): void {
    if (!this.isBrowser || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.setupEventListeners();
    this.resetTimers();
  }

  /**
   * Stoppt die Überwachung
   */
  stopMonitoring(): void {
    if (!this.isBrowser) {
      return;
    }

    this.isMonitoring = false;
    this.clearTimers();
    this.removeEventListeners();
  }

  /**
   * Richtet Event-Listener für User-Aktivitäten ein
   */
  private setupEventListeners(): void {
    if (!this.isBrowser) {
      return;
    }

    // Events die als Aktivität zählen
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.onUserActivity.bind(this), true);
    });
  }

  /**
   * Entfernt Event-Listener
   */
  private removeEventListeners(): void {
    if (!this.isBrowser) {
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.removeEventListener(event, this.onUserActivity.bind(this), true);
    });
  }

  /**
   * Wird bei jeder User-Aktivität aufgerufen
   */
  private onUserActivity(): void {
    if (!this.isMonitoring) {
      return;
    }

    // Schließe die Warnung, wenn sie angezeigt wird
    if (this.warningShown && this.warningSnackBarRef) {
      this.warningSnackBarRef.dismiss();
      this.warningSnackBarRef = null;
    }

    this.warningShown = false;
    this.resetTimers();
  }

  /**
   * Setzt die Timer zurück
   */
  private resetTimers(): void {
    this.clearTimers();

    // Warning-Timer: Warnung 1 Minute vor Logout
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.WARNING_TIME);

    // Inactivity-Timer: Automatischer Logout nach 15 Minuten
    this.inactivityTimer = setTimeout(() => {
      this.logout();
    }, this.INACTIVITY_TIME);
  }

  /**
   * Löscht alle laufenden Timer
   */
  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Zeigt eine Warnung vor dem automatischen Logout
   */
  private showWarning(): void {
    if (this.warningShown) {
      return;
    }

    this.warningShown = true;
    
    this.warningSnackBarRef = this.snackBar.open(
      'Sie werden in 1 Minute aufgrund von Inaktivität automatisch abgemeldet.',
      'Aktivität fortsetzen',
      {
        duration: 55000, // 55 Sekunden
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      }
    );
    
    this.warningSnackBarRef.onAction().subscribe(() => {
      // User hat auf Button geklickt - als Aktivität werten
      this.onUserActivity();
    });
  }

  /**
   * Führt automatischen Logout durch
   */
  private logout(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.stopMonitoring();
    
    this.snackBar.open(
      'Sie wurden aufgrund von Inaktivität automatisch abgemeldet.',
      'OK',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );

    // Logout durchführen
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
