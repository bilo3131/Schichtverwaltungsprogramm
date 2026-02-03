import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UI_CONSTANTS } from '../constants/ui.constants';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';

        if (error.error instanceof ErrorEvent) {
          // Client-seitiger Fehler
          errorMessage = `Fehler: ${error.error.message}`;
        } else {
          // Server-seitiger Fehler
          switch (error.status) {
            case 400:
              errorMessage = 'Ungültige Anfrage';
              if (error.error?.detail) {
                errorMessage = error.error.detail;
              } else if (error.error?.error) {
                errorMessage = error.error.error;
              }
              break;
            case 401:
              errorMessage = 'Nicht autorisiert. Bitte melden Sie sich erneut an.';
              // Redirect zum Login
              localStorage.removeItem('token');
              this.router.navigate(['/login']);
              break;
            case 403:
              errorMessage = 'Keine Berechtigung für diese Aktion';
              break;
            case 404:
              errorMessage = 'Ressource nicht gefunden';
              break;
            case 500:
              errorMessage = 'Serverfehler. Bitte versuchen Sie es später erneut.';
              break;
            case 503:
              errorMessage = 'Service vorübergehend nicht verfügbar';
              break;
            default:
              if (error.error?.detail) {
                errorMessage = error.error.detail;
              } else if (error.error?.error) {
                errorMessage = error.error.error;
              }
          }
        }

        // Zeige Fehlermeldung, außer bei 401 (wird durch Redirect behandelt)
        if (error.status !== 401) {
          this.snackBar.open(errorMessage, 'Schließen', {
            duration: UI_CONSTANTS.SNACKBAR.DURATION * 2,
            panelClass: ['error-snackbar'],
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        }

        return throwError(() => error);
      })
    );
  }
}
