import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { AbsenceRecord, Employee } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { AbsenceDialogComponent } from '../../../shared/dialogs/absence-dialog/absence-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';

export interface CalendarRow {
  employee: { id: number; name: string };
  cells: (AbsenceRecord | null)[];
}

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
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './absence-list.component.html',
  styleUrls: ['./absence-list.component.scss']
})
export class AbsenceListComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<AbsenceRecord>([]);
  allAbsences: AbsenceRecord[] = [];
  employees: Employee[] = [];
  loading = false;
  selectedType = '';
  showInfoBox = false;
  private departmentSubscription?: Subscription;

  // Kalender-State
  viewStartDate: Date = new Date();
  readonly weeksToShow = 3;
  visibleDays: Date[] = [];
  monthGroups: { label: string; count: number }[] = [];
  calendarRows: CalendarRow[] = [];

  constructor(
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private dashboardFilterService: DashboardFilterService
  ) {}

  ngOnInit(): void {
    this.viewStartDate = this.getMonday(new Date());
    this.buildCalendarDays();
    this.loadAbsences();
    this.loadEmployees();

    this.departmentSubscription = this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.filterAbsencesByDepartment();
    });

    window.addEventListener('focus', () => this.loadAbsences());
  }

  ngOnDestroy(): void {
    this.departmentSubscription?.unsubscribe();
    window.removeEventListener('focus', () => this.loadAbsences());
  }

  loadEmployees(): void {
    this.employeeService.getEmployees().subscribe({
      next: (response) => { this.employees = response.results || response; },
      error: (err) => console.error('Error loading employees:', err)
    });
  }

  openAbsenceDialog(absence?: AbsenceRecord): void {
    const dialogRef = this.dialog.open(AbsenceDialogComponent, {
      width: '500px',
      data: { absence, employees: this.employees }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        absence ? this.updateAbsence(absence.id, result) : this.createAbsence(result);
      }
    });
  }

  createAbsence(data: Partial<AbsenceRecord>): void {
    this.employeeService.createAbsence(data).subscribe({
      next: () => this.loadAbsences(),
      error: (err) => console.error(err)
    });
  }

  updateAbsence(id: number, data: Partial<AbsenceRecord>): void {
    this.employeeService.updateAbsence(id, data).subscribe({
      next: () => this.loadAbsences(),
      error: (err) => console.error(err)
    });
  }

  deleteAbsence(absence: AbsenceRecord): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Abwesenheit löschen',
        message: 'Möchten Sie diese Abwesenheit wirklich löschen?',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.employeeService.deleteAbsence(absence.id).subscribe({
          next: () => this.loadAbsences(),
          error: (err) => console.error(err)
        });
      }
    });
  }

  loadAbsences(): void {
    this.loading = true;
    this.employeeService.getAbsences().subscribe({
      next: (response) => {
        this.allAbsences = response?.results || response || [];
        this.filterAbsencesByDepartment();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  filterAbsencesByDepartment(): void {
    const deptId = this.dashboardFilterService.getDepartmentFilter();
    let absences = this.allAbsences;

    if (deptId !== 'all') {
      absences = absences.filter(a => a.employee_department === deptId);
    }
    if (this.selectedType) {
      absences = absences.filter(a => a.absence_type === this.selectedType);
    }

    this.dataSource.data = absences;
    this.buildCalendarRows();
  }

  getAbsenceTypeLabel(type: string): string {
    const map: Record<string, string> = {
      sick: 'Krank',
      vacation: 'Urlaub',
      vacation_wish: 'Urlaubswunsch',
      kug: 'KUG',
      other: 'Sonstiges'
    };
    return map[type] ?? type;
  }

  getAbsenceColor(type: string): string {
    const map: Record<string, string> = {
      sick: '#f44336',
      vacation: '#2196F3',
      vacation_wish: '#FF9800',
      kug: '#9C27B0',
      other: '#607D8B'
    };
    return map[type] ?? '#607D8B';
  }

  getAbsenceIcon(type: string): string {
    const map: Record<string, string> = {
      sick: 'sick',
      vacation: 'beach_access',
      vacation_wish: 'favorite',
      kug: 'work_off',
      other: 'event_busy'
    };
    return map[type] ?? 'event_busy';
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }

  // ---- Kalender-Methoden ----

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  buildCalendarDays(): void {
    this.visibleDays = [];
    for (let i = 0; i < this.weeksToShow * 7; i++) {
      const day = new Date(this.viewStartDate);
      day.setDate(this.viewStartDate.getDate() + i);
      this.visibleDays.push(day);
    }
    this.buildMonthGroups();
    this.buildCalendarRows();
  }

  private buildMonthGroups(): void {
    this.monthGroups = [];
    let currentLabel = '';
    let count = 0;
    for (const day of this.visibleDays) {
      const label = day.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      if (label !== currentLabel) {
        if (currentLabel) this.monthGroups.push({ label: currentLabel, count });
        currentLabel = label;
        count = 1;
      } else {
        count++;
      }
    }
    if (currentLabel) this.monthGroups.push({ label: currentLabel, count });
  }

  buildCalendarRows(): void {
    const empMap = new Map<number, string>();
    for (const abs of this.dataSource.data) {
      if (!empMap.has(abs.employee)) empMap.set(abs.employee, abs.employee_name);
    }
    const sortedEmployees = Array.from(empMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    this.calendarRows = sortedEmployees.map(emp => ({
      employee: emp,
      cells: this.visibleDays.map(day => {
        const t = day.getTime();
        return this.dataSource.data.find(abs => {
          if (abs.employee !== emp.id) return false;
          const s = new Date(abs.start_date).setHours(0, 0, 0, 0);
          const e = abs.end_date
            ? new Date(abs.end_date).setHours(23, 59, 59, 999)
            : new Date('2099-12-31').getTime();
          return t >= s && t <= e;
        }) ?? null;
      })
    }));
  }

  isWeekend(day: Date): boolean {
    const d = day.getDay();
    return d === 0 || d === 6;
  }

  isToday(day: Date): boolean {
    const t = new Date();
    return day.getDate() === t.getDate()
      && day.getMonth() === t.getMonth()
      && day.getFullYear() === t.getFullYear();
  }

  isWeekSeparator(day: Date, index: number): boolean {
    return index > 0 && day.getDay() === 1;
  }

  getDayAbbrev(day: Date): string {
    return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][day.getDay()];
  }

  previousWeek(): void {
    const d = new Date(this.viewStartDate);
    d.setDate(d.getDate() - 7);
    this.viewStartDate = d;
    this.buildCalendarDays();
  }

  nextWeek(): void {
    const d = new Date(this.viewStartDate);
    d.setDate(d.getDate() + 7);
    this.viewStartDate = d;
    this.buildCalendarDays();
  }

  goToToday(): void {
    this.viewStartDate = this.getMonday(new Date());
    this.buildCalendarDays();
  }

  getRangeLabel(): string {
    const fmt = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${fmt(this.viewStartDate)} – ${fmt(this.visibleDays[this.visibleDays.length - 1])}`;
  }

  getCellTooltip(cell: AbsenceRecord): string {
    const fmt = (s: string) => new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const type = this.getAbsenceTypeLabel(cell.absence_type);
    const range = `${fmt(cell.start_date)} – ${cell.end_date ? fmt(cell.end_date) : 'Unbestimmt'}`;
    return cell.notes ? `${type}\n${range}\n${cell.notes}` : `${type}\n${range}`;
  }
}
