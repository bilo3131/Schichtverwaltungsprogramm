import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Department } from '../../../core/models/employee.model';

@Component({
  selector: 'app-department-info-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './department-info-dialog.component.html',
  styleUrls: ['./department-info-dialog.component.scss']
})
export class DepartmentInfoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DepartmentInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { department: Department }
  ) {}

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', department: this.data.department });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
