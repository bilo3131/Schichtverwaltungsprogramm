import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Qualification } from '../../../core/models/employee.model';

@Component({
  selector: 'app-qualification-info-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './qualification-info-dialog.component.html',
  styleUrls: ['./qualification-info-dialog.component.scss']
})
export class QualificationInfoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<QualificationInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { qualification: Qualification }
  ) {}

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', qualification: this.data.qualification });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
