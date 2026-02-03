import { Component, Inject, LOCALE_ID, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, NativeDateAdapter, DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { Employee, AbsenceRecord } from '../../../core/models';

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
  selector: 'app-absence-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DE_DATE_FORMATS }
  ],
  templateUrl: './absence-dialog.component.html',
  styleUrls: ['./absence-dialog.component.scss']
})
export class AbsenceDialogComponent {
  absenceForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AbsenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { absence?: AbsenceRecord, employees: Employee[] }
  ) {
    this.absenceForm = this.fb.group({
      employee: [data.absence?.employee || '', Validators.required],
      absence_type: [data.absence?.absence_type || '', Validators.required],
      start_date: [data.absence?.start_date || '', Validators.required],
      end_date: [data.absence?.end_date || ''],
      notes: [data.absence?.notes || '']
    }, { validators: this.dateRangeValidator });
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
    if (this.absenceForm.valid) {
      const formValue = { ...this.absenceForm.value };
      
      // Format dates
      if (formValue.start_date instanceof Date) {
        formValue.start_date = this.formatDate(formValue.start_date);
      }
      if (formValue.end_date) {
        if (formValue.end_date instanceof Date) {
          formValue.end_date = this.formatDate(formValue.end_date);
        }
      } else {
        // Wenn kein Enddatum angegeben, entferne das Feld
        delete formValue.end_date;
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
