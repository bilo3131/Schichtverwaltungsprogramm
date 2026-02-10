import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import deLocale from '@fullcalendar/core/locales/de';
import { EventService } from '../../../core/services/event.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { DepartmentService } from '../../../core/services/department.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventDialogComponent } from '../../../shared/dialogs/event-dialog/event-dialog.component';
import { EventDetailDialogComponent } from '../../../shared/dialogs/event-detail-dialog/event-detail-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import type { Holiday, Event, Employee, Department } from '../../../core/models';
import { UI_CONSTANTS } from '../../../core/constants/ui.constants';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatButtonToggleModule,
    FullCalendarModule
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'dayGridMonth',
    locale: deLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    buttonText: {
      today: 'Heute',
      month: 'Monat',
      week: 'Woche',
      list: 'Liste'
    },
    weekends: true,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    height: 'auto',
    events: [],
    eventClick: this.handleEventClick.bind(this),
    dateClick: this.handleDateClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    datesSet: this.handleDatesSet.bind(this)
  };

  employees: Employee[] = [];
  departments: Department[] = [];
  events: Event[] = [];
  holidays: Holiday[] = [];
  loading = false;
  showInfoBox = false;

  constructor(
    private eventService: EventService,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadDepartments();
  }

  loadEmployees(): void {
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data.results || data;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      }
    });
  }

  loadDepartments(): void {
    this.departmentService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data.results || data;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  handleDatesSet(dateInfo: any): void {
    // Wird aufgerufen wenn sich der angezeigte Zeitraum ändert
    // Verwende setTimeout um ExpressionChangedAfterItHasBeenCheckedError zu vermeiden
    setTimeout(() => {
      this.loadCalendarData();
    }, 0);
  }

  loadCalendarData(): void {
    if (!this.calendarComponent) return;
    
    this.loading = true;
    const calendarApi = this.calendarComponent.getApi();
    
    if (!calendarApi || !calendarApi.view) {
      this.loading = false;
      return;
    }
    
    const start = calendarApi.view.activeStart;
    const end = calendarApi.view.activeEnd;
    
    const startDate = this.formatDate(start);
    const endDate = this.formatDate(end);
    
    // Lade Events
    const params: any = {
      start_date: startDate,
      end_date: endDate
    };
    
    this.eventService.getEvents(params).subscribe({
      next: (data) => {
        this.events = data.results || data;
        
        // Filtere Events: Nur Events anzeigen, bei denen der aktuelle Benutzer Teilnehmer ist
        const currentEmployeeId = this.authService.currentUserValue?.employee_profile?.id;
        const filteredEvents = currentEmployeeId 
          ? this.events.filter(event => 
              event.attendees && event.attendees.includes(currentEmployeeId)
            )
          : [];
        
        const eventItems = this.convertEventsToCalendarEvents(filteredEvents);
        
        // Lade Feiertage
        this.notificationService.getHolidays(startDate, endDate).subscribe({
          next: (holidayData) => {
            this.holidays = holidayData.results || holidayData;
            const holidayEvents = this.convertHolidaysToEvents(this.holidays);
            
            // Kombiniere Events
            this.calendarOptions.events = [...eventItems, ...holidayEvents];
            this.loading = false;
          },
          error: () => {
            this.calendarOptions.events = eventItems;
            this.loading = false;
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  convertEventsToCalendarEvents(events: Event[]): EventInput[] {
    const eventTypeColors: Record<string, string> = {
      'meeting': '#2196F3',
      'training': '#4CAF50',
      'project': '#FF9800',
      'company': '#9C27B0',
      'other': '#607D8B'
    };

    return events.map(event => ({
      id: event.id.toString(),
      title: event.title,
      start: event.start_datetime,
      end: event.end_datetime,
      allDay: event.is_all_day,
      backgroundColor: eventTypeColors[event.event_type] || '#607D8B',
      borderColor: eventTypeColors[event.event_type] || '#607D8B',
      extendedProps: {
        type: 'event',
        eventData: event
      }
    }));
  }

  convertHolidaysToEvents(holidays: Holiday[]): EventInput[] {
    return holidays.map(holiday => ({
      id: `holiday-${holiday.id}`,
      title: `🎉 ${holiday.name}`,
      start: holiday.date,
      allDay: true,
      backgroundColor: '#ff6b6b',
      borderColor: '#ff6b6b',
      display: 'background',
      extendedProps: {
        type: 'holiday',
        holiday: holiday
      }
    }));
  }

  handleEventClick(clickInfo: EventClickArg): void {
    const calendarEvent = clickInfo.event;
    const type = calendarEvent.extendedProps['type'];
    
    if (type === 'event') {
      const eventData = calendarEvent.extendedProps['eventData'] as Event;
      this.openEventDetailDialog(eventData);
    } else if (type === 'holiday') {
      // Feiertage sind read-only
      const holiday = calendarEvent.extendedProps['holiday'];
      this.snackBar.open(`Feiertag: ${holiday.name}`, 'Schließen', {
        duration: 3000
      });
    }
  }

  handleDateClick(dateClickInfo: any): void {
    // Click auf leere Zelle: Neues Event erstellen
    const clickedDate = dateClickInfo.date;
    const isAllDay = dateClickInfo.allDay;
    
    const startTime = isAllDay ? '09:00' : this.formatTimeForInput(clickedDate);
    const endDate = new Date(clickedDate);
    endDate.setHours(clickedDate.getHours() + 1);
    const endTime = isAllDay ? '10:00' : this.formatTimeForInput(endDate);
    
    this.openEventDialog(undefined, clickedDate, startTime, endTime);
  }

  handleEventDrop(dropInfo: any): void {
    const calendarEvent = dropInfo.event;
    const type = calendarEvent.extendedProps['type'];
    
    if (type !== 'event') {
      dropInfo.revert();
      return;
    }
    
    const eventData = calendarEvent.extendedProps['eventData'] as Event;
    const newStart = calendarEvent.start!.toISOString();
    const newEnd = (calendarEvent.end || calendarEvent.start)!.toISOString();
    
    this.eventService.updateEvent(eventData.id, {
      start_datetime: newStart,
      end_datetime: newEnd
    }).subscribe({
      next: () => {
        this.showSuccessMessage('Event verschoben');
        this.loadCalendarData();
      },
      error: (error) => {
        dropInfo.revert();
        this.showErrorMessage('Fehler beim Verschieben des Events');
      }
    });
  }

  handleEventResize(resizeInfo: any): void {
    const calendarEvent = resizeInfo.event;
    const type = calendarEvent.extendedProps['type'];
    
    if (type !== 'event') {
      resizeInfo.revert();
      return;
    }
    
    const eventData = calendarEvent.extendedProps['eventData'] as Event;
    const newEnd = (calendarEvent.end || calendarEvent.start)!.toISOString();
    
    this.eventService.updateEvent(eventData.id, {
      end_datetime: newEnd
    }).subscribe({
      next: () => {
        this.showSuccessMessage('Event-Dauer geändert');
        this.loadCalendarData();
      },
      error: (error) => {
        resizeInfo.revert();
        this.showErrorMessage('Fehler beim Ändern der Event-Dauer');
      }
    });
  }

  openEventDialog(event?: Event, initialDate?: Date, initialStartTime?: string, initialEndTime?: string): void {
    const currentUser = this.authService.currentUserValue;
    const currentUserId = currentUser?.employee_profile?.id;
    
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '600px',
      data: {
        event,
        employees: this.employees,
        departments: this.departments,
        initialDate,
        initialStartTime,
        initialEndTime,
        currentUserId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (event) {
          // Update existing event
          this.eventService.updateEvent(event.id, result).subscribe({
            next: () => {
              this.showSuccessMessage('Event aktualisiert');
              this.loadCalendarData();
            },
            error: (error) => {
              this.showErrorMessage('Fehler beim Aktualisieren des Events');
            }
          });
        } else {
          // Create new event
          this.eventService.createEvent(result).subscribe({
            next: () => {
              this.showSuccessMessage('Event erstellt');
              this.loadCalendarData();
            },
            error: (error) => {
              this.showErrorMessage('Fehler beim Erstellen des Events');
            }
          });
        }
      }
    });
  }

  openEventDetailDialog(event: Event): void {
    const currentUser = this.authService.currentUserValue;
    const currentUserId = currentUser?.id;
    const currentEmployeeId = currentUser?.employee_profile?.id;
    
    const dialogRef = this.dialog.open(EventDetailDialogComponent, {
      width: '600px',
      data: {
        event,
        employees: this.employees,
        departments: this.departments,
        currentUserId,
        currentEmployeeId,
        onEdit: () => {
          this.openEventDialog(event);
        },
        onDelete: () => {
          this.deleteEvent(event);
        }
      }
    });
  }

  deleteEvent(event: Event): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Event löschen',
        message: `Möchten Sie das Event "${event.title}" wirklich löschen?`,
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.eventService.deleteEvent(event.id).subscribe({
          next: () => {
            this.showSuccessMessage('Event gelöscht');
            this.loadCalendarData();
          },
          error: (error) => {
            this.showErrorMessage('Fehler beim Löschen des Events');
          }
        });
      }
    });
  }

  private formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.DURATION,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Schließen', {
      duration: UI_CONSTANTS.SNACKBAR.ERROR_DURATION,
      panelClass: ['error-snackbar']
    });
  }

  closeInfoBox(): void {
    this.showInfoBox = false;
  }
}
