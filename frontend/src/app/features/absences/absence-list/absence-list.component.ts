import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { AbsenceRecord, Employee, VacationRequest } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { AbsenceDialogComponent } from '../../../shared/dialogs/absence-dialog/absence-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { AbsenceCalendarDialogComponent } from '../../../shared/dialogs/absence-calendar-dialog/absence-calendar-dialog.component';

@Component({
  selector: 'app-absence-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './absence-list.component.html',
  styleUrls: ['./absence-list.component.scss']
})
export class AbsenceListComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource = new MatTableDataSource<AbsenceRecord>([]);
  allAbsences: AbsenceRecord[] = [];
  employees: Employee[] = [];
  loading = false;
  selectedType = '';
  timeFilter = 'all';
  showInfoBox = false;
  displayedColumns = ['employee', 'absence_type', 'start_date', 'end_date', 'duration', 'notes', 'actions'];
  private departmentSubscription?: Subscription;

  @ViewChild(MatSort, { static: false }) sort?: MatSort;

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private dashboardFilterService: DashboardFilterService
  ) {}

  ngOnInit(): void {
    this.loadAbsences();
    this.loadEmployees();
    
    // Subscribe to department filter changes
    this.departmentSubscription = this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.filterAbsencesByDepartment();
    });
    
    // Automatisch neu laden wenn Seite wieder fokussiert wird
    window.addEventListener('focus', () => {
      this.loadAbsences();
    });
  }

  ngOnDestroy(): void {
    this.departmentSubscription?.unsubscribe();
    window.removeEventListener('focus', () => {
      this.loadAbsences();
    });
  }

  ngAfterViewInit(): void {
    // Warte kurz bis die Daten geladen sind
    setTimeout(() => {
      this.setupSort();
    }, 500);
  }

  private setupSort(): void {
    if (!this.sort) {
      return;
    }

    // Deaktiviere automatisches Sorting, da wir manuelle Sortierung verwenden
    this.dataSource.sort = null;
  }

  loadEmployees(): void {
    this.employeeService.getEmployees().subscribe({
      next: (response) => {
        this.employees = response.results || response;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      }
    });
  }

  openAbsenceDialog(absence?: AbsenceRecord): void {
    const dialogRef = this.dialog.open(AbsenceDialogComponent, {
      width: '500px',
      data: { absence, employees: this.employees }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (absence) {
          this.updateAbsence(absence.id, result);
        } else {
          this.createAbsence(result);
        }
      }
    });
  }

  createAbsence(absenceData: Partial<AbsenceRecord>): void {
    this.employeeService.createAbsence(absenceData).subscribe({
      next: () => {
        this.loadAbsences();
      },
      error: (error) => {
        console.error('Error creating absence:', error);
      }
    });
  }

  updateAbsence(id: number, absenceData: Partial<AbsenceRecord>): void {
    this.employeeService.updateAbsence(id, absenceData).subscribe({
      next: () => {
        this.loadAbsences();
      },
      error: (error) => {
        console.error('Error updating absence:', error);
      }
    });
  }

  deleteAbsence(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Abwesenheit löschen',
        message: 'Möchten Sie diese Abwesenheit wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.employeeService.deleteAbsence(id).subscribe({
          next: () => {
            this.loadAbsences();
          },
          error: (error) => {
            console.error('Error deleting absence:', error);
          }
        });
      }
    });
  }

  loadAbsences(): void {
    this.loading = true;
    
    // Lade nur Abwesenheiten (enthält bereits genehmigte Urlaube als AbsenceRecord)
    this.employeeService.getAbsences().subscribe({
      next: (response) => {
        this.allAbsences = response?.results || response || [];
        
        // Filter nach Abteilung und anderen Kriterien
        this.filterAbsencesByDepartment();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading absences:', error);
        this.loading = false;
      }
    });
  }

  filterAbsencesByDepartment(): void {
    const selectedDepartmentId = this.dashboardFilterService.getDepartmentFilter();
    let absences = this.allAbsences;
    
    // Filter nach Abteilung
    if (selectedDepartmentId !== 'all') {
      absences = absences.filter(a => a.employee_department === selectedDepartmentId);
    }
    
    // Filter nach Typ (im Frontend)
    if (this.selectedType) {
      absences = absences.filter((a: AbsenceRecord) => a.absence_type === this.selectedType);
    }
    
    // Filter nach Zeitraum
    const filtered = this.filterByTime(absences);
    this.dataSource.data = filtered;
  }

  filterByTime(absences: AbsenceRecord[]): AbsenceRecord[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered: AbsenceRecord[];
    switch (this.timeFilter) {
      case 'current':
        filtered = absences.filter(a => {
          const start = new Date(a.start_date);
          start.setHours(0, 0, 0, 0);
          const end = a.end_date ? new Date(a.end_date) : new Date('2099-12-31');
          end.setHours(0, 0, 0, 0);
          return start <= today && end >= today;
        });
        break;
      case 'upcoming':
        filtered = absences.filter(a => new Date(a.start_date) > today);
        break;
      case 'past':
        filtered = absences.filter(a => {
          const end = a.end_date ? new Date(a.end_date) : null;
          return end && end < today;
        });
        break;
      default:
        filtered = absences;
    }

    // Sortiere: Aktuelle/Zukünftige zuerst (nach Startdatum aufsteigend), dann Vergangene (nach Startdatum aufsteigend)
    return filtered.sort((a, b) => {
      const endA = a.end_date ? new Date(a.end_date) : new Date('2099-12-31');
      const endB = b.end_date ? new Date(b.end_date) : new Date('2099-12-31');
      endA.setHours(0, 0, 0, 0);
      endB.setHours(0, 0, 0, 0);

      const isPastA = endA < today;
      const isPastB = endB < today;

      // Vergangene nach unten
      if (isPastA && !isPastB) return 1;
      if (!isPastA && isPastB) return -1;

      // Innerhalb der Gruppen nach Startdatum sortieren (aufsteigend)
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  }

  isCurrentAbsence(absence: AbsenceRecord): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(absence.start_date);
    start.setHours(0, 0, 0, 0);
    const end = absence.end_date ? new Date(absence.end_date) : new Date('2099-12-31');
    end.setHours(0, 0, 0, 0);
    return start <= today && end >= today;
  }

  isFirstPastAbsence(absence: AbsenceRecord): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentData = this.dataSource.data;
    const index = currentData.indexOf(absence);
    if (index === 0) return false;

    const endDate = absence.end_date ? new Date(absence.end_date) : new Date('2099-12-31');
    endDate.setHours(0, 0, 0, 0);
    const isPast = endDate < today;

    if (!isPast) return false;

    // Prüfe ob dies die erste vergangene Zeile ist
    const previousAbsence = currentData[index - 1];
    const prevEndDate = previousAbsence.end_date ? new Date(previousAbsence.end_date) : new Date('2099-12-31');
    prevEndDate.setHours(0, 0, 0, 0);
    const prevIsPast = prevEndDate < today;

    return !prevIsPast && isPast;
  }

  calculateDuration(startDate: string, endDate: string | null): string {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Zähle nur Arbeitstage (Montag-Freitag)
    let workDays = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    
    while (current <= endDay) {
      const dayOfWeek = current.getDay();
      // 0 = Sonntag, 6 = Samstag
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    if (!endDate) {
      return `${workDays} Arbeitstag${workDays !== 1 ? 'e' : ''} (laufend)`;
    }
    return `${workDays} Arbeitstag${workDays !== 1 ? 'e' : ''}`;
  }

  getAbsenceTypeColor(type: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (type) {
      case 'sick': return 'warn';
      case 'vacation': return 'primary';
      case 'training': return 'accent';
      default: return undefined;
    }
  }

  getAbsenceTypeLabel(type: string): string {
    switch (type) {
      case 'sick': return 'Krank';
      case 'vacation': return 'Urlaub';
      case 'vacation_wish': return 'Urlaubswunsch';
      case 'kug': return 'KUG';
      case 'other': return 'Sonstiges';
      default: return type;
    }
  }

  getAbsenceIcon(type: string): string {
    switch (type) {
      case 'sick': return 'sick';
      case 'vacation': return 'beach_access';
      case 'vacation_wish': return 'favorite';
      case 'kug': return 'work_off';
      case 'other': return 'event_busy';
      default: return 'event_busy';
    }
  }

  openCalendarView(absence: AbsenceRecord): void {
    this.dialog.open(AbsenceCalendarDialogComponent, {
      width: '600px',
      data: { absence }
    });
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
