import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { VacationRequest, AbsenceRecord } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { VacationApprovalDialogComponent } from '../../../shared/dialogs/vacation-approval-dialog/vacation-approval-dialog.component';
import { VacationRequestDialogComponent } from '../../../shared/dialogs/vacation-request-dialog/vacation-request-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { VacationCalendarDialogComponent } from '../../../shared/dialogs/vacation-calendar-dialog/vacation-calendar-dialog.component';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-vacation-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatTabsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatSnackBarModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './vacation-list.component.html',
  styleUrls: ['./vacation-list.component.scss']
})
export class VacationListComponent implements OnInit, OnDestroy {
  private readonly STATUS_LABELS = {
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    pending: 'Ausstehend'
  } as const;
  
  vacationRequests: VacationRequest[] = [];
  filteredVacationRequests: VacationRequest[] = [];
  loadingVacations = false;
  pendingVacations = 0;
  vacationColumns: string[] = [];
  isAdmin = false;
  isEmployee = false;
  showInfoBox = false;
  private departmentSubscription?: Subscription;

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private dashboardFilterService: DashboardFilterService
  ) {
    const user = this.authService.currentUserValue;
    this.isAdmin = this.authService.isAdmin;
    this.isEmployee = user?.role === 'employee';
    
    // Mitarbeiter sehen die Mitarbeiter-Spalte nicht (sehen nur ihre eigenen Anträge)
    this.vacationColumns = this.isEmployee 
      ? ['start_date', 'end_date', 'reason', 'status', 'approved_by', 'actions']
      : ['employee', 'start_date', 'end_date', 'reason', 'status', 'approved_by', 'actions'];
  }

  ngOnInit(): void {
    this.loadVacationRequests();
    
    // Subscribe to department filter changes
    this.departmentSubscription = this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.filterVacationRequests();
    });
  }

  ngOnDestroy(): void {
    this.departmentSubscription?.unsubscribe();
  }

  loadVacationRequests(): void {
    this.loadingVacations = true;
    this.employeeService.getVacationRequests().subscribe({
      next: (response) => {
        const requests = response.results || response;
        // Sortiere Anträge: pending zuerst, dann nach Datum sortiert
        this.vacationRequests = requests.sort((a: VacationRequest, b: VacationRequest) => {
          // Pending Anträge zuerst
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          
          // Innerhalb der Gruppen nach Startdatum sortieren (neueste zuerst)
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        });
        this.filterVacationRequests();
        this.loadingVacations = false;
      },
      error: (error) => {
        console.error('Error loading vacation requests:', error);
        this.loadingVacations = false;
      }
    });
  }

  filterVacationRequests(): void {
    const selectedDepartmentId = this.dashboardFilterService.getDepartmentFilter();
    const user = this.authService.currentUserValue;
    
    let filtered = this.vacationRequests;
    
    // Abteilungsfilter
    if (selectedDepartmentId !== 'all') {
      filtered = filtered.filter(v => v.employee_department === selectedDepartmentId);
    }
    
    // Rollenbasierte Filterung
    if (user) {
      if (user.role === 'employee') {
        // Mitarbeiter sehen nur ihre eigenen Antr\u00e4ge
        filtered = filtered.filter(v => v.employee === user.employee_profile?.id);
      } else if (user.role === 'team_leader' || user.role === 'group_leader') {
        // Teamleiter/Gruppenleiter sehen nur Mitarbeiter-Antr\u00e4ge (nicht Admin, HR, Abteilungsleiter, andere TL/GL)
        filtered = filtered.filter(v => {
          const employeeRole = v.employee_role;
          return employeeRole === 'employee';
        });
      } else if (user.role === 'department_manager') {
        // Abteilungsleiter sehen Teamleiter, Gruppenleiter, Mitarbeiter (nicht Admin, HR, andere Abteilungsleiter)
        filtered = filtered.filter(v => {
          const employeeRole = v.employee_role;
          return employeeRole === 'team_leader' || 
                 employeeRole === 'group_leader' || 
                 employeeRole === 'employee';
        });
      }
      // Admin und HR sehen alle Antr\u00e4ge (keine weitere Filterung)
    }
    
    this.filteredVacationRequests = filtered;
    this.pendingVacations = filtered.filter((r: VacationRequest) => r.status === 'pending').length;
  }

  openVacationRequestDialog(vacation?: VacationRequest): void {
    const dialogRef = this.dialog.open(VacationRequestDialogComponent, {
      width: '500px',
      data: { 
        vacation,
        existingRequests: this.vacationRequests
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (vacation) {
          this.updateVacationRequest(vacation.id, result);
        } else {
          this.createVacationRequest(result);
        }
      }
    });
  }

  private updateVacationRequest(id: number, data: any): void {
    this.employeeService.updateVacationRequest(id, data).subscribe({
      next: () => {
        this.loadVacationRequests();
        this.showSuccessMessage('Urlaubsantrag erfolgreich aktualisiert');
      },
      error: (error) => {
        const message = this.extractErrorMessage(error, 'Fehler beim Aktualisieren des Urlaubsantrags');
        this.showErrorMessage(message);
      }
    });
  }

  private createVacationRequest(data: any): void {
    this.employeeService.createVacationRequest(data).subscribe({
      next: () => {
        this.loadVacationRequests();
        this.showSuccessMessage('Urlaubsantrag erfolgreich erstellt');
      },
      error: (error) => {
        const message = this.extractErrorMessage(error, 'Fehler beim Erstellen des Urlaubsantrags');
        this.showErrorMessage(message);
      }
    });
  }

  editVacation(request: VacationRequest): void {
    this.openVacationRequestDialog(request);
  }

  approveVacation(request: VacationRequest): void {
    const dialogRef = this.dialog.open(VacationApprovalDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
      autoFocus: false,
      data: { request, action: 'approve' }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.employeeService.approveVacationRequest(request.id).subscribe({
          next: () => {
            this.loadVacationRequests();
            this.showSuccessMessage('Urlaubsantrag erfolgreich genehmigt');
          },
          error: (error) => {
            const message = this.extractErrorMessage(error, 'Fehler beim Genehmigen des Urlaubsantrags');
            this.showErrorMessage(message);
          }
        });
      }
    });
  }

  rejectVacation(request: VacationRequest): void {
    const dialogRef = this.dialog.open(VacationApprovalDialogComponent, {
      width: '500px',
      maxHeight: '90vh',
      autoFocus: false,
      data: { request, action: 'reject' }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.employeeService.rejectVacationRequest(request.id).subscribe({
          next: () => {
            this.loadVacationRequests();
            this.showSuccessMessage('Urlaubsantrag erfolgreich abgelehnt');
          },
          error: (error) => {
            const message = this.extractErrorMessage(error, 'Fehler beim Ablehnen des Urlaubsantrags');
            this.showErrorMessage(message);
          }
        });
      }
    });
  }

  deleteVacation(request: VacationRequest): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Urlaubsantrag löschen',
        message: `Möchten Sie den Urlaubsantrag von ${request.employee_name} (${request.start_date} - ${request.end_date}) wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.employeeService.deleteVacationRequest(request.id).subscribe({
          next: () => {
            this.loadVacationRequests();
            this.showSuccessMessage('Urlaubsantrag erfolgreich gelöscht');
          },
          error: (error) => {
            const message = this.extractErrorMessage(error, 'Fehler beim Löschen des Urlaubsantrags');
            this.showErrorMessage(message);
          }
        });
      }
    });
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case 'approved': return 'primary';
      case 'rejected': return 'warn';
      default: return 'accent';
    }
  }

  getStatusLabel(status: string): string {
    return this.STATUS_LABELS[status as keyof typeof this.STATUS_LABELS] || status;
  }

  canApprove(request: VacationRequest): boolean {
    const user = this.authService.currentUserValue;
    if (!user || request.status !== 'pending') return false;
    
    // Eigene Anträge können nicht genehmigt/abgelehnt werden
    const isOwnRequest = user.employee_profile?.id == request.employee;
    if (isOwnRequest) return false;
    
    const employeeRole = request.employee_role;
    
    // Admin und HR k\u00f6nnen alle genehmigen
    if (user.role === 'admin' || user.role === 'hr') return true;
    
    // Abteilungsleiter k\u00f6nnen Teamleiter, Gruppenleiter, Mitarbeiter genehmigen
    if (user.role === 'department_manager') {
      return employeeRole === 'team_leader' || 
             employeeRole === 'group_leader' || 
             employeeRole === 'employee';
    }
    
    // Teamleiter/Gruppenleiter k\u00f6nnen nur Mitarbeiter genehmigen
    if (user.role === 'team_leader' || user.role === 'group_leader') {
      return employeeRole === 'employee';
    }
    
    return false;
  }

  canEdit(request: VacationRequest): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    
    const isOwnRequest = user.employee_profile?.id == request.employee;
    const employeeRole = request.employee_role;
    
    // Eigene Antr\u00e4ge: nur pending k\u00f6nnen bearbeitet werden
    if (isOwnRequest) {
      return request.status === 'pending';
    }
    
    // Admin und HR k\u00f6nnen alle bearbeiten
    if (user.role === 'admin' || user.role === 'hr') return true;
    
    // Abteilungsleiter k\u00f6nnen Teamleiter, Gruppenleiter, Mitarbeiter bearbeiten
    if (user.role === 'department_manager') {
      return employeeRole === 'team_leader' || 
             employeeRole === 'group_leader' || 
             employeeRole === 'employee';
    }
    
    // Teamleiter/Gruppenleiter k\u00f6nnen nur Mitarbeiter bearbeiten
    if (user.role === 'team_leader' || user.role === 'group_leader') {
      return employeeRole === 'employee';
    }
    
    return false;
  }

  canDelete(request: VacationRequest): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    
    const isOwnRequest = user.employee_profile?.id == request.employee;
    const employeeRole = request.employee_role;
    
    // Eigene Antr\u00e4ge: nur pending k\u00f6nnen gel\u00f6scht werden
    if (isOwnRequest) {
      return request.status === 'pending';
    }
    
    // Admin und HR k\u00f6nnen alle l\u00f6schen
    if (user.role === 'admin' || user.role === 'hr') return true;
    
    // Abteilungsleiter k\u00f6nnen Teamleiter, Gruppenleiter, Mitarbeiter l\u00f6schen
    if (user.role === 'department_manager') {
      return employeeRole === 'team_leader' || 
             employeeRole === 'group_leader' || 
             employeeRole === 'employee';
    }
    
    // Teamleiter/Gruppenleiter k\u00f6nnen nur Mitarbeiter l\u00f6schen
    if (user.role === 'team_leader' || user.role === 'group_leader') {
      return employeeRole === 'employee';
    }
    
    return false;
  }

  isFirstNonPendingRequest(request: VacationRequest): boolean {
    const index = this.vacationRequests.indexOf(request);
    if (index === 0) return false;
    
    // Prüfe ob dies die erste nicht-pending Zeile ist
    const previousRequest = this.vacationRequests[index - 1];
    return previousRequest.status === 'pending' && request.status !== 'pending';
  }

  openCalendarView(vacation: VacationRequest): void {
    this.dialog.open(VacationCalendarDialogComponent, {
      width: '600px',
      data: { vacation }
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

  private extractErrorMessage(error: any, defaultMessage: string): string {
    return error.error?.detail || defaultMessage;
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
