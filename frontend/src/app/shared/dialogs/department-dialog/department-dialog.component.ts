import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Department } from '../../../core/models/employee.model';

@Component({
  selector: 'app-department-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './department-dialog.component.html',
  styleUrls: ['./department-dialog.component.scss']
})
export class DepartmentDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DepartmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { department?: Department }
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data.department?.name || '', Validators.required],
      description: [this.data.department?.description || '']
    });
  }

  onSave(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
