import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Event, Employee, Department } from '../../../core/models';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { DateUtilsService } from '../../../core/services/date-utils.service';

@Component({
  selector: 'app-event-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule
  ],
  template: `
    <div class="event-detail-dialog">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon [style.color]="getEventTypeColor()">event</mat-icon>
          {{ data.event.title }}
        </h2>
      </div>

      <mat-dialog-content>
        <div class="detail-section">
          <div class="detail-item">
            <mat-icon>category</mat-icon>
            <div class="detail-content">
              <span class="detail-label">Typ</span>
              <span class="detail-value">{{ getEventTypeLabel() }}</span>
            </div>
          </div>

          <div class="detail-item">
            <mat-icon>schedule</mat-icon>
            <div class="detail-content">
              <span class="detail-label">Zeitraum</span>
              <span class="detail-value">
                <span *ngIf="data.event.is_all_day">
                  {{ formatDate(data.event.start_datetime) }}
                  <span *ngIf="data.event.end_datetime && !isSameDay(data.event.start_datetime, data.event.end_datetime)">
                    - {{ formatDate(data.event.end_datetime) }}
                  </span>
                  (Ganztägig)
                </span>
                <span *ngIf="!data.event.is_all_day">
                  {{ formatDateTime(data.event.start_datetime) }}
                  - {{ formatDateTime(data.event.end_datetime) }}
                </span>
              </span>
            </div>
          </div>

          <div class="detail-item" *ngIf="data.event.location">
            <mat-icon>place</mat-icon>
            <div class="detail-content">
              <span class="detail-label">Ort</span>
              <span class="detail-value">{{ data.event.location }}</span>
            </div>
          </div>

          <div class="detail-item" *ngIf="data.event.description">
            <mat-icon>description</mat-icon>
            <div class="detail-content">
              <span class="detail-label">Beschreibung</span>
              <span class="detail-value description">{{ data.event.description }}</span>
            </div>
          </div>

          <mat-divider></mat-divider>

          <div class="detail-item" *ngIf="data.event.created_by_details">
            <mat-icon>person</mat-icon>
            <div class="detail-content">
              <span class="detail-label">Erstellt von</span>
              <span class="detail-value">{{ data.event.created_by_details.full_name }}</span>
            </div>
          </div>

          <div class="detail-item" *ngIf="data.event.attendees_details && data.event.attendees_details.length > 0">
            <mat-icon>group</mat-icon>
            <div class="detail-content">
              <span class="detail-label">Teilnehmer ({{ data.event.attendees_details.length }})</span>
              <div class="attendees-list">
                <mat-chip *ngFor="let attendee of data.event.attendees_details">
                  {{ attendee.full_name }}
                </mat-chip>
              </div>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onDelete()" color="warn" *ngIf="canEditOrDelete()">
          <mat-icon>delete</mat-icon>
          Löschen
        </button>
        <button mat-button mat-dialog-close>
          Schließen
        </button>
        <button mat-raised-button color="primary" (click)="onEdit()" *ngIf="canEditOrDelete()">
          <mat-icon>edit</mat-icon>
          Bearbeiten
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .event-detail-dialog {
      overflow-x: hidden;
      
      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;

        h2 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          overflow: hidden;
          word-wrap: break-word;
        }
      }

      mat-dialog-content {
        padding: 0 24px;
        max-height: 70vh;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .detail-section {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        overflow-x: hidden;
      }

      .detail-item {
        display: flex;
        gap: 1rem;
        align-items: flex-start;

        mat-icon {
          color: rgba(0, 0, 0, 0.54);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .detail-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          overflow-x: hidden;

          .detail-label {
            font-size: 0.75rem;
            color: rgba(0, 0, 0, 0.6);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .detail-value {
            font-size: 1rem;
            color: rgba(0, 0, 0, 0.87);
            word-wrap: break-word;
            overflow-wrap: break-word;

            &.description {
              white-space: pre-wrap;
              line-height: 1.5;
            }
          }

          .attendees-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.5rem;

            mat-chip {
              font-size: 0.875rem;
            }
          }
        }
      }

      mat-divider {
        margin: 0.5rem 0;
      }

      mat-dialog-actions {
        padding: 16px 24px;
        margin: 0;

        button {
          mat-icon {
            margin-right: 0.25rem;
          }
        }
      }
    }

    /* Dark Mode Unterstützung */
    :host-context(.dark-theme) .event-detail-dialog {
      .detail-item {
        mat-icon {
          color: rgba(255, 255, 255, 0.7);
        }

        .detail-content {
          .detail-label {
            color: rgba(255, 255, 255, 0.7);
          }

          .detail-value {
            color: rgba(255, 255, 255, 0.87);
          }
        }
      }
    }
  `]
})
export class EventDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EventDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      event: Event;
      employees: Employee[];
      departments: Department[];
      currentUserId?: number;
      currentEmployeeId?: number;
      onEdit: () => void;
      onDelete: () => void;
    },
    private dialog: MatDialog,
    public dateUtils: DateUtilsService
  ) {}

  canEditOrDelete(): boolean {
    const currentUserId = this.data.currentUserId;
    const currentEmployeeId = this.data.currentEmployeeId;
    if (!currentUserId && !currentEmployeeId) return false;
    
    // Ersteller kann immer bearbeiten/löschen (created_by ist User-ID)
    if (this.data.event.created_by === currentUserId) {
      return true;
    }
    
    // Wenn editable_by_attendees aktiviert ist und der Nutzer Teilnehmer ist (attendees sind Employee-IDs)
    if (this.data.event.editable_by_attendees && 
        this.data.event.attendees && 
        currentEmployeeId &&
        this.data.event.attendees.includes(currentEmployeeId)) {
      return true;
    }
    
    return false;
  }

  onEdit(): void {
    this.dialogRef.close();
    if (this.data.onEdit) {
      this.data.onEdit();
    }
  }

  onDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Event löschen',
        message: `Möchten Sie das Event "${this.data.event.title}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.dialogRef.close();
        if (this.data.onDelete) {
          this.data.onDelete();
        }
      }
    });
  }

  getEventTypeLabel(): string {
    const labels: Record<string, string> = {
      'meeting': 'Besprechung',
      'training': 'Schulung',
      'project': 'Projekt',
      'company': 'Firmenveranstaltung',
      'other': 'Sonstiges'
    };
    return labels[this.data.event.event_type] || 'Sonstiges';
  }

  getEventTypeColor(): string {
    const colors: Record<string, string> = {
      'meeting': '#2196F3',
      'training': '#4CAF50',
      'project': '#FF9800',
      'company': '#9C27B0',
      'other': '#607D8B'
    };
    return colors[this.data.event.event_type] || '#607D8B';
  }

  formatDate(dateStr: string): string {
    return this.dateUtils.formatDateFromString(dateStr);
  }

  formatDateTime(dateStr: string): string {
    return this.dateUtils.formatDateTimeFromString(dateStr);
  }

  isSameDay(date1Str: string, date2Str: string): boolean {
    const d1 = new Date(date1Str);
    const d2 = new Date(date2Str);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
}
