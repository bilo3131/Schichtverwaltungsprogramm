import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ShiftType, Department } from '../../../core/models';
import { DepartmentService } from '../../../core/services/department.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shift-type-dialog',
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
  templateUrl: './shift-type-dialog.component.html',
  styleUrls: ['./shift-type-dialog.component.scss']
})
export class ShiftTypeDialogComponent implements OnInit {
  shiftTypeForm: FormGroup;
  departments: Department[] = [];
  qualifications: any[] = [];
  filteredQualifications: any[] = [];
  isDepartmentManager = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    public dialogRef: MatDialogRef<ShiftTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { shiftType?: ShiftType }
  ) {
    const currentUser = this.authService.currentUserValue;
    this.isDepartmentManager = currentUser?.role === 'department_manager';
    
    // Für department_manager: Setze automatisch die eigene Abteilung (nur die ID!)
    let defaultDepartment = data.shiftType?.department || null;
    if (this.isDepartmentManager && currentUser?.employee_profile?.department) {
      // Extrahiere nur die ID, falls department ein Objekt ist
      const dept: any = currentUser.employee_profile.department;
      defaultDepartment = typeof dept === 'object' && dept !== null ? dept.id : dept;
    }
    
    this.shiftTypeForm = this.fb.group({
      name: [data.shiftType?.name || '', Validators.required],
      department: [defaultDepartment, Validators.required],
      required_qualifications: [data.shiftType?.required_qualifications || []],
      start_time: [data.shiftType?.start_time || '', Validators.required],
      end_time: [data.shiftType?.end_time || '', Validators.required],
      color: [data.shiftType?.color || '#1976d2', Validators.pattern(/^#[0-9A-Fa-f]{6}$/)],
      min_employees: [data.shiftType?.min_employees || 1, [Validators.required, Validators.min(1)]],
      break_duration: [data.shiftType?.break_duration || 0, Validators.min(0)],
      works_on_saturday: [data.shiftType?.works_on_saturday || false],
      works_on_sunday: [data.shiftType?.works_on_sunday || false]
    });
    
    // Deaktiviere Abteilungsfeld für department_manager
    if (this.isDepartmentManager) {
      this.shiftTypeForm.get('department')?.disable();
    }
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadQualifications();
    
    // Reagiere auf Abteilungsänderungen und filtere Qualifikationen
    this.shiftTypeForm.get('department')?.valueChanges.subscribe(departmentId => {
      this.filterQualifications(departmentId);
      // Entferne Qualifikationen, die nicht mehr zur neuen Abteilung gehören
      const currentQuals = this.shiftTypeForm.get('required_qualifications')?.value || [];
      const validQuals = currentQuals.filter((qualId: number) => 
        this.filteredQualifications.some(q => q.id === qualId)
      );
      this.shiftTypeForm.get('required_qualifications')?.setValue(validQuals);
    });
    
    // Automatische Pausenberechnung bei Änderung der Start- oder Endzeit
    this.shiftTypeForm.get('start_time')?.valueChanges.subscribe(() => this.calculateAutomaticBreak());
    this.shiftTypeForm.get('end_time')?.valueChanges.subscribe(() => this.calculateAutomaticBreak());
  }
  
  calculateAutomaticBreak(): void {
    const startTime = this.shiftTypeForm.get('start_time')?.value;
    const endTime = this.shiftTypeForm.get('end_time')?.value;
    const currentBreak = this.shiftTypeForm.get('break_duration')?.value || 0;
    
    if (!startTime || !endTime) return;
    
    // Berechne Schichtdauer
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (minutes < 0) {
      hours--;
      minutes += 60;
    }
    
    if (hours < 0) {
      hours += 24;
    }
    
    const totalHours = hours + (minutes / 60);
    
    // Berechne empfohlene Pause
    let recommendedBreak = 0;
    if (totalHours > 9) {
      recommendedBreak = 45;
    } else if (totalHours > 6) {
      recommendedBreak = 30;
    }
    
    // Setze nur wenn aktueller Wert kleiner als empfohlen ist
    if (currentBreak < recommendedBreak) {
      this.shiftTypeForm.patchValue({ break_duration: recommendedBreak }, { emitEvent: false });
    }
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
      }
    });
  }

  loadQualifications(): void {
    this.employeeService.getQualifications().subscribe({
      next: (data) => {
        this.qualifications = data.results || data;
        // Initiale Filterung basierend auf aktueller Abteilung
        const departmentId = this.shiftTypeForm.get('department')?.value;
        this.filterQualifications(departmentId);
      }
    });
  }

  filterQualifications(departmentId: number | null): void {
    if (!departmentId) {
      // Zeige Qualifikationen ohne Abteilung oder alle
      this.filteredQualifications = this.qualifications.filter(q => !q.department);
    } else {
      // Zeige nur Qualifikationen der ausgewählten Abteilung und solche ohne Abteilung
      this.filteredQualifications = this.qualifications.filter(q => 
        q.department === departmentId || !q.department
      );
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onColorChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.shiftTypeForm.patchValue({ color: input.value });
  }

  onSave(): void {
    if (this.shiftTypeForm.valid) {
      // Für department_manager: Füge die deaktivierte Abteilung explizit hinzu
      const formValue = this.shiftTypeForm.getRawValue(); // getRawValue() inkludiert deaktivierte Felder
      this.dialogRef.close(formValue);
    }
  }
}
