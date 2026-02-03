import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ShiftType } from '../../../core/models';

@Component({
  selector: 'app-shift-type-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './shift-type-detail-dialog.component.html',
  styleUrls: ['./shift-type-detail-dialog.component.scss']
})
export class ShiftTypeDetailDialogComponent {
  shiftType: ShiftType;

  constructor(
    public dialogRef: MatDialogRef<ShiftTypeDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { shiftType: ShiftType }
  ) {
    this.shiftType = data.shiftType;
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', shiftType: this.shiftType });
  }

  calculateDuration(): string {
    const start = this.shiftType.start_time.split(':');
    const end = this.shiftType.end_time.split(':');
    
    let startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    
    // Nachtschicht über Mitternacht
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (minutes === 0) {
      return `${hours}`;
    }
    return `${hours},${minutes.toString().padStart(2, '0')}`;
  }
}
