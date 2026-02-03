import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { VacationRequest } from '../../../core/models';

@Component({
  selector: 'app-vacation-calendar-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatDatepickerModule,
    MatCardModule,
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './vacation-calendar-dialog.component.html',
  styleUrls: ['./vacation-calendar-dialog.component.scss']
})
export class VacationCalendarDialogComponent {
  selectedDates: Date[] = [];
  workDays: number = 0;
  startAt: Date;

  constructor(
    public dialogRef: MatDialogRef<VacationCalendarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { vacation: VacationRequest }
  ) {
    this.startAt = new Date(this.data.vacation.start_date);
    this.calculateVacationDates();
  }

  calculateVacationDates(): void {
    const start = new Date(this.data.vacation.start_date);
    const end = new Date(this.data.vacation.end_date);
    
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    
    while (current <= endDay) {
      const dayOfWeek = current.getDay();
      this.selectedDates.push(new Date(current));
      
      // Zähle nur Arbeitstage
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        this.workDays++;
      }
      
      current.setDate(current.getDate() + 1);
    }
  }

  dateClass = (date: Date): string => {
    const time = date.getTime();
    const isVacationDate = this.selectedDates.some(d => d.getTime() === time);
    return isVacationDate ? 'vacation-date' : '';
  };

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Genehmigt';
      case 'rejected': return 'Abgelehnt';
      case 'pending': return 'Ausstehend';
      default: return status;
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'approved': return 'check_circle';
      case 'rejected': return 'cancel';
      case 'pending': return 'schedule';
      default: return 'info';
    }
  }

  getStatusIconColor(status: string): 'primary' | 'warn' | 'accent' | undefined {
    switch (status) {
      case 'approved': return 'primary';
      case 'rejected': return 'warn';
      case 'pending': return 'accent';
      default: return undefined;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
