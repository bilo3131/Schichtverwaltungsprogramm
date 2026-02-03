import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DepartmentService } from '../../../core/services/department.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Department } from '../../../core/models/employee.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { DepartmentInfoDialogComponent } from '../../../shared/dialogs/department-info-dialog/department-info-dialog.component';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

// Inline Department Dialog Component
@Component({
  selector: 'app-department-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.department ? 'Abteilung bearbeiten' : 'Neue Abteilung' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" required>
          <mat-error *ngIf="form.get('name')?.hasError('required')">
            Name ist erforderlich
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Beschreibung</mat-label>
          <textarea matInput formControlName="description" rows="4"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        Speichern
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
  `]
})
class DepartmentDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DepartmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { department?: Department }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data.department?.name || '', Validators.required],
      description: [this.data.department?.description || '']
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit {
  departments: Department[] = [];
  loading = false;
  displayedColumns = ['name', 'description', 'employee_count', 'actions'];

  constructor(
    private departmentService: DepartmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private subscriptionService: SubscriptionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loading = true;
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openDialog(department?: Department): void {
    // Nur bei neuen Abteilungen Subscription-Limit prüfen
    if (!department && !this.subscriptionService.canAddDepartment()) {
      const limits = this.subscriptionService.getCurrentLimits();
      this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Abteilungs-Limit erreicht',
          message: `Sie haben das Limit von ${limits?.departments.max || 0} Abteilungen für Ihr ${limits?.tier || 'aktuelles'}-Abonnement erreicht. Bitte upgraden Sie Ihr Abonnement, um weitere Abteilungen hinzuzufügen.`,
          confirmText: 'Abonnement upgraden',
          cancelText: 'Abbrechen'
        }
      }).afterClosed().subscribe(result => {
        if (result) {
          this.router.navigate(['/subscription']);
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(DepartmentDialogComponent, {
      width: '500px',
      data: { department }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (department) {
          this.updateDepartment(department.id, result);
        } else {
          this.createDepartment(result);
        }
      }
    });
  }

  createDepartment(data: any): void {
    this.departmentService.createDepartment(data).subscribe({
      next: () => {
        this.loadDepartments();
        this.showSuccessMessage('Abteilung erfolgreich erstellt');
      },
      error: (error) => {
        const message = this.extractDepartmentErrorMessage(error, 'Fehler beim Erstellen der Abteilung');
        this.showErrorMessage(message);
      }
    });
  }

  updateDepartment(id: number, data: any): void {
    this.departmentService.updateDepartment(id, data).subscribe({
      next: () => {
        this.loadDepartments();
        this.showSuccessMessage('Abteilung erfolgreich aktualisiert');
      },
      error: (error) => {
        const message = this.extractDepartmentErrorMessage(error, 'Fehler beim Aktualisieren der Abteilung');
        this.showErrorMessage(message);
      }
    });
  }

  deleteDepartment(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Abteilung löschen',
        message: 'Möchten Sie diese Abteilung wirklich löschen? Mitarbeiter dieser Abteilung werden keiner Abteilung zugeordnet.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.departmentService.deleteDepartment(id).subscribe({
          next: () => {
            this.loadDepartments();
            this.showSuccessMessage('Abteilung erfolgreich gelöscht');
          },
          error: (error) => {
            const message = this.extractDepartmentErrorMessage(error, 'Fehler beim Löschen der Abteilung');
            this.showErrorMessage(message);
          }
        });
      }
    });
  }

  openInfoDialog(department: Department): void {
    const dialogRef = this.dialog.open(DepartmentInfoDialogComponent, {
      width: '500px',
      data: { department }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'edit') {
        this.openDialog(result.department);
      }
    });
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

  private showInfoMessage(message: string): void {
    this.snackBar.open(message, 'Schließen', { 
      duration: UI_CONSTANTS.SNACKBAR.DURATION
    });
  }

  private extractDepartmentErrorMessage(error: any, defaultMessage: string): string {
    return error.error?.name?.[0] || error.error?.detail || defaultMessage;
  }

  showInfoBox = false;

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
