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
  weekDays: { name: string; date: string; dateStr: string }[] = [];
  
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

  setCurrentWeek(): void {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
    
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() + diff);
    this.currentWeekStart.setHours(0, 0, 0, 0);
    
    this.currentWeekEnd = new Date(this.currentWeekStart);
    this.currentWeekEnd.setDate(this.currentWeekStart.getDate() + 6);
    this.currentWeekEnd.setHours(23, 59, 59, 999);
    
    this.updateFiltersFromWeek();
    this.generateWeekDays();
  }

  generateWeekDays(): void {
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    this.weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      
      this.weekDays.push({
        name: dayNames[i],
        date: this.formatDateDisplay(date),
        dateStr: this.formatDate(date)
      });
    }
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

  isEmployeeAbsent(employeeId: number, dateStr: string): AbsenceRecord | null {
    const targetDate = new Date(dateStr);
    
    return this.absences.find(absence => {
      if (absence.employee !== employeeId) {
        return false;
      }
      
      // Urlaubswunsch ist keine blockierende Abwesenheit
      if (absence.absence_type === 'vacation_wish') {
        return false;
      }
      
      const startDate = new Date(absence.start_date);
      const endDate = new Date(absence.end_date);
      
      // Vergleiche nur die Daten, nicht die Zeiten
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      
      return targetDate >= startDate && targetDate <= endDate;
    }) || null;
  }

  getAbsenceTypeName(type: string): string {
    switch (type) {
      case 'sick': return 'Krankheit';
      case 'vacation': return 'Urlaub';
      case 'vacation_wish': return 'Urlaubswunsch';
      case 'kug': return 'Kurzarbeit';
      case 'other': return 'Sonstiges';
      default: return type;
    }
  }

  openQuickAddDialog(employeeId: number, dateStr: string): void {
    // Quick add for single shift - reuse existing dialog but pre-fill employee and date
    const date = new Date(dateStr);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const currentWeekNum = { year: d.getUTCFullYear(), week: weekNo };
    
    const dialogRef = this.dialog.open(ShiftDialogComponent, {
      width: '600px',
      data: {
        shiftTypes: this.shiftTypes,
        employees: this.employees,
        currentWeek: currentWeekNum,
        existingShifts: this.shifts
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && Array.isArray(result)) {
        this.createMultipleShifts(result);
      }
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

  openQuickAddDialogForShiftType(shiftTypeId: number, dateStr: string): void {
    const date = new Date(dateStr);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const currentWeekNum = { year: d.getUTCFullYear(), week: weekNo };
    
    // Find the selected shift type to get its times
    const selectedShiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    
    const dialogRef = this.dialog.open(ShiftDialogComponent, {
      width: '600px',
      data: {
        shiftTypes: this.shiftTypes,
        employees: this.employees,
        currentWeek: currentWeekNum,
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
      if (result && Array.isArray(result)) {
        this.createMultipleShifts(result);
      } else if (result) {
        this.createShift(result);
      }
    });
  }

  updateFiltersFromWeek(): void {
    this.filters.startDate = this.formatDate(this.currentWeekStart);
    this.filters.endDate = this.formatDate(this.currentWeekEnd);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  formatTime(time: string): string {
    // Remove seconds from time string (HH:MM:SS -> HH:MM)
    return time.substring(0, 5);
  }

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

  checkEmployeeConflict(employeeId: number, shiftTypeId: number, dateStr: string, excludeShiftId?: number): void {
    const key = `${employeeId}_${shiftTypeId}_${dateStr}`;
    
    // Check if employee already has a shift on this date (excluding the dragged shift)
    const existingShift = this.shifts.find(s => 
      s.employee === employeeId && s.date === dateStr && s.id !== excludeShiftId
    );
    
    if (existingShift) {
      this.employeeConflicts.set(key, true);
      return;
    }
    
    // Find the shift type to get start/end times
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType) {
      this.employeeConflicts.set(key, false);
      return;
    }
    
    // Get all shifts for this employee sorted by date (excluding the dragged shift)
    const employeeShifts = this.shifts
      .filter(s => s.employee === employeeId && s.id !== excludeShiftId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const newDate = new Date(dateStr);
    const newStart = this.parseTime(shiftType.start_time);
    const newEnd = this.parseTime(shiftType.end_time);
    
    // Check for conflicts with each existing shift
    for (const existingShift of employeeShifts) {
      const existingDate = new Date(existingShift.date);
      const daysDiff = Math.abs((newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only check shifts within 2 days
      if (daysDiff > 2) continue;
      
      const existingStart = this.parseTime(existingShift.start_time);
      const existingEnd = this.parseTime(existingShift.end_time);
      
      // Calculate start time of existing shift
      const existingStartTime = new Date(existingDate);
      existingStartTime.setHours(existingStart.hours, existingStart.minutes, 0, 0);
      
      // Calculate end time of existing shift
      const existingEndTime = new Date(existingDate);
      existingEndTime.setHours(existingEnd.hours, existingEnd.minutes, 0, 0);
      
      // If end time is before start time, shift ends next day
      if (existingEnd.hours < existingStart.hours || 
          (existingEnd.hours === existingStart.hours && existingEnd.minutes < existingStart.minutes)) {
        existingEndTime.setDate(existingEndTime.getDate() + 1);
      }
      
      // Calculate start time of new shift
      const newStartTime = new Date(newDate);
      newStartTime.setHours(newStart.hours, newStart.minutes, 0, 0);
      
      // Calculate end time of new shift
      const newEndTime = new Date(newDate);
      newEndTime.setHours(newEnd.hours, newEnd.minutes, 0, 0);
      
      // If end time is before start time, shift ends next day
      if (newEnd.hours < newStart.hours || 
          (newEnd.hours === newStart.hours && newEnd.minutes < newStart.minutes)) {
        newEndTime.setDate(newEndTime.getDate() + 1);
      }
      
      // Check for overlap: shifts overlap if one starts before the other ends
      const shiftsOverlap = (existingStartTime < newEndTime && newStartTime < existingEndTime);
      
      if (shiftsOverlap) {
        this.employeeConflicts.set(key, true);
        return;
      }
      
      // Calculate rest hours between shifts
      let restHours = 0;
      
      if (newDate > existingDate || (newDate.getTime() === existingDate.getTime() && newStartTime > existingEndTime)) {
        // New shift is after existing shift
        restHours = (newStartTime.getTime() - existingEndTime.getTime()) / (1000 * 60 * 60);
      } else {
        // New shift is before existing shift
        restHours = (existingStartTime.getTime() - newEndTime.getTime()) / (1000 * 60 * 60);
      }
      
      // If less than 11 hours rest, it's a conflict
      if (restHours < 11 && restHours >= 0) {
        this.employeeConflicts.set(key, true);
        return;
      }
    }
    
    // No conflicts found
    this.employeeConflicts.set(key, false);
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

  formatEmployeeName(employee: Employee): string {
    if (!employee.full_name) return '';
    
    const parts = employee.full_name.trim().split(' ');
    if (parts.length < 2) return employee.full_name;
    
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const lastNameFormatted = lastName.length > 7 ? lastName.substring(0, 7) : lastName;
    
    // Finde alle Mitarbeiter mit demselben Nachnamen
    const sameLastName = this.employees.filter(emp => {
      if (emp.id === employee.id) return false;
      const empParts = (emp.full_name || '').trim().split(' ');
      if (empParts.length < 2) return false;
      const empLastName = empParts[empParts.length - 1];
      return empLastName === lastName;
    });
    
    // Wenn niemand denselben Nachnamen hat, nur ersten Buchstaben verwenden
    if (sameLastName.length === 0) {
      return `${firstName.substring(0, 1)}.${lastNameFormatted}`;
    }
    
    // Schrittweise mehr Buchstaben hinzufügen, bis der Name eindeutig ist
    let numLetters = 1;
    while (numLetters <= firstName.length) {
      const abbr = firstName.substring(0, numLetters);
      
      // Prüfen, ob dieser Abbr mit anderen Mitarbeitern kollidiert
      const hasConflict = sameLastName.some(emp => {
        const empParts = (emp.full_name || '').trim().split(' ');
        const empFirstName = empParts[0];
        return empFirstName.substring(0, numLetters) === abbr;
      });
      
      if (!hasConflict) {
        return `${abbr}.${lastNameFormatted}`;
      }
      
      numLetters++;
    }
    
    // Fallback: ganzen Vornamen verwenden
    return `${firstName}.${lastNameFormatted}`;
  }

  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  getWeekDisplay(): string {
    const weekNum = this.getWeekNumber(this.currentWeekStart);
    const startStr = this.formatDateDisplay(this.currentWeekStart);
    const endStr = this.formatDateDisplay(this.currentWeekEnd);
    return `KW${String(weekNum).padStart(2, '0')} (${startStr} - ${endStr})`;
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

  openShiftDialog(shift?: Shift): void {
    // Calculate current week number from currentWeekStart
    const d = new Date(Date.UTC(this.currentWeekStart.getFullYear(), this.currentWeekStart.getMonth(), this.currentWeekStart.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const currentWeekNum = { year: d.getUTCFullYear(), week: weekNo };
    
    const dialogRef = this.dialog.open(ShiftDialogComponent, {
      width: '600px',
      data: {
        shift,
        shiftTypes: this.shiftTypes,
        employees: this.employees,
        existingShifts: this.shifts,
        currentWeek: currentWeekNum
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (Array.isArray(result)) {
          // Multiple shifts created
          this.createMultipleShifts(result);
        } else if (shift) {
          this.updateShift(shift.id, result);
        } else {
          this.createShift(result);
        }
      }
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

  checkForConflictsAfterCreation(newShift: any): void {
    if (!newShift.employee || !newShift.date) return;

    // Check all other shifts of this employee for rest period violations
    const employeeShifts = this.shifts.filter(s => 
      s.employee === newShift.employee && s.id !== newShift.id
    );

    employeeShifts.forEach(existingShift => {
      const newShiftDate = new Date(newShift.date);
      const existingShiftDate = new Date(existingShift.date);
      const timeDiff = Math.abs(newShiftDate.getTime() - existingShiftDate.getTime());
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // If shifts are within 24 hours, check for 11-hour rest period violation
      if (hoursDiff < 24) {
        // Parse times
        const newStart = this.parseTime(newShift.start_time);
        const newEnd = this.parseTime(newShift.end_time);
        const existingStart = this.parseTime(existingShift.start_time);
        const existingEnd = this.parseTime(existingShift.end_time);

        let restHours = 0;
        
        if (newShiftDate > existingShiftDate) {
          // New shift is after existing shift
          const existingEndTime = new Date(existingShiftDate);
          existingEndTime.setHours(existingEnd.hours, existingEnd.minutes);
          
          const newStartTime = new Date(newShiftDate);
          newStartTime.setHours(newStart.hours, newStart.minutes);
          
          restHours = (newStartTime.getTime() - existingEndTime.getTime()) / (1000 * 60 * 60);
        } else {
          // New shift is before existing shift
          const newEndTime = new Date(newShiftDate);
          newEndTime.setHours(newEnd.hours, newEnd.minutes);
          
          const existingStartTime = new Date(existingShiftDate);
          existingStartTime.setHours(existingStart.hours, existingStart.minutes);
          
          restHours = (existingStartTime.getTime() - newEndTime.getTime()) / (1000 * 60 * 60);
        }

        // If rest period is less than 11 hours, mark as conflict
        if (restHours < 11 && restHours >= 0) {
          if (existingShift.id) {
            this.permanentConflicts.add(existingShift.id);
          }
          if (newShift.id) {
            this.permanentConflicts.add(newShift.id);
          }
        }
      }
    });
  }

  parseTime(timeStr: string): { hours: number; minutes: number } {
    const parts = timeStr.split(':');
    return {
      hours: parseInt(parts[0], 10),
      minutes: parseInt(parts[1], 10)
    };
  }

  calculateAbsenceConflicts(): void {
    this.absenceConflicts.clear();
    
    // Prüfe jede Schicht auf Überschneidung mit Abwesenheiten
    this.shifts.forEach(shift => {
      if (!shift.employee || !shift.id) return;
      
      // Prüfe auf Abwesenheiten
      const absence = this.isEmployeeAbsent(shift.employee, shift.date);
      if (absence) {
        this.absenceConflicts.add(shift.id);
        return;
      }
      
      // Prüfe auf genehmigte Urlaubsanträge
      const approvedVacation = this.hasApprovedVacation(shift.employee, shift.date);
      if (approvedVacation) {
        this.absenceConflicts.add(shift.id);
      }
    });
  }

  hasApprovedVacation(employeeId: number, dateStr: string): VacationRequest | null {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.vacationRequests.find(vacation => {
      if (vacation.employee !== employeeId || vacation.status !== 'approved') {
        return false;
      }
      
      const startDate = new Date(vacation.start_date);
      const endDate = new Date(vacation.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return targetDate >= startDate && targetDate <= endDate;
    }) || null;
  }

  calculatePermanentConflicts(): void {
    this.permanentConflicts.clear();
    this.calculateAbsenceConflicts();
    
    // Group shifts by employee
    const shiftsByEmployee = new Map<number, Shift[]>();
    this.shifts.forEach(shift => {
      if (!shift.employee) return;
      
      if (!shiftsByEmployee.has(shift.employee)) {
        shiftsByEmployee.set(shift.employee, []);
      }
      shiftsByEmployee.get(shift.employee)!.push(shift);
    });
    
    // Check each employee's shifts for conflicts
    shiftsByEmployee.forEach((employeeShifts, employeeId) => {
      // Check for multiple shifts on the same day
      const shiftsByDate = new Map<string, Shift[]>();
      employeeShifts.forEach(shift => {
        if (!shiftsByDate.has(shift.date)) {
          shiftsByDate.set(shift.date, []);
        }
        shiftsByDate.get(shift.date)!.push(shift);
      });
      
      // Mark all shifts as conflicts if there are multiple shifts on the same day
      shiftsByDate.forEach((shiftsOnDate, date) => {
        if (shiftsOnDate.length > 1) {
          shiftsOnDate.forEach(shift => {
            if (shift.id) this.permanentConflicts.add(shift.id);
          });
        }
      });
      
      // Sort shifts by date
      const sortedShifts = employeeShifts.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Check consecutive shifts for 11-hour rest period
      for (let i = 0; i < sortedShifts.length - 1; i++) {
        const currentShift = sortedShifts[i];
        const nextShift = sortedShifts[i + 1];
        
        const currentDate = new Date(currentShift.date);
        const nextDate = new Date(nextShift.date);
        
        // Skip if same date (already handled above)
        if (currentShift.date === nextShift.date) continue;
        
        // Only check if shifts are within 2 days (to catch overnight violations)
        const daysDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 2) continue;
        
        // Parse times
        const currentStart = this.parseTime(currentShift.start_time);
        const currentEnd = this.parseTime(currentShift.end_time);
        const nextStart = this.parseTime(nextShift.start_time);
        const nextEnd = this.parseTime(nextShift.end_time);
        
        // Calculate actual start and end times with dates
        const currentStartTime = new Date(currentDate);
        currentStartTime.setHours(currentStart.hours, currentStart.minutes, 0, 0);
        
        const currentEndTime = new Date(currentDate);
        currentEndTime.setHours(currentEnd.hours, currentEnd.minutes, 0, 0);
        
        // If end time is before start time, shift ends next day (night shift)
        if (currentEnd.hours < currentStart.hours || 
            (currentEnd.hours === currentStart.hours && currentEnd.minutes < currentStart.minutes)) {
          currentEndTime.setDate(currentEndTime.getDate() + 1);
        }
        
        const nextStartTime = new Date(nextDate);
        nextStartTime.setHours(nextStart.hours, nextStart.minutes, 0, 0);
        
        const nextEndTime = new Date(nextDate);
        nextEndTime.setHours(nextEnd.hours, nextEnd.minutes, 0, 0);
        
        // If end time is before start time, shift ends next day (night shift)
        if (nextEnd.hours < nextStart.hours || 
            (nextEnd.hours === nextStart.hours && nextEnd.minutes < nextStart.minutes)) {
          nextEndTime.setDate(nextEndTime.getDate() + 1);
        }
        
        // Check for overlap: shifts overlap if one starts before the other ends
        const shiftsOverlap = (currentStartTime < nextEndTime && nextStartTime < currentEndTime);
        
        if (shiftsOverlap) {
          if (currentShift.id) this.permanentConflicts.add(currentShift.id);
          if (nextShift.id) this.permanentConflicts.add(nextShift.id);
          continue; // No need to check rest period if they overlap
        }
        
        // Calculate rest hours between shifts
        const restHours = (nextStartTime.getTime() - currentEndTime.getTime()) / (1000 * 60 * 60);
        
        // If less than 11 hours rest, mark both shifts as conflict
        if (restHours < 11 && restHours >= 0) {
          if (currentShift.id) this.permanentConflicts.add(currentShift.id);
          if (nextShift.id) this.permanentConflicts.add(nextShift.id);
        }
      }
    });
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

  getRequiredQualificationsText(shiftType: ShiftType): string {
    if (!shiftType.qualification_details || shiftType.qualification_details.length === 0) {
      return 'Keine';
    }
    return shiftType.qualification_details.map((q: any) => q.name).join(', ');
  }

  hasMissingQualifications(shiftTypeId: number, dateStr: string): boolean {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType || !shiftType.qualification_details || shiftType.qualification_details.length === 0) {
      return false;
    }

    const shifts = this.getShiftsForTypeAndDay(shiftTypeId, dateStr);
    if (shifts.length === 0) {
      return false;
    }

    // Sammle alle Qualifikationen der zugeteilten Mitarbeiter
    const allEmployeeQualifications = new Set<number>();
    shifts.forEach(shift => {
      if (shift.employee_details?.qualification_details) {
        shift.employee_details.qualification_details.forEach((qual: any) => {
          allEmployeeQualifications.add(qual.id);
        });
      }
    });

    // Prüfe ob alle erforderlichen Qualifikationen abgedeckt sind
    const requiredQualifications = shiftType.qualification_details.map((q: any) => q.id);
    return requiredQualifications.some(reqId => !allEmployeeQualifications.has(reqId));
  }

  getMissingQualificationsText(shiftTypeId: number, dateStr: string): string {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType || !shiftType.qualification_details) {
      return '';
    }

    const shifts = this.getShiftsForTypeAndDay(shiftTypeId, dateStr);
    
    // Sammle alle Qualifikationen der zugeteilten Mitarbeiter
    const allEmployeeQualifications = new Set<number>();
    shifts.forEach(shift => {
      if (shift.employee_details?.qualification_details) {
        shift.employee_details.qualification_details.forEach((qual: any) => {
          allEmployeeQualifications.add(qual.id);
        });
      }
    });

    // Finde fehlende Qualifikationen
    const missingQualifications = shiftType.qualification_details.filter(
      (q: any) => !allEmployeeQualifications.has(q.id)
    );

    return missingQualifications.map((q: any) => q.name).join(', ');
  }

  getSuggestedEmployees(shiftTypeId: number, dateStr: string): Employee[] {
    const shiftType = this.shiftTypes.find(st => st.id === shiftTypeId);
    if (!shiftType || !shiftType.qualification_details) {
      return [];
    }

    const shifts = this.getShiftsForTypeAndDay(shiftTypeId, dateStr);
    
    // Sammle alle Qualifikationen der zugeteilten Mitarbeiter
    const allEmployeeQualifications = new Set<number>();
    shifts.forEach(shift => {
      if (shift.employee_details?.qualification_details) {
        shift.employee_details.qualification_details.forEach((qual: any) => {
          allEmployeeQualifications.add(qual.id);
        });
      }
    });

    // Finde fehlende Qualifikationen
    const missingQualificationIds = shiftType.qualification_details
      .filter((q: any) => !allEmployeeQualifications.has(q.id))
      .map((q: any) => q.id);

    if (missingQualificationIds.length === 0) {
      return [];
    }

    // Sammle alle Mitarbeiter-IDs, die am selben Tag bereits in irgendeiner Schicht eingeplant sind
    const allShiftsOnDay = this.shifts.filter(s => s.date === dateStr);
    const employeesAlreadyScheduledOnDay = new Set(allShiftsOnDay.map(s => s.employee).filter(e => e));

    // Finde Mitarbeiter die:
    // 1. Zur gleichen Abteilung gehören (oder keine Abteilung hat der Schichttyp)
    // 2. Mindestens eine der fehlenden Qualifikationen haben
    // 3. Noch nicht in dieser Schicht eingeteilt sind
    // 4. NICHT abwesend sind (kein Urlaub, Krankheit, KUG oder Sonstiges)
    // 5. Am selben Tag noch nicht in einer anderen Schicht eingeplant sind
    const assignedEmployeeIds = new Set(shifts.map(s => s.employee).filter(e => e));

    return this.employees.filter(emp => {
      // Nicht bereits zugewiesen
      if (assignedEmployeeIds.has(emp.id)) {
        return false;
      }

      // Nicht bereits an diesem Tag in einer anderen Schicht eingeplant
      if (employeesAlreadyScheduledOnDay.has(emp.id)) {
        return false;
      }

      // Nicht abwesend (Urlaub, Krankheit, KUG, Sonstiges)
      if (this.isEmployeeAbsent(emp.id, dateStr)) {
        return false;
      }

      // Abteilungsprüfung
      if (shiftType.department && emp.department && shiftType.department !== emp.department) {
        return false;
      }

      // Hat mindestens eine der fehlenden Qualifikationen
      if (emp.qualification_details && emp.qualification_details.length > 0) {
        const empQualIds = emp.qualification_details.map((q: any) => q.id);
        return missingQualificationIds.some(reqId => empQualIds.includes(reqId));
      }

      return false;
    }).sort((a, b) => {
      // Sortiere nach Anzahl der passenden Qualifikationen (absteigend)
      const aQuals = a.qualification_details?.filter((q: any) => 
        missingQualificationIds.includes(q.id)
      ).length || 0;
      const bQuals = b.qualification_details?.filter((q: any) => 
        missingQualificationIds.includes(q.id)
      ).length || 0;
      return bQuals - aQuals;
    });
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
      const fileName = `Schichtplan_KW${this.getWeekNumber(this.currentWeekStart)}_${new Date().toISOString().split('T')[0]}.pdf`;
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

  getEmployeeAbsenceTooltip(employee: Employee): string {
    const absenceDays: { date: string, type: string, label: string }[] = [];
    
    this.weekDays.forEach(day => {
      const absence = this.isEmployeeAbsent(employee.id, day.dateStr);
      if (absence) {
        const dateObj = new Date(day.dateStr);
        const formattedDate = dateObj.toLocaleDateString('de-DE', { 
          weekday: 'short', 
          day: '2-digit', 
          month: '2-digit' 
        });
        
        const typeLabel = this.getAbsenceTypeLabel(absence.absence_type);
        absenceDays.push({ date: formattedDate, type: absence.absence_type, label: typeLabel });
      }
    });
    
    if (absenceDays.length === 0) {
      return '';
    }
    
    // Gruppiere aufeinanderfolgende Tage mit gleichem Typ
    const grouped: { type: string, label: string, dates: string[] }[] = [];
    let current: { type: string, label: string, dates: string[] } | null = null;
    
    absenceDays.forEach(day => {
      if (!current || current.type !== day.type) {
        current = { type: day.type, label: day.label, dates: [day.date] };
        grouped.push(current);
      } else {
        current.dates.push(day.date);
      }
    });
    
    // Formatiere die Ausgabe
    const lines = grouped.map(group => {
      if (group.dates.length === 1) {
        return `${group.label}: ${group.dates[0]}`;
      } else {
        return `${group.label}: ${group.dates[0]} - ${group.dates[group.dates.length - 1]}`;
      }
    });
    
    return lines.join('\n');
  }

  getAbsenceTypeLabel(type: string): string {
    switch (type) {
      case 'sick': return 'Krank';
      case 'vacation': return 'Urlaub';
      case 'kug': return 'KUG';
      case 'other': return 'Sonstiges';
      default: return type;
    }
  }

  getEmployeeWeeklyHours(employeeId: number): number {
    const employeeShifts = this.shifts.filter(shift => shift.employee === employeeId);
    return employeeShifts.reduce((total, shift) => {
      const shiftType = this.shiftTypes.find(st => st.id === shift.shift_type);
      if (!shiftType) return total;
      
      // Berechne Dauer aus start_time und end_time mit automatischer Pausenberücksichtigung
      const duration = this.calculateShiftDuration(shiftType.start_time, shiftType.end_time, shiftType.break_duration);
      return total + duration;
    }, 0);
  }

  calculateShiftDuration(startTime: string, endTime: string, breakDuration: number = 0): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (minutes < 0) {
      hours--;
      minutes += 60;
    }
    
    // Über Mitternacht
    if (hours < 0) {
      hours += 24;
    }
    
    const totalHours = hours + (minutes / 60);
    
    // Pausenabzug direkt aus ShiftType (wurde bereits im Backend/Frontend bei Schichttyp-Erstellung berechnet)
    const breakHours = breakDuration / 60; // break_duration ist in Minuten
    return Math.max(0, totalHours - breakHours);
  }
}

