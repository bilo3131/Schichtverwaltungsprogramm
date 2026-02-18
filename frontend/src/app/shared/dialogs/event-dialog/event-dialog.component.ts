import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import type { Event, EventType, Employee, Department } from '../../../core/models';
import { DateUtilsService } from '../../../core/services/date-utils.service';

export interface EventDialogData {
  event?: Event;
  employees: Employee[];
  departments: Department[];
  initialDate?: Date;
  initialStartTime?: string;
  initialEndTime?: string;
  currentUserId?: number;
}

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './event-dialog.component.html',
  styleUrl: './event-dialog.component.scss'
})
export class EventDialogComponent implements OnInit {
  eventForm: FormGroup;
  loading = false;
  employeeSearchTerm = '';
  filteredEmployees: Employee[] = [];
  selectedDepartments: number[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EventDialogComponent>,
    private dateUtils: DateUtilsService,
    @Inject(MAT_DIALOG_DATA) public data: EventDialogData
  ) {
    const now = new Date();
    const startDate = data.initialDate || now;
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    this.eventForm = this.fb.group({
      title: [data.event?.title || '', Validators.required],
      description: [data.event?.description || ''],
      event_type: [data.event?.event_type || 'meeting', Validators.required],
      start_date: [data.event ? new Date(data.event.start_datetime) : startDate, Validators.required],
      start_time: [data.initialStartTime || (data.event ? this.extractTime(data.event.start_datetime) : this.dateUtils.formatTimeForInput(now)), Validators.required],
      end_date: [data.event ? new Date(data.event.end_datetime) : endDate, Validators.required],
      end_time: [data.initialEndTime || (data.event ? this.extractTime(data.event.end_datetime) : this.dateUtils.formatTimeForInput(endDate)), Validators.required],
      location: [data.event?.location || ''],
      is_all_day: [data.event?.is_all_day || false],
      editable_by_attendees: [data.event?.editable_by_attendees || false],
      attendees: [data.event?.attendees || (data.currentUserId ? [data.currentUserId] : [])]
    });

    // Toggle time fields based on is_all_day
    this.eventForm.get('is_all_day')?.valueChanges.subscribe(isAllDay => {
      if (isAllDay) {
        this.eventForm.get('start_time')?.clearValidators();
        this.eventForm.get('end_time')?.clearValidators();
      } else {
        this.eventForm.get('start_time')?.setValidators([Validators.required]);
        this.eventForm.get('end_time')?.setValidators([Validators.required]);
      }
      this.eventForm.get('start_time')?.updateValueAndValidity();
      this.eventForm.get('end_time')?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.filteredEmployees = [...this.data.employees];
  }

  private extractTime(datetime: string): string {
    return this.dateUtils.extractTime(datetime);
  }

  private combineDateAndTime(date: Date, time: string): string {
    return this.dateUtils.combineDateAndTime(date, time);
  }

  onSave(): void {
    if (this.eventForm.valid) {
      const formValue = this.eventForm.value;
      
      let start_datetime: string;
      let end_datetime: string;

      if (formValue.is_all_day) {
        // For all-day events, use start of day
        const startDate = new Date(formValue.start_date);
        startDate.setHours(0, 0, 0, 0);
        start_datetime = startDate.toISOString();

        const endDate = new Date(formValue.end_date);
        endDate.setHours(23, 59, 59, 999);
        end_datetime = endDate.toISOString();
      } else {
        start_datetime = this.combineDateAndTime(formValue.start_date, formValue.start_time);
        end_datetime = this.combineDateAndTime(formValue.end_date, formValue.end_time);
      }

      const eventData = {
        title: formValue.title,
        description: formValue.description,
        event_type: formValue.event_type,
        start_datetime,
        end_datetime,
        location: formValue.location,
        is_all_day: formValue.is_all_day,
        editable_by_attendees: formValue.editable_by_attendees,
        attendees: formValue.attendees
      };

      this.dialogRef.close(eventData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  addDepartmentEmployees(departmentIds: number[] | null): void {
    if (!departmentIds || departmentIds.length === 0) {
      return;
    }

    // Finde alle Mitarbeiter dieser Abteilungen
    const departmentEmployees = this.data.employees
      .filter(emp => emp.department && departmentIds.includes(emp.department))
      .map(emp => emp.id);

    // Hole aktuelle Teilnehmer
    const currentAttendees = this.eventForm.get('attendees')?.value || [];

    // Füge neue Mitarbeiter hinzu (ohne Duplikate)
    const updatedAttendees = [...new Set([...currentAttendees, ...departmentEmployees])];

    // Update Form
    this.eventForm.get('attendees')?.setValue(updatedAttendees);
  }

  getSelectedEmployeesCount(): number {
    const attendees = this.eventForm.get('attendees')?.value || [];
    return attendees.length;
  }

  filterEmployees(): void {
    const searchTerm = this.employeeSearchTerm.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredEmployees = [...this.data.employees];
      return;
    }

    this.filteredEmployees = this.data.employees.filter(emp => {
      const fullName = emp.full_name.toLowerCase();
      const department = emp.department_details?.name?.toLowerCase() || '';
      return fullName.includes(searchTerm) || department.includes(searchTerm);
    });
  }

  toggleAllDepartments(event: MouseEvent): void {
    event.stopPropagation();
    
    const allDepartmentIds = this.data.departments.map(d => d.id);
    
    // Check if all departments are already selected
    const allSelected = allDepartmentIds.every(id => this.selectedDepartments.includes(id));
    
    if (allSelected) {
      // Deselect all
      this.selectedDepartments = [];
    } else {
      // Select all
      this.selectedDepartments = [...allDepartmentIds];
    }
    
    // Add employees from selected departments
    this.addDepartmentEmployees(this.selectedDepartments);
  }

  clearAllAttendees(event: MouseEvent): void {
    event.stopPropagation();
    
    const allEmployeeIds = this.data.employees.map(emp => emp.id);
    const currentAttendees = this.eventForm.get('attendees')?.value || [];
    
    // Check if all employees are already selected
    const allSelected = allEmployeeIds.every(id => currentAttendees.includes(id));
    
    if (allSelected) {
      // Deselect all
      this.eventForm.patchValue({ attendees: [] });
    } else {
      // Select all
      this.eventForm.patchValue({ attendees: allEmployeeIds });
    }
  }
  
  // Alias für einheitliche Benennung
  toggleAllAttendees(event: MouseEvent): void {
    this.clearAllAttendees(event);
  }
}
