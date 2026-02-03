import { Component, Inject, OnInit, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule, MAT_DATE_LOCALE, NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { VacationRequest, Employee } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';

export const DE_DATE_FORMATS = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Injectable()
class CustomDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'DD.MM.YYYY') {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${this._to2digit(day)}.${this._to2digit(month)}.${year}`;
    }
    return date.toDateString();
  }

  private _to2digit(n: number) {
    return ('00' + n).slice(-2);
  }
}

@Component({
  selector: 'app-vacation-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DE_DATE_FORMATS }
  ],
  templateUrl: './vacation-request-dialog.component.html',
  styleUrls: ['./vacation-request-dialog.component.scss']
})
export class VacationRequestDialogComponent implements OnInit {
  vacationForm: FormGroup;
  employees: Employee[] = [];
  isSupervisor = false;
  existingRequests: VacationRequest[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private employeeService: EmployeeService,
    public dialogRef: MatDialogRef<VacationRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { vacation?: VacationRequest; existingRequests?: VacationRequest[] } = {}
  ) {
    this.isSupervisor = this.authService.isSupervisor;
    this.existingRequests = data?.existingRequests || [];
    
    this.vacationForm = this.fb.group({
      start_date: [data?.vacation?.start_date || '', Validators.required],
      end_date: [data?.vacation?.end_date || '', Validators.required],
      notes: [data?.vacation?.notes || '']
    }, { validators: this.dateRangeValidator });

    // Employee-Feld nur für Vorgesetzte hinzufügen
    if (this.isSupervisor) {
      this.vacationForm.addControl('employee', this.fb.control(data?.vacation?.employee || '', Validators.required));
    }
  }

  ngOnInit(): void {
    if (this.isSupervisor) {
      this.loadEmployees();
    }
  }

  loadEmployees(): void {
    this.employeeService.getEmployees().subscribe({
      next: (response) => {
        const allEmployees = response.results || response;
        const currentUserRole = this.authService.currentUserValue?.role;
        
        // Admin und HR sehen alle Mitarbeiter, andere nur Mitarbeiter mit Rolle 'employee'
        if (currentUserRole === 'admin' || currentUserRole === 'hr') {
          this.employees = allEmployees;
        } else {
          // Nur Mitarbeiter mit der Rolle 'employee' anzeigen
          this.employees = allEmployees.filter((emp: Employee) => emp.user_details?.role === 'employee');
        }
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      }
    });
  }

  dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('start_date')?.value;
    const endDate = control.get('end_date')?.value;
    
    if (startDate && endDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);
      
      if (start > end) {
        return { dateRange: true };
      }
    }
    
    return null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.vacationForm.valid) {
      const formValue = { ...this.vacationForm.value };
      
      // Format dates
      let startDate: Date;
      let endDate: Date;
      
      if (formValue.start_date instanceof Date) {
        startDate = new Date(formValue.start_date);
        startDate.setHours(0, 0, 0, 0);
        formValue.start_date = this.formatDate(formValue.start_date);
      } else {
        startDate = new Date(formValue.start_date);
        startDate.setHours(0, 0, 0, 0);
      }
      
      if (formValue.end_date instanceof Date) {
        endDate = new Date(formValue.end_date);
        endDate.setHours(0, 0, 0, 0);
        formValue.end_date = this.formatDate(formValue.end_date);
      } else {
        endDate = new Date(formValue.end_date);
        endDate.setHours(0, 0, 0, 0);
      }
      
      // Prüfe auf Überlappungen mit bestehenden Urlaubsanträgen
      const employeeId = this.isSupervisor 
        ? formValue.employee 
        : this.authService.currentUserValue?.employee_profile?.id;
      const currentRequestId = this.data?.vacation?.id;
      
      const hasOverlap = this.existingRequests.some(request => {
        // Ignoriere den aktuellen Request bei der Bearbeitung
        if (currentRequestId && request.id === currentRequestId) {
          return false;
        }
        
        // Nur Anträge des gleichen Mitarbeiters prüfen
        if (request.employee !== employeeId) {
          return false;
        }
        
        // Nur pending und approved Anträge prüfen
        if (request.status !== 'pending' && request.status !== 'approved') {
          return false;
        }
        
        const reqStart = new Date(request.start_date);
        const reqEnd = new Date(request.end_date);
        reqStart.setHours(0, 0, 0, 0);
        reqEnd.setHours(0, 0, 0, 0);
        
        // Prüfe auf Überlappung
        const overlaps = (startDate <= reqEnd && endDate >= reqStart);
        
        return overlaps;
      });
      
      if (hasOverlap) {
        // Setze einen benutzerdefinierten Fehler
        this.vacationForm.setErrors({ overlap: true });
        return;
      }
      
      this.dialogRef.close(formValue);
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
