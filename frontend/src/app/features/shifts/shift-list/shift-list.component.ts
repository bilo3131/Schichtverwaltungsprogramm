import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ShiftService } from '../../../core/services/shift.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { Shift, ShiftType, Employee, AbsenceRecord, VacationRequest } from '../../../core/models';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShiftDialogComponent } from '../../../shared/dialogs/shift-dialog/shift-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';
import {
  formatDate as toIsoDate, formatDateDisplay as toDisplayDate,
  formatTime as trimSeconds, getWeekRange, getWeekNumber,
  getIsoWeekYear, getWeekDisplay as buildWeekDisplay,
  generateWeekDays as buildWeekDays, calculateShiftDuration, WeekDay
} from './shift-week.util';
import {
  isEmployeeAbsent as checkAbsence, hasApprovedVacation as checkVacation,
  getAbsenceTypeName as absenceTypeName, getAbsenceTypeLabel as absenceTypeLabel,
  shiftsViolateRestRule, hasShiftConflict,
  getConflictingShiftIds, getAbsenceConflictShiftIds, buildAbsenceTooltip
} from './shift-conflict.util';
import {
  getRequiredQualificationsText as buildRequiredQualsText,
  hasMissingQualifications as checkMissingQuals,
  getMissingQualificationsText as buildMissingQualsText,
  getSuggestedEmployees as findSuggestedEmployees,
  abbreviateEmployeeName
} from './shift-qualification.util';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule,
    DragDropModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './shift-list.component.html',
  styleUrls: ['./shift-list.component.scss']
})
export class ShiftListComponent implements OnInit {
  shifts: Shift[] = [];
  shiftTypes: ShiftType[] = [];
  employees: Employee[] = [];
  absences: AbsenceRecord[] = [];
  vacationRequests: VacationRequest[] = [];
  loading = false;
  weekDays: WeekDay[] = [];
  
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  
  weekStatus: { isPublished: boolean; publishedAt?: Date } | null = null;
  
  isEmployee = false;
  
  employeeConflicts: Map<string, boolean> = new Map();
  currentHoveredCell: { shiftTypeId: number; date: string } | null = null;
  currentDraggedEmployee: Employee | null = null;
  currentDraggedShift: Shift | null = null;
  permanentConflicts: Set<number> = new Set();
  absenceConflicts: Set<number> = new Set();
  conflictCells: Set<string> = new Set();
  understaffedCells: Set<string> = new Set();
  
  showInfoBox = false;
  
  filters = {
    startDate: '',
    endDate: ''
  };

  constructor(
    private shiftService: ShiftService,
    private employeeService: EmployeeService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private dashboardFilterService: DashboardFilterService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.isEmployee = this.authService.currentUserValue?.role === 'employee';
    this.setCurrentWeek();
  }

  /** Sets currentWeekStart/End to the Monday–Sunday range of today and refreshes the grid. */
  setCurrentWeek(): void {
    const { start, end } = getWeekRange(new Date());
    this.currentWeekStart = start;
    this.currentWeekEnd   = end;
    this.updateFiltersFromWeek();
    this.generateWeekDays();
  }

  /** Rebuilds the weekDays array from the current week start date. */
  generateWeekDays(): void {
    this.weekDays = buildWeekDays(this.currentWeekStart);
  }

  isDayAvailableForShiftType(shiftType: ShiftType, dateStr: string): boolean {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sonntag, 6=Samstag
    
    // Samstag (6) - prüfe works_on_saturday
    if (dayOfWeek === 6) {
      return shiftType.works_on_saturday;
    }
    
    // Sonntag (0) - prüfe works_on_sunday
    if (dayOfWeek === 0) {
      return shiftType.works_on_sunday;
    }
    
    // Montag-Freitag sind immer verfügbar
    return true;
  }

  getShiftsForEmployeeAndDay(employeeId: number, dateStr: string): Shift[] {
    return this.shifts.filter(shift => 
      shift.employee === employeeId && shift.date === dateStr
    );
  }

  getShiftsForTypeAndDay(shiftTypeId: number, dateStr: string): Shift[] {
    return this.shifts.filter(shift => 
      shift.shift_type === shiftTypeId && shift.date === dateStr
    );
  }

  isUnderstaffed(shiftTypeId: number, dateStr: string): boolean {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType) return false;
    
    const shiftsCount = this.getShiftsForTypeAndDay(shiftTypeId, dateStr).length;
    return shiftsCount < shiftType.min_employees;
  }

  calculateUnderstaffedCells(): void {
    this.understaffedCells.clear();
    
    // Prüfe jede Zelle für jede Schichtart und jeden Tag
    this.shiftTypes.forEach(shiftType => {
      this.weekDays.forEach(day => {
        const date = new Date(day.dateStr);
        const dayOfWeek = date.getDay();
        
        // Prüfe ob der ShiftType für diesen Tag verfügbar ist
        if (!this.isDayAvailableForShiftType(shiftType, day.dateStr)) {
          return; // Überspringe nicht verfügbare Tage
        }
        
        const shiftsCount = this.getShiftsForTypeAndDay(shiftType.id, day.dateStr).length;
        if (shiftsCount < shiftType.min_employees) {
          const key = `${shiftType.id}_${day.dateStr}`;
          this.understaffedCells.add(key);
        }
      });
    });
    
    this.cdr.detectChanges();
  }

  /** Returns the blocking AbsenceRecord for the employee on dateStr, or null. */
  isEmployeeAbsent(employeeId: number, dateStr: string): AbsenceRecord | null {
    return checkAbsence(employeeId, dateStr, this.absences);
  }

  /** Maps an absence type key to its full German name (used in dialogs). */
  getAbsenceTypeName(type: string): string { return absenceTypeName(type); }

  /** Opens the shift dialog pre-filled for a specific employee and date. */
  openQuickAddDialog(employeeId: number, dateStr: string): void {
    const dialogRef = this.dialog.open(ShiftDialogComponent, {
      width: '600px',
      data: {
        shiftTypes: this.shiftTypes,
        employees: this.employees,
        currentWeek: getIsoWeekYear(new Date(dateStr)),
        existingShifts: this.shifts
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && Array.isArray(result)) this.createMultipleShifts(result);
    });
  }

  onEmployeeDrop(event: CdkDragDrop<any>): void {
    const draggedData = event.item.data;
    const dropData = event.container.data;
    const shiftTypeId = dropData.shiftTypeId;
    const dateStr = dropData.date;

    // Find the shift type to get start_time and end_time
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    
    if (!shiftType) {
      console.error('Shift type not found');
      return;
    }

    // Check if we're dragging an existing shift or a new employee
    if (draggedData.id && draggedData.shift_type !== undefined) {
      // Dragging an existing shift - update it
      const shift: Shift = draggedData;
      
      // Check if shift type or date changed
      if (shift.shift_type === shiftTypeId && shift.date === dateStr) {
        return;
      }
      
      // Prüfe ob Mitarbeiter bereits am Zieldatum eine andere Schicht hat
      if (shift.date !== dateStr && shift.employee) {
        const existingShiftOnDate = this.shifts.find(s => 
          s.employee === shift.employee && 
          s.date === dateStr &&
          s.id !== shift.id // Nicht die aktuelle Schicht selbst
        );
        if (existingShiftOnDate) {
          // Stillschweigend verhindern - keine Aktion ausführen
          return;
        }
      }
      
      // Prüfe ob Mitarbeiter an diesem Tag abwesend ist
      if (shift.employee) {
        const absence = this.isEmployeeAbsent(shift.employee, dateStr);
        if (absence) {
          const employeeName = shift.employee_details?.full_name || 'Mitarbeiter';
          this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
              title: 'Mitarbeiter ist abwesend',
              message: `${employeeName} hat am ${this.formatDateDisplay(new Date(dateStr))} eine Abwesenheit (${this.getAbsenceTypeName(absence.absence_type)}). Schicht kann nicht verschoben werden.`,
              showCancel: false,
              confirmText: 'Schließen'
            }
          });
          return;
        }
        
        // Prüfe ob Mitarbeiter genehmigten Urlaub hat
        const vacation = this.hasApprovedVacation(shift.employee, dateStr);
        if (vacation) {
          const employeeName = shift.employee_details?.full_name || 'Mitarbeiter';
          this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
              title: 'Mitarbeiter ist abwesend',
              message: `${employeeName} hat am ${this.formatDateDisplay(new Date(dateStr))} eine Abwesenheit (Urlaub). Schicht kann nicht verschoben werden.`,
              showCancel: false,
              confirmText: 'Schließen'
            }
          });
          return;
        }
      }
      
      // Prüfe ob Abteilungen übereinstimmen beim Verschieben
      if (shiftType.department && shift.employee_details?.department && 
          shiftType.department !== shift.employee_details.department) {
        this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: {
            title: 'Abteilung stimmt nicht überein',
            message: `Der Mitarbeiter gehört zu einer anderen Abteilung als dieser Schichttyp. Schicht kann nicht verschoben werden.`,
            showCancel: false,
            confirmText: 'Schließen'
          }
        });
        return;
      }
      
      const updatedShiftData = {
        date: dateStr,
        shift_type: shiftTypeId,
        employee: shift.employee,
        start_time: shiftType.start_time,
        end_time: shiftType.end_time,
        status: shift.status,
        notes: shift.notes || ''
      };
      
      this.updateShift(shift.id, updatedShiftData);
    } else {
      // Dragging a new employee - create shift
      const employee: Employee = draggedData;
      
      // Prüfe ob Mitarbeiter bereits am selben Tag eingeteilt ist
      const existingShiftOnDate = this.shifts.find(s => 
        s.employee === employee.id && 
        s.date === dateStr
      );
      if (existingShiftOnDate) {
        // Stillschweigend verhindern - keine Aktion ausführen
        return;
      }
      
      // Prüfe ob Mitarbeiter an diesem Tag abwesend ist
      const absence = this.isEmployeeAbsent(employee.id, dateStr);
      if (absence) {
        this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: {
            title: 'Mitarbeiter ist abwesend',
            message: `${employee.full_name} hat am ${this.formatDateDisplay(new Date(dateStr))} eine Abwesenheit (${this.getAbsenceTypeName(absence.absence_type)}). Schicht kann nicht erstellt werden.`,
            showCancel: false,
            confirmText: 'Schließen'
          }
        });
        return;
      }
      
      // Prüfe ob Mitarbeiter genehmigten Urlaub hat
      const vacation = this.hasApprovedVacation(employee.id, dateStr);
      if (vacation) {
        this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: {
            title: 'Mitarbeiter ist abwesend',
            message: `${employee.full_name} hat am ${this.formatDateDisplay(new Date(dateStr))} eine Abwesenheit (Urlaub). Schicht kann nicht erstellt werden.`,
            showCancel: false,
            confirmText: 'Schließen'
          }
        });
        return;
      }
      
      // Prüfe ob Abteilungen übereinstimmen
      if (shiftType.department && employee.department && shiftType.department !== employee.department) {
        this.dialog.open(ConfirmDialogComponent, {
          width: '400px',
          data: {
            title: 'Abteilung stimmt nicht überein',
            message: `Der Mitarbeiter gehört zu einer anderen Abteilung als dieser Schichttyp. Schicht kann nicht erstellt werden.`,
            showCancel: false,
            confirmText: 'Schließen'
          }
        });
        return;
      }
      
      const shiftData = {
        date: dateStr,
        shift_type: shiftTypeId,
        employee: employee.id,
        start_time: shiftType.start_time,
        end_time: shiftType.end_time,
        status: 'draft',
        notes: ''
      };

      // Create the shift
      this.createShift(shiftData);
    }
  }

  /** Opens the shift dialog pre-filled for a specific shift type and date. */
  openQuickAddDialogForShiftType(shiftTypeId: number, dateStr: string): void {
    const selectedShiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    const dialogRef = this.dialog.open(ShiftDialogComponent, {
      width: '600px',
      data: {
        shiftTypes: this.shiftTypes,
        employees: this.employees,
        currentWeek: getIsoWeekYear(new Date(dateStr)),
        existingShifts: this.shifts,
        prefilledData: {
          shift_type: shiftTypeId,
          date: dateStr,
          start_time: selectedShiftType?.start_time || '',
          end_time: selectedShiftType?.end_time || ''
        }
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && Array.isArray(result)) { this.createMultipleShifts(result); }
      else if (result) { this.createShift(result); }
    });
  }

  /** Syncs the date-range filter strings from the current week boundaries. */
  updateFiltersFromWeek(): void {
    this.filters.startDate = toIsoDate(this.currentWeekStart);
    this.filters.endDate   = toIsoDate(this.currentWeekEnd);
  }

  /** Returns YYYY-MM-DD for the given date. */
  formatDate(date: Date): string { return toIsoDate(date); }

  /** Returns DD.MM.YYYY for the given date. */
  formatDateDisplay(date: Date): string { return toDisplayDate(date); }

  /** Trims a time string from HH:MM:SS to HH:MM. */
  formatTime(time: string): string { return trimSeconds(time); }

  hasEmployeeConflict(employeeId: number | undefined): boolean {
    if (!employeeId || !this.currentHoveredCell) return false;
    const key = `${employeeId}_${this.currentHoveredCell.shiftTypeId}_${this.currentHoveredCell.date}`;
    return this.employeeConflicts.get(key) || false;
  }

  onCellHover(shiftTypeId: number, dateStr: string): void {
    const previousSize = this.conflictCells.size;
    const previousKey = this.currentHoveredCell ? `${this.currentHoveredCell.shiftTypeId}_${this.currentHoveredCell.date}` : null;
    
    this.currentHoveredCell = { shiftTypeId, date: dateStr };
    this.employeeConflicts.clear();
    this.conflictCells.clear();
    
    // If we're dragging an employee or a shift, check conflicts
    if (this.currentDraggedEmployee) {
      this.checkEmployeeConflict(this.currentDraggedEmployee.id, shiftTypeId, dateStr);
    } else if (this.currentDraggedShift && this.currentDraggedShift.employee) {
      // When dragging a shift, check conflicts for that shift's employee
      this.checkEmployeeConflict(this.currentDraggedShift.employee, shiftTypeId, dateStr, this.currentDraggedShift.id);
    } else {
      // Otherwise check all employees (for hover without drag)
      this.employees.forEach(employee => {
        this.checkEmployeeConflict(employee.id, shiftTypeId, dateStr);
      });
    }
    
    // Update conflictCells based on employeeConflicts
    const key = `${shiftTypeId}_${dateStr}`;
    if (this.employeeConflicts.get(`${this.currentDraggedEmployee?.id || this.currentDraggedShift?.employee}_${shiftTypeId}_${dateStr}`) === true) {
      this.conflictCells.add(key);
    }
    
    // Only trigger change detection if something actually changed
    const currentKey = `${shiftTypeId}_${dateStr}`;
    if (previousSize !== this.conflictCells.size || previousKey !== currentKey) {
      this.cdr.detectChanges();
    }
  }

  /**
   * Checks whether the employee conflicts with the target shift type + date during drag,
   * then stores the result in employeeConflicts for the current hover cycle.
   */
  checkEmployeeConflict(employeeId: number, shiftTypeId: number, dateStr: string, excludeShiftId?: number): void {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    const key = `${employeeId}_${shiftTypeId}_${dateStr}`;
    const conflict = shiftType
      ? hasShiftConflict(employeeId, dateStr, shiftType, this.shifts, excludeShiftId)
      : false;
    this.employeeConflicts.set(key, conflict);
  }

  onCellLeave(): void {
    this.currentHoveredCell = null;
    this.employeeConflicts.clear();
    this.conflictCells.clear();
  }

  onDragStarted(employee: Employee): void {
    this.currentDraggedEmployee = employee;
  }

  onShiftDragStarted(shift: Shift): void {
    this.currentDraggedShift = shift;
    this.currentDraggedEmployee = null;
  }

  onCalendarMouseMove(event: MouseEvent): void {
    // Only track if we're dragging something
    if (!this.currentDraggedEmployee && !this.currentDraggedShift) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element) return;

    const shiftCell = element.closest('.shift-cell');
    if (!shiftCell) {
      if (this.currentHoveredCell) {
        this.currentHoveredCell = null;
        this.conflictCells.clear();
        this.cdr.detectChanges();
      }
      return;
    }

    const gridRow = shiftCell.closest('.grid-row');
    if (!gridRow) return;

    const allCells = Array.from(gridRow.querySelectorAll('.shift-cell'));
    const cellIndex = allCells.indexOf(shiftCell as Element);
    
    if (cellIndex === -1 || cellIndex >= this.weekDays.length) return;

    const allRows = Array.from(document.querySelectorAll('.grid-row'));
    const rowIndex = allRows.indexOf(gridRow as Element);
    
    if (rowIndex === -1 || rowIndex >= this.shiftTypes.length) return;

    const shiftType = this.shiftTypes[rowIndex];
    const dateStr = this.weekDays[cellIndex].dateStr;

    if (this.currentHoveredCell?.shiftTypeId === shiftType.id && 
        this.currentHoveredCell?.date === dateStr) {
      return;
    }

    this.onCellHover(shiftType.id, dateStr);
  }

  onDragEnded(): void {
    this.currentDraggedEmployee = null;
    this.currentDraggedShift = null;
    this.currentHoveredCell = null;
    this.employeeConflicts.clear();
    this.conflictCells.clear();
  }

  onDragMoved(event: any): void {
    if (!this.currentDraggedEmployee && !this.currentDraggedShift) return;

    // Get the element at the current pointer position
    const element = document.elementFromPoint(event.pointerPosition.x, event.pointerPosition.y);
    if (!element) return;

    // Find the closest shift-cell element
    const shiftCell = element.closest('.shift-cell');
    if (!shiftCell) {
      // Not over a shift cell, clear hover
      if (this.currentHoveredCell) {
        this.currentHoveredCell = null;
        this.employeeConflicts.clear();
        this.conflictCells.clear();
        this.cdr.detectChanges();
      }
      return;
    }

    // Try to find shift type and date from the DOM
    const gridRow = shiftCell.closest('.grid-row');
    if (!gridRow) return;

    // Find all shift cells in this row
    const allCells = Array.from(gridRow.querySelectorAll('.shift-cell'));
    const cellIndex = allCells.indexOf(shiftCell as Element);
    
    if (cellIndex === -1 || cellIndex >= this.weekDays.length) return;

    // Find which shift type this row belongs to
    const allRows = Array.from(document.querySelectorAll('.grid-row'));
    const rowIndex = allRows.indexOf(gridRow as Element);
    
    if (rowIndex === -1 || rowIndex >= this.shiftTypes.length) return;

    const shiftType = this.shiftTypes[rowIndex];
    const dateStr = this.weekDays[cellIndex].dateStr;

    // Check if we're already hovering this cell
    if (this.currentHoveredCell?.shiftTypeId === shiftType.id && 
        this.currentHoveredCell?.date === dateStr) {
      return; // Already computed for this cell
    }

    // Update hover state - this will update conflictCells
    this.onCellHover(shiftType.id, dateStr);
  }

  onDropListEntered(event: any): void {
    if (!event.container.data) return;
    
    const dropData = event.container.data;
    const shiftTypeId = dropData.shiftTypeId;
    const dateStr = dropData.date;
    
    if (shiftTypeId && dateStr) {
      this.onCellHover(shiftTypeId, dateStr);
    }
  }

  isDraggedEmployeeInConflict(employeeId: number): boolean {
    // Only show conflict for the currently dragged employee
    if (!this.currentDraggedEmployee || this.currentDraggedEmployee.id !== employeeId) {
      return false;
    }
    
    // Check if there's a conflict with the hovered cell
    if (!this.currentHoveredCell) return false;
    
    const key = `${employeeId}_${this.currentHoveredCell.shiftTypeId}_${this.currentHoveredCell.date}`;
    const hasConflict = this.employeeConflicts.get(key) === true;
    
    return hasConflict;
  }

  isCellInConflict(shiftTypeId: number, dateStr: string): boolean {
    if (!this.currentHoveredCell) return false;
    
    // Check if this cell is the one being hovered
    if (this.currentHoveredCell.shiftTypeId !== shiftTypeId || 
        this.currentHoveredCell.date !== dateStr) {
      return false;
    }
    
    // Check for conflict based on what's being dragged
    let employeeId: number | undefined;
    
    if (this.currentDraggedEmployee) {
      employeeId = this.currentDraggedEmployee.id;
    } else if (this.currentDraggedShift && this.currentDraggedShift.employee) {
      employeeId = this.currentDraggedShift.employee;
    }
    
    if (!employeeId) return false;
    
    const key = `${employeeId}_${shiftTypeId}_${dateStr}`;
    const hasConflict = this.employeeConflicts.get(key) === true;
    
    return hasConflict;
  }

  hasPermanentConflict(shiftId: number | undefined): boolean {
    if (!shiftId) return false;
    return this.permanentConflicts.has(shiftId) || this.absenceConflicts.has(shiftId);
  }

  getConflictTooltip(shift: Shift): string {
    if (!shift.id) return '';
    
    // Prüfe auf Abwesenheit oder Urlaub
    if (this.absenceConflicts.has(shift.id) && shift.employee) {
      // Zuerst prüfen ob es eine Abwesenheit ist
      const absence = this.isEmployeeAbsent(shift.employee, shift.date);
      if (absence) {
        const absenceTypeName = this.getAbsenceTypeName(absence.absence_type);
        return `Achtung: Mitarbeiter hat eine Abwesenheit (${absenceTypeName})!`;
      }
      
      // Dann prüfen ob es ein genehmigter Urlaub ist
      const vacation = this.hasApprovedVacation(shift.employee, shift.date);
      if (vacation) {
        return 'Achtung: Mitarbeiter hat eine Abwesenheit (Urlaub)!';
      }
    }
    
    // Prüfe auf Ruhezeitverstoß
    if (this.permanentConflicts.has(shift.id)) {
      return 'Achtung: Verstoß gegen 11h Ruhezeit bei dieser Schicht!';
    }
    
    return '';
  }

  getEmployeeName(employeeId: number | undefined): string {
    if (!employeeId) return '';
    const employee = this.employees.find(emp => emp.id === employeeId);
    if (!employee) return '';
    return this.formatEmployeeName(employee);
  }

  isOwnShift(employeeId: number | undefined): boolean {
    if (!employeeId) return false;
    
    const user = this.authService.currentUserValue;
    const userProfileId = user?.employee_profile?.id;
    
    // Konvertiere zu Number falls es ein String ist
    const empId = typeof employeeId === 'string' ? parseInt(employeeId, 10) : employeeId;
    return userProfileId === empId;
  }

  /** Returns a short, unique display name for the shift grid cell (e.g. "Ma.Schmidt"). */
  formatEmployeeName(employee: Employee): string {
    return abbreviateEmployeeName(employee, this.employees);
  }

  /** Returns the formatted week label shown in the header (e.g. "KW05 (03.02.2025 - 09.02.2025)"). */
  getWeekDisplay(): string {
    return buildWeekDisplay(this.currentWeekStart, this.currentWeekEnd);
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.currentWeekEnd.setDate(this.currentWeekEnd.getDate() - 7);
    this.updateFiltersFromWeek();
    this.generateWeekDays();
    this.loadAbsences();
    this.loadShifts();
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.currentWeekEnd.setDate(this.currentWeekEnd.getDate() + 7);
    this.updateFiltersFromWeek();
    this.generateWeekDays();
    this.loadAbsences();
    this.loadShifts();
  }

  goToCurrentWeek(): void {
    this.setCurrentWeek();
    this.loadAbsences();
    this.loadShifts();
  }

  ngOnInit(): void {
    // Sicherstellen dass isEmployee korrekt gesetzt ist
    this.isEmployee = this.authService.currentUserValue?.role === 'employee';
    
    this.loadShiftTypes();
    this.loadEmployees();
    this.loadAbsences();
    this.loadVacationRequests();
    this.loadShifts();
    
    // Bei Änderung des Abteilungsfilters neu laden
    this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.loadShiftTypes();
      this.loadEmployees();
      this.loadAbsences();
      this.loadVacationRequests();
      this.loadShifts();
    });
  }

  loadShiftTypes(): void {
    const departmentId = this.dashboardFilterService.selectedDepartmentId$.value;
    const params: any = {};
    
    if (departmentId && departmentId !== 'all') {
      params.department = departmentId;
    }
    
    this.shiftService.getShiftTypes(params).subscribe({
      next: (data) => {
        this.shiftTypes = data.results || data;
      }
    });
  }

  loadEmployees(): void {
    const departmentId = this.dashboardFilterService.getDepartmentFilter();
    const params: any = {};
    
    if (departmentId !== 'all') {
      params.department = departmentId;
    }
    
    this.employeeService.getEmployees(params).subscribe({
      next: (data) => {
        this.employees = data.results || data;
      }
    });
  }

  loadAbsences(): void {
    const params: any = {
      start_date: this.filters.startDate,
      end_date: this.filters.endDate
    };
    
    const departmentId = this.dashboardFilterService.getDepartmentFilter();
    if (departmentId !== 'all') {
      params.department = departmentId;
    }
    
    this.employeeService.getAbsences(params).subscribe({
      next: (data) => {
        this.absences = data.results || data;
      },
      error: (err) => {
        console.error('Error loading absences:', err);
        this.absences = [];
      }
    });
  }

  loadVacationRequests(): void {
    // Verwende einen Parameter, um alle genehmigten Urlaubsanträge für die Schichtplanung zu laden
    const params: any = {
      status: 'approved'  // Lade nur genehmigte Anträge
    };
    
    this.employeeService.getVacationRequests('approved', params).subscribe({
      next: (data) => {
        const allRequests = data.results || data;
        
        // Filtere nach Abteilung, falls ein Filter gesetzt ist
        const departmentId = this.dashboardFilterService.getDepartmentFilter();
        
        let filteredRequests = allRequests;
        if (departmentId !== 'all') {
          filteredRequests = filteredRequests.filter((vr: VacationRequest) => vr.employee_department === departmentId);
        }
        
        this.vacationRequests = filteredRequests;
        // Konflikte neu berechnen nach Laden der Urlaubsanträge
        if (this.shifts.length > 0) {
          this.calculateAbsenceConflicts();
        }
      },
      error: (err) => {
        console.error('Error loading vacation requests:', err);
        this.vacationRequests = [];
      }
    });
  }

  loadShifts(): void {
    this.loading = true;
    const params: any = {};
    
    if (this.filters.startDate) params.start_date = this.filters.startDate;
    if (this.filters.endDate) params.end_date = this.filters.endDate;
    
    const departmentId = this.dashboardFilterService.getDepartmentFilter();
    if (departmentId !== 'all') {
      params.department = departmentId;
    }

    this.shiftService.getShifts(params).subscribe({
      next: (data) => {
        this.shifts = data.results || data;
        this.updateWeekStatus();
        this.calculateAbsenceConflicts();
        this.calculatePermanentConflicts();
        this.calculateUnderstaffedCells();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  updateWeekStatus(): void {
    if (this.shifts.length === 0) {
      this.weekStatus = null;
      return;
    }
    
    const publishedShifts = this.shifts.filter(shift => shift.status === 'published');
    
    // Nur als veröffentlicht markieren, wenn ALLE Schichten published sind
    if (publishedShifts.length > 0 && publishedShifts.length === this.shifts.length) {
      // Finde die neueste Aktualisierung
      const latestUpdate = publishedShifts.reduce((latest, shift) => {
        const shiftDate = new Date(shift.updated_at);
        return shiftDate > latest ? shiftDate : latest;
      }, new Date(publishedShifts[0].updated_at));
      
      this.weekStatus = {
        isPublished: true,
        publishedAt: latestUpdate
      };
    } else {
      // Entwurf: Wenn nicht alle Schichten published sind
      this.weekStatus = {
        isPublished: false
      };
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'published': return 'primary';
      case 'completed': return 'accent';
      default: return '';
    }
  }

  /** Opens the shift dialog for creating or editing a shift. */
  openShiftDialog(shift?: Shift): void {
    const dialogRef = this.dialog.open(ShiftDialogComponent, {
      width: '600px',
      data: {
        shift,
        shiftTypes: this.shiftTypes,
        employees: this.employees,
        existingShifts: this.shifts,
        currentWeek: getIsoWeekYear(this.currentWeekStart)
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (Array.isArray(result))  { this.createMultipleShifts(result); }
      else if (shift)             { this.updateShift(shift.id, result); }
      else                        { this.createShift(result); }
    });
  }

  createMultipleShifts(shiftsData: any[]): void {
    let completed = 0;
    let violations: any[] = [];
    const total = shiftsData.length;

    // Validate all shifts first
    const validations = shiftsData.map(shiftData => {
      if (shiftData.employee && shiftData.date) {
        return this.shiftService.validateCompliance(shiftData.employee, shiftData.date).toPromise();
      }
      return Promise.resolve({ violations: [] });
    });

    Promise.all(validations).then(results => {
      results.forEach((complianceCheck: any, index) => {
        if (complianceCheck?.violations && complianceCheck.violations.length > 0) {
          const employeeName = this.getEmployeeName(shiftsData[index].employee);
          const date = new Date(shiftsData[index].date).toLocaleDateString('de-DE');
          violations.push({
            employee: employeeName,
            date: date,
            violations: complianceCheck.violations
          });
        }
      });

      if (violations.length > 0) {
        // Show warning with all violations
        const violationText = violations.map(v => 
          `${v.employee} (${v.date}):\n${v.violations.map((viol: any) => `  • ${viol.message}`).join('\n')}`
        ).join('\n\n');

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: 'Arbeitszeitgesetz-Verstöße',
            message: `Die folgenden Schichten verstoßen gegen das Arbeitszeitgesetz:\n\n${violationText}\n\nMöchten Sie die Schichten trotzdem erstellen?`
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.performCreateMultipleShifts(shiftsData);
          }
        });
      } else {
        this.performCreateMultipleShifts(shiftsData);
      }
    }).catch(() => {
      this.performCreateMultipleShifts(shiftsData);
    });
  }

  performCreateMultipleShifts(shiftsData: any[]): void {
    let completed = 0;
    const total = shiftsData.length;

    shiftsData.forEach(shiftData => {
      this.shiftService.createShift(shiftData).subscribe({
        next: () => {
          completed++;
          if (completed === total) {
            this.loadShifts();
          }
        },
        error: (error) => {
          console.error('Error creating shift:', error);
          completed++;
          if (completed === total) {
            this.loadShifts();
          }
        }
      });
    });
  }

  createShift(shiftData: any): void {
    // Validate compliance before creating
    if (shiftData.employee && shiftData.date) {
      this.shiftService.validateCompliance(shiftData.employee, shiftData.date).subscribe({
        next: (complianceCheck) => {
          if (complianceCheck.violations && complianceCheck.violations.length > 0) {
            // Show warning dialog
            const violations = complianceCheck.violations
              .map((v: any) => `• ${v.message}`)
              .join('\n');
            
            const dialogRef = this.dialog.open(ConfirmDialogComponent, {
              data: {
                title: 'Arbeitszeitgesetz-Verstoß',
                message: `Die folgende Schicht verstößt gegen das Arbeitszeitgesetz:\n\n${violations}\n\nMöchten Sie die Schicht trotzdem erstellen?`
              }
            });

            dialogRef.afterClosed().subscribe(result => {
              if (result) {
                this.performCreateShift(shiftData);
              }
            });
          } else {
            this.performCreateShift(shiftData);
          }
        },
        error: () => {
          // If validation fails, proceed anyway
          this.performCreateShift(shiftData);
        }
      });
    } else {
      this.performCreateShift(shiftData);
    }
  }

  performCreateShift(shiftData: any): void {
    if (this.weekStatus?.isPublished) {
      shiftData.status = 'draft';
    }
    
    this.shiftService.createShift(shiftData).subscribe({
      next: (createdShift) => {
        this.loadShifts();
        this.checkForConflictsAfterCreation(createdShift);
      },
      error: (error) => {
        const errorMessage = this.extractShiftErrorMessage(error, 'Fehler beim Erstellen der Schicht.');
        this.showErrorMessage(errorMessage);
      }
    });
  }

  /**
   * Immediately flags rest-period conflicts involving a newly created shift,
   * before the full loadShifts() reload completes.
   */
  checkForConflictsAfterCreation(newShift: any): void {
    if (!newShift.employee || !newShift.date) return;
    const peers = this.shifts.filter(s => s.employee === newShift.employee && s.id !== newShift.id);
    peers.forEach(existing => {
      const hoursDiff = Math.abs(
        (new Date(newShift.date).getTime() - new Date(existing.date).getTime()) / 3_600_000
      );
      if (hoursDiff >= 24) return;
      if (shiftsViolateRestRule(
        new Date(existing.date), existing.start_time, existing.end_time,
        new Date(newShift.date), newShift.start_time, newShift.end_time
      )) {
        if (existing.id) this.permanentConflicts.add(existing.id);
        if (newShift.id)  this.permanentConflicts.add(newShift.id);
      }
    });
  }

  /** Returns the approved VacationRequest for the employee on dateStr, or null. */
  hasApprovedVacation(employeeId: number, dateStr: string): VacationRequest | null {
    return checkVacation(employeeId, dateStr, this.vacationRequests);
  }

  /** Recomputes absenceConflicts from the current shifts, absences, and vacation requests. */
  calculateAbsenceConflicts(): void {
    this.absenceConflicts = getAbsenceConflictShiftIds(this.shifts, this.absences, this.vacationRequests);
  }

  /** Recomputes all permanent conflicts (absence + rest-period violations) for the current week. */
  calculatePermanentConflicts(): void {
    this.calculateAbsenceConflicts();
    this.permanentConflicts = getConflictingShiftIds(this.shifts);
  }

  updateShift(id: number, shiftData: any): void {
    // Wenn der Plan veröffentlicht ist, setze den Status auf draft
    if (this.weekStatus?.isPublished) {
      shiftData.status = 'draft';
    }
    
    this.shiftService.updateShift(id, shiftData).subscribe({
      next: () => {
        this.loadShifts();
      },
      error: (error) => {
        console.error('Error updating shift:', error);
      }
    });
  }

  deleteShift(shift: Shift): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Schicht löschen',
        message: `Möchten Sie die Schicht vom ${shift.date} wirklich löschen?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.shiftService.deleteShift(shift.id).subscribe({
          next: () => {
            this.loadShifts();
          },
          error: (error) => {
            console.error('Error deleting shift:', error);
          }
        });
      }
    });
  }

  publishWeek(): void {
    const weekDisplay = this.getWeekDisplay();
    const shiftsInWeek = this.shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= this.currentWeekStart && shiftDate <= this.currentWeekEnd;
    });

    if (shiftsInWeek.length === 0) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Keine Schichten',
          message: `Es gibt keine Schichten für ${weekDisplay}.`
        }
      });
      return;
    }

    // Prüfe auf Arbeitszeitgesetz-Verstöße und Abwesenheitskonflikte
    const shiftsWithConflicts = shiftsInWeek.filter(shift => 
      shift.id && (this.permanentConflicts.has(shift.id) || this.absenceConflicts.has(shift.id))
    );

    if (shiftsWithConflicts.length > 0) {
      const conflictDialog = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Konflikte vorhanden',
          message: `Der Schichtplan kann nicht veröffentlicht werden, da ${shiftsWithConflicts.length} Schicht${shiftsWithConflicts.length > 1 ? 'en' : ''} Konflikte aufweisen (rot markiert).\n\nBitte korrigieren Sie die Konflikte (Arbeitszeitgesetz-Verstöße, Abwesenheiten, Urlaube), bevor Sie den Plan veröffentlichen.`,
          showCancel: false,
          confirmText: 'Schließen'
        }
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Schichtplan veröffentlichen',
        message: `Möchten Sie den Schichtplan für ${weekDisplay} veröffentlichen?\n\nAlle ${shiftsInWeek.length} eingesetzten Mitarbeiter werden per Email benachrichtigt.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const startDate = this.formatDate(this.currentWeekStart);
        const endDate = this.formatDate(this.currentWeekEnd);

        this.shiftService.publishWeek(startDate, endDate).subscribe({
          next: (response) => {
            this.loadShifts();
            const successDialog = this.dialog.open(ConfirmDialogComponent, {
              data: {
                title: 'Erfolgreich veröffentlicht',
                message: `Der Schichtplan wurde veröffentlicht und ${response.emails_sent || shiftsInWeek.length} Email(s) wurden versendet.`,
                showCancel: false,
                confirmText: 'OK'
              }
            });
          },
          error: (error) => {
            console.error('Error publishing week:', error);
            const errorDialog = this.dialog.open(ConfirmDialogComponent, {
              data: {
                title: 'Fehler',
                message: error.error?.detail || 'Fehler beim Veröffentlichen des Schichtplans'
              }
            });
          }
        });
      }
    });
  }

  deleteAllShifts(): void {
    const weekDisplay = this.getWeekDisplay();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Alle Schichten löschen',
        message: `Möchten Sie wirklich ALLE ${this.shifts.length} Schichten von ${weekDisplay} löschen? Diese Aktion kann nicht rückgängig gemacht werden!`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        let deleted = 0;
        const total = this.shifts.length;

        this.shifts.forEach(shift => {
          this.shiftService.deleteShift(shift.id).subscribe({
            next: () => {
              deleted++;
              if (deleted === total) {
                this.loadShifts();
              }
            },
            error: (error) => {
              console.error('Error deleting shift:', error);
              deleted++;
              if (deleted === total) {
                this.loadShifts();
              }
            }
          });
        });
      }
    });
  }

  /** Returns comma-separated required qualification names for the shift type. */
  getRequiredQualificationsText(shiftType: ShiftType): string {
    return buildRequiredQualsText(shiftType);
  }

  /** Returns true if any required qualification is not covered by the assigned employees. */
  hasMissingQualifications(shiftTypeId: number, dateStr: string): boolean {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType) return false;
    return checkMissingQuals(shiftType, this.getShiftsForTypeAndDay(shiftTypeId, dateStr));
  }

  /** Returns comma-separated names of missing qualifications for a shift cell. */
  getMissingQualificationsText(shiftTypeId: number, dateStr: string): string {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType) return '';
    return buildMissingQualsText(shiftType, this.getShiftsForTypeAndDay(shiftTypeId, dateStr));
  }

  /** Returns employees who can fill missing qualifications for the given shift cell. */
  getSuggestedEmployees(shiftTypeId: number, dateStr: string): Employee[] {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType) return [];
    return findSuggestedEmployees(
      shiftType, this.getShiftsForTypeAndDay(shiftTypeId, dateStr),
      this.employees, this.shifts, this.absences, dateStr
    );
  }

  getEmployeeQualificationsText(employee: Employee): string {
    if (!employee.qualification_details || employee.qualification_details.length === 0) {
      return 'Keine';
    }
    return employee.qualification_details.map((q: any) => q.name).join(', ');
  }

  addSuggestedEmployee(employee: Employee, shiftTypeId: number, dateStr: string): void {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType) {
      return;
    }

    const shiftData = {
      date: dateStr,
      shift_type: shiftTypeId,
      employee: employee.id,
      start_time: shiftType.start_time,
      end_time: shiftType.end_time,
      status: 'draft',
      notes: ''
    };

    this.createShift(shiftData);
  }

  exportToPDF(): void {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape format
      
      // Header
      doc.setFontSize(18);
      doc.text(`Schichtplan ${this.getWeekDisplay()}`, 14, 15);
      
      // Generate table data
      const tableData: any[] = [];
      
      // Create header row with days
      const headerRow = ['Schichttyp', ...this.weekDays.map(day => 
        `${day.name}\n${day.dateStr.split('-').reverse().join('.')}`
      )];
      
      // Create rows for each shift type
      this.shiftTypes.forEach(shiftType => {
        const row: any[] = [
          `${shiftType.name}\n${shiftType.start_time.substring(0,5)} - ${shiftType.end_time.substring(0,5)}`
        ];
        
        this.weekDays.forEach(day => {
          const shifts = this.getShiftsForTypeAndDay(shiftType.id, day.dateStr);
          const employeeNames = shifts.map(shift => 
            this.getEmployeeName(shift.employee)
          ).join('\n');
          row.push(employeeNames || '-');
        });
        
        tableData.push(row);
      });
      
      // Generate table
      autoTable(doc, {
        head: [headerRow],
        body: tableData,
        startY: 25,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [63, 81, 181], // Material blue
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 40, halign: 'left' }
        },
        margin: { top: 25 }
      });
      
      // Save PDF
      const fileName = `Schichtplan_KW${getWeekNumber(this.currentWeekStart)}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      this.showSuccessMessage('PDF erfolgreich erstellt');
    } catch (error) {
      console.error('PDF Export Error:', error);
      this.showErrorMessage('Fehler beim Erstellen der PDF');
    }
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

  private extractShiftErrorMessage(error: any, defaultMessage: string): string {
    if (error.error?.non_field_errors) {
      return error.error.non_field_errors[0];
    }
    
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }
    
    return error.message || error.error?.detail || defaultMessage;
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }

  isEmployeeOverloaded(employee: Employee): boolean {
    const weeklyHours = this.getEmployeeWeeklyHours(employee.id);
    const maxHours = employee.max_hours_per_week || 40;
    return weeklyHours > maxHours;
  }

  hasEmployeeReachedMinHours(employee: Employee): boolean {
    const weeklyHours = this.getEmployeeWeeklyHours(employee.id);
    const minHours = employee.min_hours_per_week || 0;
    return weeklyHours >= minHours;
  }

  hasEmployeeAbsence(employee: Employee): boolean {
    // Prüfe ob der Mitarbeiter an einem der Tage der aktuellen Woche eine Abwesenheit hat
    return this.weekDays.some(day => {
      return this.isEmployeeAbsent(employee.id, day.dateStr) !== null;
    });
  }

  /** Returns a multi-line tooltip listing all absence days for the employee in the current week. */
  getEmployeeAbsenceTooltip(employee: Employee): string {
    return buildAbsenceTooltip(employee.id, this.weekDays, this.absences);
  }

  /** Maps an absence type key to its short German label (used in tooltips). */
  getAbsenceTypeLabel(type: string): string { return absenceTypeLabel(type); }

  /** Returns total worked hours for the employee in the current week. */
  getEmployeeWeeklyHours(employeeId: number): number {
    return this.shifts
      .filter(s => s.employee === employeeId)
      .reduce((total, s) => {
        const st = this.shiftTypes.find(t => t.id === s.shift_type);
        return st ? total + calculateShiftDuration(st.start_time, st.end_time, st.break_duration) : total;
      }, 0);
  }
}

