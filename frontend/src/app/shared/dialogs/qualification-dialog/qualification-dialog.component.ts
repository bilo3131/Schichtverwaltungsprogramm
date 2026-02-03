import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Qualification, Department } from '../../../core/models';
import { DepartmentService } from '../../../core/services/department.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-qualification-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './qualification-dialog.component.html',
  styleUrls: ['./qualification-dialog.component.scss']
})
export class QualificationDialogComponent implements OnInit {
  qualificationForm: FormGroup;
  departments: Department[] = [];
  canEditDepartment = false;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private authService: AuthService,
    public dialogRef: MatDialogRef<QualificationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { qualification?: Qualification }
  ) {
    // Prüfe ob Benutzer die Abteilung bearbeiten darf (nur Admin oder HR)
    const user = this.authService.currentUserValue;
    this.canEditDepartment = ['admin', 'hr'].includes(user?.role || '');
    
    // Für andere Rollen: Setze automatisch die Abteilung des Benutzers
    let defaultDepartment = data.qualification?.department || null;
    if (!this.canEditDepartment && user?.employee_profile?.department) {
      defaultDepartment = user.employee_profile.department;
    }
    
    this.qualificationForm = this.fb.group({
      department: [defaultDepartment],
      name: [data.qualification?.name || '', Validators.required],
      description: [data.qualification?.description || '']
    });
    
    // Disable department field if user cannot edit it
    if (!this.canEditDepartment) {
      this.qualificationForm.get('department')?.disable();
    }
  }

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (response) => {
        this.departments = response.results || response;
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
    if (this.qualificationForm.valid) {
      this.dialogRef.close(this.qualificationForm.value);
    }
  }
}
