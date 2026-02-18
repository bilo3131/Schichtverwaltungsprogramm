import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Shift, ShiftType, Employee } from '../../../core/models';
import { DateUtilsService } from '../../../core/services/date-utils.service';

@Component({
  selector: 'app-shift-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './shift-dialog.component.html',
  styleUrls: ['./shift-dialog.component.scss']
})
export class ShiftDialogComponent implements OnInit {
  form: FormGroup;
  currentYear = 2026;
  currentWeek = 5;

  constructor(
    private fb: FormBuilder,
    private dateUtils: DateUtilsService,
    public dialogRef: MatDialogRef<ShiftDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      shift?: Shift;
      shiftTypes: ShiftType[];
      employees: Employee[];
      existingShifts?: Shift[];
      currentWeek?: { year: number; week: number };
      prefilledData?: {
        shift_type?: number;
        date?: string;
        start_time?: string;
        end_time?: string;
      };
    }
  ) {
    // Calculate current week directly in constructor
    if (data.currentWeek) {
      this.currentYear = data.currentWeek.year;
      this.currentWeek = data.currentWeek.week;
    } else {
      const today = new Date();
      const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      
      this.currentYear = d.getUTCFullYear();
      this.currentWeek = weekNo;
    }

    // Determine weekday checkboxes based on prefilled date
    let weekdayDefaults: any = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    };

    if (data.prefilledData?.date) {
      const selectedDate = new Date(data.prefilledData.date);
      const dayOfWeek = selectedDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      weekdayDefaults[dayNames[dayOfWeek]] = true;
    }

    // Create form with calculated values
    this.form = this.fb.group({
      year: [this.currentYear, [Validators.required, Validators.min(2020), Validators.max(2030)]],
      week: [this.currentWeek, [Validators.required, Validators.min(1), Validators.max(53)]],
      monday: [weekdayDefaults.monday],
      tuesday: [weekdayDefaults.tuesday],
      wednesday: [weekdayDefaults.wednesday],
      thursday: [weekdayDefaults.thursday],
      friday: [weekdayDefaults.friday],
      saturday: [weekdayDefaults.saturday],
      sunday: [weekdayDefaults.sunday],
      shift_type: [data.prefilledData?.shift_type || null, Validators.required],
      employees: [[], Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
  }

  getWeekNumber(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  }

  getDateFromWeek(year: number, week: number, day: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    
    if (dayOfWeek <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    
    ISOweekStart.setDate(ISOweekStart.getDate() + (day - 1));
    return ISOweekStart;
  }

  getWeekRange(): string {
    const year = this.form.get('year')?.value;
    const week = this.form.get('week')?.value;
    
    if (!year || !week) return '';
    
    const monday = this.getDateFromWeek(year, week, 1);
    const sunday = this.getDateFromWeek(year, week, 7);
    
    return `${this.dateUtils.formatDateDE(monday)} - ${this.dateUtils.formatDateDE(sunday)}`;
  }

  getSelectedDays(): number[] {
    const days: number[] = [];
    if (this.form.get('monday')?.value === true) days.push(1);
    if (this.form.get('tuesday')?.value === true) days.push(2);
    if (this.form.get('wednesday')?.value === true) days.push(3);
    if (this.form.get('thursday')?.value === true) days.push(4);
    if (this.form.get('friday')?.value === true) days.push(5);
    if (this.form.get('saturday')?.value === true) days.push(6);
    if (this.form.get('sunday')?.value === true) days.push(7);
    return days;
  }

  getShiftCount(): number {
    const selectedDays = this.getSelectedDays().length;
    const selectedEmployees = this.form.get('employees')?.value?.length || 0;
    return selectedDays * selectedEmployees;
  }

  isFormValid(): boolean {
    const hasShiftType = !!this.form.get('shift_type')?.value;
    const hasEmployees = (this.form.get('employees')?.value?.length || 0) > 0;
    const hasDays = this.getSelectedDays().length > 0;
    const hasValidWeek = (this.form.get('year')?.valid === true) && (this.form.get('week')?.valid === true);
    
    return hasShiftType && hasEmployees && hasDays && hasValidWeek;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.isFormValid()) {
      const year = this.form.get('year')?.value;
      const week = this.form.get('week')?.value;
      const selectedDays = this.getSelectedDays();
      const employees = this.form.get('employees')?.value;
      const shift_type = this.form.get('shift_type')?.value;
      const notes = this.form.get('notes')?.value;

      const shiftType = this.data.shiftTypes.find(st => st.id === shift_type);
      const existingShifts = this.data.existingShifts || [];
      
      const shifts = [];
      
      for (const day of selectedDays) {
        const date = this.getDateFromWeek(year, week, day);
        const dateStr = this.dateUtils.formatDateISO(date);
        
        for (const employeeId of employees) {
          // Prüfe ob Mitarbeiter bereits am selben Tag eingeteilt ist
          const hasExistingShift = existingShifts.some(s => 
            s.employee === employeeId && 
            s.date === dateStr
          );
          
          // Überspringe diesen Mitarbeiter für diesen Tag, wenn bereits eingeteilt
          if (hasExistingShift) {
            continue;
          }
          
          shifts.push({
            date: dateStr,
            shift_type: shift_type,
            employee: employeeId,
            start_time: shiftType?.start_time || '09:00',
            end_time: shiftType?.end_time || '17:00',
            status: 'draft',
            notes: notes
          });
        }
      }

      this.dialogRef.close(shifts);
    }
  }
}
