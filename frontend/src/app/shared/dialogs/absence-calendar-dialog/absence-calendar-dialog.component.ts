import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { AbsenceRecord } from '../../../core/models';

@Component({
  selector: 'app-absence-calendar-dialog',
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
  templateUrl: './absence-calendar-dialog.component.html',
  styleUrls: ['./absence-calendar-dialog.component.scss']
})
export class AbsenceCalendarDialogComponent {
  selectedDates: Date[] = [];
  workDays: number = 0;
  startAt: Date;

  constructor(
    public dialogRef: MatDialogRef<AbsenceCalendarDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { absence: AbsenceRecord }
  ) {
    this.startAt = new Date(this.data.absence.start_date);
    this.calculateAbsenceDates();
  }

  calculateAbsenceDates(): void {
    const start = new Date(this.data.absence.start_date);
    const end = new Date(this.data.absence.end_date);
    
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
    const isAbsenceDate = this.selectedDates.some(d => d.getTime() === time);
    if (isAbsenceDate) {
      // Inject dynamic style for this absence type color
      const color = this.getAbsenceColor(this.data.absence.absence_type);
      this.injectAbsenceDateStyle(color);
      return 'absence-date';
    }
    return '';
  };

  private injectAbsenceDateStyle(color: string): void {
    const styleId = 'absence-date-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    const styleElement = document.getElementById(styleId) as HTMLStyleElement;
    if (styleElement) {
      styleElement.textContent = `
        .absence-date {
          background-color: ${color} !important;
        }
        .absence-date::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 8px;
          box-shadow: 0 0 0 2px ${color};
          filter: brightness(0.8);
        }
      `;
    }
  }

  getAbsenceTypeLabel(type: string): string {
    switch (type) {
      case 'sick': return 'Krankheit';
      case 'vacation': return 'Urlaub';
      case 'vacation_wish': return 'Urlaubswunsch';
      case 'kug': return 'Kurzarbeit';
      case 'other': return 'Sonstiges';
      default: return type;
    }
  }

  getAbsenceTypeIcon(type: string): string {
    switch (type) {
      case 'sick': return 'medical_services';
      case 'vacation': return 'beach_access';
      case 'vacation_wish': return 'event_available';
      case 'kug': return 'work_history';
      case 'other': return 'event_busy';
      default: return 'event_busy';
    }
  }

  getAbsenceTypeColor(type: string): 'warn' | 'primary' | 'accent' | undefined {
    switch (type) {
      case 'sick': return 'warn';
      case 'vacation': return 'primary';
      case 'vacation_wish': return 'accent';
      case 'kug': return 'accent';
      case 'other': return undefined;
      default: return undefined;
    }
  }

  getAbsenceColor(type: string): string {
    switch (type) {
      case 'sick': return '#f44336';
      case 'vacation': return '#2196F3';
      case 'vacation_wish': return '#FF9800';
      case 'kug': return '#9C27B0';
      case 'other': return '#607D8B';
      default: return '#607D8B';
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
