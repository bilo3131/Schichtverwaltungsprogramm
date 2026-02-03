import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { Qualification } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { QualificationDialogComponent } from '../../../shared/dialogs/qualification-dialog/qualification-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { QualificationInfoDialogComponent } from '../../../shared/dialogs/qualification-info-dialog/qualification-info-dialog.component';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-qualification-list',
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
  templateUrl: './qualification-list.component.html',
  styleUrls: ['./qualification-list.component.scss']
})
export class QualificationListComponent implements OnInit, OnDestroy {
  qualifications: Qualification[] = [];
  filteredQualifications: Qualification[] = [];
  loading = false;
  displayedColumns = ['name', 'description', 'department', 'created_at', 'actions'];
  private departmentSubscription?: Subscription;
  showInfoBox = false;

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private dashboardFilterService: DashboardFilterService
  ) {}

  ngOnInit(): void {
    this.loadQualifications();
    
    // Subscribe to department filter changes
    this.departmentSubscription = this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.filterQualifications();
    });
  }

  ngOnDestroy(): void {
    this.departmentSubscription?.unsubscribe();
  }

  loadQualifications(): void {
    this.loading = true;
    this.employeeService.getQualifications().subscribe({
      next: (data) => {
        this.qualifications = data.results || data;
        this.filterQualifications();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filterQualifications(): void {
    const selectedDepartmentId = this.dashboardFilterService.getDepartmentFilter();
    
    if (selectedDepartmentId === 'all') {
      this.filteredQualifications = this.qualifications;
    } else {
      this.filteredQualifications = this.qualifications.filter(q => q.department === selectedDepartmentId);
    }
  }

  openDialog(qualification?: Qualification): void {
    const dialogRef = this.dialog.open(QualificationDialogComponent, {
      width: '500px',
      data: { qualification }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (qualification) {
          this.updateQualification(qualification.id, result);
        } else {
          this.createQualification(result);
        }
      }
    });
  }

  createQualification(data: any): void {
    this.employeeService.createQualification(data).subscribe({
      next: () => {
        this.loadQualifications();
        this.showSuccessMessage('Qualifikation erfolgreich erstellt');
      },
      error: (error) => {
        const message = this.extractErrorMessage(error, 'Fehler beim Erstellen der Qualifikation');
        this.showErrorMessage(message);
      }
    });
  }

  updateQualification(id: number, data: any): void {
    this.employeeService.updateQualification(id, data).subscribe({
      next: () => {
        this.loadQualifications();
        this.showSuccessMessage('Qualifikation erfolgreich aktualisiert');
      },
      error: (error) => {
        const message = this.extractErrorMessage(error, 'Fehler beim Aktualisieren der Qualifikation');
        this.showErrorMessage(message);
      }
    });
  }

  deleteQualification(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Qualifikation löschen',
        message: 'Möchten Sie diese Qualifikation wirklich löschen?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.employeeService.deleteQualification(id).subscribe({
          next: () => {
            this.loadQualifications();
            this.showSuccessMessage('Qualifikation erfolgreich gelöscht');
          },
          error: (error) => {
            const message = this.extractErrorMessage(error, 'Fehler beim Löschen der Qualifikation');
            this.showErrorMessage(message);
          }
        });
      }
    });
  }

  openInfoDialog(qualification: Qualification): void {
    const dialogRef = this.dialog.open(QualificationInfoDialogComponent, {
      width: '500px',
      data: { qualification }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'edit') {
        this.openDialog(result.qualification);
      }
    });
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
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

  private extractErrorMessage(error: any, defaultMessage: string): string {
    return error.error?.name?.[0] || error.error?.detail || defaultMessage;
  }
}
