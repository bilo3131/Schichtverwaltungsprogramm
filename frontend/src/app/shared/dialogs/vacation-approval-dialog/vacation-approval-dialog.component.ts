import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { VacationRequest } from '../../../core/models';

@Component({
  selector: 'app-vacation-approval-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './vacation-approval-dialog.component.html',
  styleUrls: ['./vacation-approval-dialog.component.scss']
})
export class VacationApprovalDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<VacationApprovalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      request: VacationRequest, 
      action: 'approve' | 'reject' 
    }
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
