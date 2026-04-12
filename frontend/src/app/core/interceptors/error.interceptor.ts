import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UI_CONSTANTS } from '../constants/ui.constants';

/** Maps HTTP status codes to user-facing German error messages. */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Ungültige Anfrage',
  401: 'Nicht autorisiert. Bitte melden Sie sich erneut an.',
  403: 'Keine Berechtigung für diese Aktion',
  404: 'Ressource nicht gefunden',
  500: 'Serverfehler. Bitte versuchen Sie es später erneut.',
  503: 'Service vorübergehend nicht verfügbar'
};

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  /** Intercepts all HTTP errors, shows a snackbar message, and handles 401 redirects. */
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const message = this.resolveErrorMessage(error);
        if (error.status === 401) {
          this.handleUnauthorized();
        } else {
          this.showErrorSnackbar(message);
        }
        return throwError(() => error);
      })
    );
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Resolves a human-readable message from an HTTP error.
   * Prefers the server-provided detail/error field over the static map.
   */
  private resolveErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) return `Fehler: ${error.error.message}`;
    const serverMessage = error.error?.detail || error.error?.error;
    return serverMessage || HTTP_ERROR_MESSAGES[error.status] || 'Ein unbekannter Fehler ist aufgetreten';
  }

  /**
   * Clears the stored token and navigates to /login.
   * Full auth state cleanup happens when AuthService reinitialises on the next page load.
   */
  private handleUnauthorized(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('is_demo');
    this.router.navigate(['/login']);
  }

  /** Displays the error message as a snackbar notification. */
  private showErrorSnackbar(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.DURATION * 2,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }
}
