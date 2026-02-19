import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-demo-login-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Demo starten</h2>
    <mat-dialog-content>
      <p class="demo-description">
        Gib deine E-Mail-Adresse ein, um sofort Zugang zur Demo zu erhalten.
        Die Demo-Daten werden täglich um 2 Uhr automatisch zurückgesetzt.
      </p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>E-Mail-Adresse</mat-label>
          <input matInput type="email" formControlName="email" placeholder="name@beispiel.de" autocomplete="email">
          <mat-icon matPrefix>email</mat-icon>
          <mat-error *ngIf="form.get('email')?.hasError('required')">
            E-Mail ist erforderlich
          </mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">
            Bitte eine gültige E-Mail-Adresse eingeben
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="form.invalid"
        (click)="confirm()">
        Demo starten
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .demo-description {
      color: var(--mat-sys-on-surface-variant, rgba(0,0,0,0.6));
      margin-bottom: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .full-width { width: 100%; }
    mat-dialog-content { min-width: 320px; }
  `]
})
export class DemoLoginDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DemoLoginDialogComponent>
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  confirm(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value.email);
    }
  }
}
