import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  passwordForm: FormGroup;
  hideOld = true;
  hideNew = true;
  hideConfirm = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.passwordForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      new_password2: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('new_password');
    const confirmPassword = form.get('new_password2');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.passwordForm.valid) {
      this.loading = true;
      
      this.authService.changePassword(this.passwordForm.value).subscribe({
        next: () => {
          this.showSuccessMessage('Passwort erfolgreich geändert');
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error) => {
          this.loading = false;
          const message = this.extractErrorMessage(error);
          this.showErrorMessage(message);
        }
      });
    }
  }

  private extractErrorMessage(error: any): string {
    if (error.error?.old_password) {
      return error.error.old_password[0];
    }
    if (error.error?.new_password) {
      return error.error.new_password[0];
    }
    if (error.error?.detail) {
      return error.error.detail;
    }
    return 'Fehler beim Ändern des Passworts';
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.DURATION,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.ERROR_DURATION,
      panelClass: ['error-snackbar']
    });
  }
}
