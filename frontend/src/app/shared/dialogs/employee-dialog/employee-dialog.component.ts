import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { Employee, Qualification, Department } from '../../../core/models';
import { EmployeeService } from '../../../core/services/employee.service';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';
import { DateUtilsService } from '../../../core/services/date-utils.service';

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  hr: 4,
  department_manager: 3,
  team_leader: 2,
  group_leader: 2,
  employee: 1
};

// Permission Helper Functions
class EmployeePermissions {
  static readonly ADMIN_ROLES = ['admin', 'hr'];
  static readonly MANAGER_ROLES = ['admin', 'hr', 'department_manager'];
  static readonly SUPERVISOR_ROLES = [...this.MANAGER_ROLES, 'team_leader', 'group_leader'];

  static canEditWorkingHours(userRole: string): boolean {
    return this.ADMIN_ROLES.includes(userRole);
  }

  static canEditRole(userRole: string): boolean {
    return this.ADMIN_ROLES.includes(userRole);
  }

  static canEditAllFields(userRole: string): boolean {
    return this.ADMIN_ROLES.includes(userRole);
  }
}

@Component({
  selector: 'app-employee-dialog',
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
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './employee-dialog.component.html',
  styleUrls: ['./employee-dialog.component.scss']
})
export class EmployeeDialogComponent {
  employeeForm: FormGroup;
  qualifications: Qualification[] = [];
  filteredQualifications: Qualification[] = [];
  departments: Department[] = [];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private authService: AuthService,
    private dateUtils: DateUtilsService,
    public dialogRef: MatDialogRef<EmployeeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee?: Employee }
  ) {
    const user = data.employee?.user_details || {};
    const today = new Date().toISOString().split('T')[0];
    
    // Überstunden in Stunden und Minuten aufteilen
    const overtimeHours = data.employee?.overtime_hours || 0;
    const overtimeH = Math.floor(Math.abs(overtimeHours));
    const overtimeMin = Math.round((Math.abs(overtimeHours) - overtimeH) * 60);
    const overtimeSign = overtimeHours < 0 ? -1 : 1;
    
    this.employeeForm = this.fb.group({
      first_name: [user.first_name || '', Validators.required],
      last_name: [user.last_name || '', Validators.required],
      email: [user.email || '', [Validators.required, Validators.email]],
      department: [data.employee?.department || null, Validators.required],
      employment_type: [data.employee?.employment_type || '', Validators.required],
      role: [data.employee?.user_details?.role || 'employee'],
      min_hours_per_week: [data.employee?.min_hours_per_week || 0, Validators.min(0)],
      max_hours_per_week: [data.employee?.max_hours_per_week || 40, [Validators.min(0), Validators.max(60)]],
      qualifications: [data.employee?.qualifications || []],
      hire_date: [data.employee?.hire_date || today, Validators.required],
      overtime_hours_h: [overtimeH * overtimeSign],
      overtime_hours_min: [overtimeMin, [Validators.min(0), Validators.max(59)]],
      notes: [data.employee?.notes || '']
    });
    
    this.loadQualifications();
    this.loadDepartments();
    
    // Reagiere auf Abteilungsänderungen und filtere Qualifikationen
    this.employeeForm.get('department')?.valueChanges.subscribe(departmentId => {
      this.filterQualifications(departmentId);
      // Entferne Qualifikationen, die nicht mehr zur neuen Abteilung gehören
      const currentQuals = this.employeeForm.get('qualifications')?.value || [];
      const validQuals = currentQuals.filter((qualId: number) => 
        this.filteredQualifications.some(q => q.id === qualId)
      );
      this.employeeForm.get('qualifications')?.setValue(validQuals);
    });
    
    if (!this.canEditRole()) {
      this.employeeForm.get('role')?.disable();
    }
    if (!this.canEditWorkingHours()) {
      this.employeeForm.get('min_hours_per_week')?.disable();
      this.employeeForm.get('max_hours_per_week')?.disable();
      this.employeeForm.get('overtime_hours_h')?.disable();
      this.employeeForm.get('overtime_hours_min')?.disable();
    }
    
    const currentUser = this.authService.currentUserValue;
    
    if (!this.canEditEmployee()) {
      Object.keys(this.employeeForm.controls).forEach(key => {
        this.employeeForm.get(key)?.disable();
      });
    } else if (currentUser && !this.canEditAllFields()) {
      Object.keys(this.employeeForm.controls).forEach(key => {
        if (key !== 'qualifications' && key !== 'notes') {
          this.employeeForm.get(key)?.disable();
        }
      });
    }
  }
  
  loadQualifications(): void {
    this.employeeService.getQualifications().subscribe({
      next: (data) => {
        this.qualifications = data.results || data;
        // Initiale Filterung basierend auf aktueller Abteilung
        const departmentId = this.employeeForm.get('department')?.value;
        this.filterQualifications(departmentId);
      },
      error: (error) => {
        console.error('Error loading qualifications:', error);
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

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.employeeForm.valid) {
      // Verwende getRawValue() um auch disabled Felder zu erhalten
      const formValue = { ...this.employeeForm.getRawValue() };
      
      // Konvertiere Überstunden von Stunden+Minuten zu Dezimalstunden
      const overtimeH = formValue.overtime_hours_h || 0;
      const overtimeMin = formValue.overtime_hours_min || 0;
      // Runde auf 2 Dezimalstellen für Backend (DecimalField mit decimal_places=2)
      formValue.overtime_hours = Math.round((overtimeH + (overtimeMin / 60)) * 100) / 100;
      
      // Entferne die temporären Felder
      delete formValue.overtime_hours_h;
      delete formValue.overtime_hours_min;
      
      // Konvertiere Datum zu YYYY-MM-DD Format
      if (formValue.hire_date instanceof Date) {
        formValue.hire_date = this.dateUtils.formatDateISO(formValue.hire_date);
      }
      
      this.dialogRef.close(formValue);
    }
  }
  onDelete(): void {
    this.dialogRef.close({ delete: true });
  }

  canEditEmployee(): boolean {
    const user = this.authService.currentUserValue;
    if (!user) return false;
    if (!this.data.employee) return true;
    
    const employeeRole = this.data.employee.user_details?.role || 'employee';
    const isOwnProfile = user.employee_profile?.id === this.data.employee.id;
    
    if (EmployeePermissions.ADMIN_ROLES.includes(user.role)) return true;
    
    if (user.role === 'department_manager') {
      return ['team_leader', 'group_leader', 'employee'].includes(employeeRole) || isOwnProfile;
    }
    
    if (['team_leader', 'group_leader'].includes(user.role)) {
      return employeeRole === 'employee' || isOwnProfile;
    }
    
    return false;
  }

  isLimitedEdit(): boolean {
    return !this.canEditEmployee();
  }

  canEditWorkingHours(): boolean {
    const user = this.authService.currentUserValue;
    return user ? EmployeePermissions.canEditWorkingHours(user.role) : false;
  }

  canEditRole(): boolean {
    const user = this.authService.currentUserValue;
    return user ? EmployeePermissions.canEditRole(user.role) : false;
  }

  canEditAllFields(): boolean {
    const user = this.authService.currentUserValue;
    return user ? EmployeePermissions.canEditAllFields(user.role) : false;
  }

  canEditQualifications(): boolean {
    const user = this.authService.currentUserValue;
    if (!user || !this.data.employee) return false;
    
    if (EmployeePermissions.ADMIN_ROLES.includes(user.role)) return true;
    
    const employeeRole = this.data.employee.user_details?.role || 'employee';
    const isOwnProfile = user.employee_profile?.id === this.data.employee.id;
    
    if (user.role === 'department_manager') {
      return ['team_leader', 'group_leader', 'employee'].includes(employeeRole) || isOwnProfile;
    }
    
    if (['team_leader', 'group_leader'].includes(user.role)) {
      return employeeRole === 'employee' || isOwnProfile;
    }
    
    return false;
  }

  // Hilfsmethoden für die Anzeige
  getQualificationNames(): string {
    const selectedIds = this.employeeForm.get('qualifications')?.value || [];
    return this.qualifications
      .filter(q => selectedIds.includes(q.id))
      .map(q => q.name)
      .join(', ') || 'Keine';
  }

  getDepartmentName(): string {
    const deptId = this.employeeForm.get('department')?.value;
    return this.departments.find(d => d.id === deptId)?.name || 'Keine Abteilung';
  }

  getEmploymentTypeName(): string {
    const type = this.employeeForm.get('employment_type')?.value;
    const typeMap: Record<string, string> = {
      'fulltime': 'Vollzeit',
      'parttime': 'Teilzeit',
      'minijob': 'Minijob',
      'werkstudent': 'Werkstudent',
      'apprentice': 'Ausbildung'
    };
    return typeMap[type] || type;
  }

  getRoleName(): string {
    const role = this.employeeForm.get('role')?.value;
    const roleMap: Record<string, string> = {
      'employee': 'Mitarbeiter',
      'group_leader': 'Gruppenleiter',
      'team_leader': 'Teamleiter',
      'department_manager': 'Abteilungsleiter',
      'hr': 'Personalwesen',
      'admin': 'Administrator'
    };
    return roleMap[role] || role;
  }
}
