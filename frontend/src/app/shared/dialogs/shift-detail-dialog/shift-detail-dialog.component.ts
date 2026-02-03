import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Shift } from '../../../core/models';

@Component({
  selector: 'app-shift-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './shift-detail-dialog.component.html',
  styleUrls: ['./shift-detail-dialog.component.scss']
})
export class ShiftDetailDialogComponent {
  shift: Shift;

  constructor(
    public dialogRef: MatDialogRef<ShiftDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { shift: Shift }
  ) {
    this.shift = data.shift;
  }

  onEdit(): void {
    this.dialogRef.close({ action: 'edit', shift: this.shift });
  }

  getEmploymentTypeLabel(type: string): string {
    const labels: any = {
      'fulltime': 'Vollzeit',
      'parttime': 'Teilzeit',
      'minijob': 'Minijob',
      'werkstudent': 'Werkstudent',
      'apprentice': 'Ausbildung'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'draft': 'Entwurf',
      'published': 'Veröffentlicht',
      'completed': 'Abgeschlossen'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: any = {
      'draft': 'edit',
      'published': 'check_circle',
      'completed': 'done_all'
    };
    return icons[status] || 'help';
  }
}
