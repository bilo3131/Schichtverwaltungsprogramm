import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ShiftService } from '../../../core/services/shift.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { EventService } from '../../../core/services/event.service';
import { DashboardFilterService } from '../../../core/services/dashboard-filter.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AbsenceDialogComponent } from '../../../shared/dialogs/absence-dialog/absence-dialog.component';
import { forkJoin } from 'rxjs';

interface DashboardStats {
  // Persönliche KPIs
  nextShift?: {
    time: string;
    date: string;
    countdown: string;
  };
  shiftsThisWeek: number;
  hoursThisWeek: number;
  shiftsWeekTrend: number;
  remainingVacationDays: number;
  totalVacationDays: number;
  usedVacationDays: number;
  overtimeHours: number;
  overtimeTarget: number;
  upcomingEvents: number;
  nextEventDate?: string;
  nextHoliday?: string;
  nextHolidayDate?: string;
  nextVacation?: string;
  nextVacationDate?: string;

  // Manager KPIs
  understaffedShifts: number;
  pendingVacations: number;
  sickRate: number;
  sickEmployees: number;
  totalEmployees: number;
  sickRateTrend: number;
  onVacation: number;
  vacationUpcoming: number;
  totalOvertime: number;
  avgOvertime: number;
  overtimeTrend: number;
  qualificationGaps: number;
  planningProgress: number;
  publishedShifts: number;
  draftShifts: number;
  approvalRate: number;
  avgApprovalTime: number;
  approvedCount: number;
  rejectedCount: number;
  overloadedEmployees: number;
  underloadedEmployees: number;
  avgTeamUtilization: number;
  planStatusText?: string;
  planStatusDate?: string;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent implements OnInit {
  currentUserName = '';
  currentUserId: number | null = null;
  currentEmployeeId: number | null = null;
  loading = true;
  stats: DashboardStats = {
    shiftsThisWeek: 0,
    hoursThisWeek: 0,
    shiftsWeekTrend: 0,
    remainingVacationDays: 0,
    totalVacationDays: 30,
    usedVacationDays: 0,
    overtimeHours: 0,
    overtimeTarget: 0,
    upcomingEvents: 0,
    understaffedShifts: 0,
    pendingVacations: 0,
    sickRate: 0,
    sickEmployees: 0,
    totalEmployees: 0,
    sickRateTrend: 0,
    onVacation: 0,
    vacationUpcoming: 0,
    totalOvertime: 0,
    avgOvertime: 0,
    overtimeTrend: 0,
    qualificationGaps: 0,
    planningProgress: 0,
    publishedShifts: 0,
    draftShifts: 0,
    approvalRate: 0,
    avgApprovalTime: 0,
    approvedCount: 0,
    rejectedCount: 0,
    overloadedEmployees: 0,
    underloadedEmployees: 0,
    avgTeamUtilization: 0
  };

  constructor(
    public authService: AuthService,
    private router: Router,
    private shiftService: ShiftService,
    private employeeService: EmployeeService,
    private dashboardFilterService: DashboardFilterService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private eventService?: EventService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserName = user?.full_name || user?.username || '';
      this.currentUserId = user?.id || null;
      if (user) {
        this.loadStats();
      }
    });

    // Bei Änderung des Abteilungsfilters neu laden
    this.dashboardFilterService.selectedDepartmentId$.subscribe(() => {
      this.loadStats();
    });
  }

  loadStats(): void {
    this.loading = true;
    const departmentId = this.dashboardFilterService.getDepartmentFilter();
    const params: any = {};
    
    if (departmentId !== 'all') {
      params.department = departmentId;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Wochenanfang (Montag) und Wochenende (Sonntag)
    const startOfWeek = this.getStartOfWeek(today);
    const endOfWeek = this.getEndOfWeek(today);

    // Persönliche Statistiken laden
    this.loadPersonalStats(todayStr, startOfWeek, endOfWeek, params);

    // Manager-Statistiken laden (aktuelle Woche)
    if (this.authService.isManager) {
      this.loadManagerStats(startOfWeek, endOfWeek, params);
    }

    this.loading = false;
  }

  loadPersonalStats(today: string, startOfWeek: string, endOfWeek: string, params: any): void {
    // Schichten diese Woche
    this.shiftService.getShifts({ 
      ...params, 
      start_date: startOfWeek, 
      end_date: endOfWeek,
      employee: this.currentUserId
    }).subscribe({
      next: (data) => {
        const shifts = data.results || [];
        this.stats.shiftsThisWeek = shifts.length;
        
        // Berechne Stunden diese Woche (Arbeitsstunden minus Pausen)
        // break_duration ist in Minuten, muss zu Stunden konvertiert werden
        this.stats.hoursThisWeek = shifts.reduce((total: number, shift: any) => {
          const shiftHours = shift.duration_hours || 8;
          const breakMinutes = shift.shift_type_details?.break_duration || 0;
          const breakHours = breakMinutes / 60;
          return total + (shiftHours - breakHours);
        }, 0);

        // Trend berechnen (Dummy-Werte - könnte mit historischen Daten erweitert werden)
        this.stats.shiftsWeekTrend = shifts.length > 5 ? 2 : shifts.length < 3 ? -1 : 0;
      }
    });

    // Nächste Schicht separat laden (ab heute, nicht nur diese Woche)
    this.shiftService.getShifts({ 
      ...params, 
      start_date: today,
      employee: this.currentUserId
    }).subscribe({
      next: (data) => {
        const shifts = data.results || [];
        const now = new Date();
        
        // Nächste Schicht finden - kombiniere date und start_time für Vergleich
        const upcomingShifts = shifts
          .filter((s: any) => {
            const shiftDateTime = new Date(`${s.date}T${s.start_time}`);
            return shiftDateTime > now;
          })
          .sort((a: any, b: any) => {
            const dateA = new Date(`${a.date}T${a.start_time}`);
            const dateB = new Date(`${b.date}T${b.start_time}`);
            return dateA.getTime() - dateB.getTime();
          });
        
        if (upcomingShifts.length > 0) {
          const nextShift = upcomingShifts[0];
          const shiftDate = new Date(`${nextShift.date}T${nextShift.start_time}`);
          this.stats.nextShift = {
            time: shiftDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            date: this.getRelativeDate(shiftDate),
            countdown: this.getCountdown(shiftDate)
          };
        }
      }
    });

    // Wichtige Termine/Events (nächste 7 Tage) - nur Events, bei denen der User Teilnehmer ist
    if (this.eventService) {
      const todayDate = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(todayDate.getDate() + 7);
      
      this.eventService.getEvents({
        start_date: todayDate.toISOString().split('T')[0],
        end_date: nextWeek.toISOString().split('T')[0]
      }).subscribe({
        next: (data) => {
          const allEvents = data.results || [];
          const now = new Date();
          
          // Filtern nach Events, bei denen der aktuelle Benutzer Teilnehmer ist
          // UND die noch nicht vorbei sind (inkl. Uhrzeit-Prüfung)
          const userEvents = allEvents.filter((event: any) => {
            // Prüfen, ob currentEmployeeId in attendees ist
            const isAttendee = this.currentEmployeeId && event.attendees && 
                               event.attendees.includes(this.currentEmployeeId);
            
            if (!isAttendee) return false;
            
            // Prüfen, ob Event noch nicht vorbei ist
            const eventEndTime = event.end_datetime ? new Date(event.end_datetime) : new Date(event.start_datetime);
            return eventEndTime > now;
          });
          
          this.stats.upcomingEvents = userEvents.length;
          if (userEvents.length > 0) {
            const nextEvent = userEvents[0]; // Bereits nach start_datetime sortiert
            const eventDate = new Date(nextEvent.start_datetime);
            this.stats.nextEventDate = this.getRelativeDate(eventDate);
          }
        },
        error: (error) => {
          console.error('Error loading events:', error);
          this.stats.upcomingEvents = 0;
        }
      });
    }

    // Urlaubstage (Standard-Werte - TODO: Von Backend Employee-Daten laden)
    this.stats.totalVacationDays = 30;
    this.stats.usedVacationDays = 0;
    this.stats.remainingVacationDays = 30;

    // Überstunden-Saldo vom Employee-Profil laden
    this.employeeService.getEmployees(params).subscribe({
      next: (data) => {
        const employees = data.results || [];
        const currentEmployee = employees.find((e: any) => e.user === this.currentUserId);
        
        if (currentEmployee) {
          this.currentEmployeeId = currentEmployee.id;
          this.stats.overtimeHours = currentEmployee.overtime_hours || 0;
          // Zielwert basierend auf Arbeitsvertrag (40h Standard)
          this.stats.overtimeTarget = 0; // Bei 0 bedeutet es: Überstunden sind relativ zu Sollstunden
          
          // Genehmigte Urlaubsanträge in den nächsten 14 Tagen - NUR für diesen Mitarbeiter
          this.employeeService.getVacationRequests('approved', {
            employee: this.currentEmployeeId  // Verwende Employee-ID statt User-ID
          }).subscribe({
            next: (vacData) => {
              const vacations = vacData.results || [];
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const twoWeeksFromNow = new Date();
              twoWeeksFromNow.setDate(now.getDate() + 14);

              // Filtere Urlaubsanträge die in den nächsten 14 Tagen beginnen oder laufen
              const upcomingVacations = vacations.filter((v: any) => {
                const startDate = new Date(v.start_date);
                const endDate = new Date(v.end_date);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                // Urlaub beginnt in den nächsten 14 Tagen oder läuft aktuell
                return (startDate >= now && startDate <= twoWeeksFromNow) || 
                       (startDate <= now && endDate >= now);
              }).sort((a: any, b: any) => 
                new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
              );

              if (upcomingVacations.length > 0) {
                const nextVacation = upcomingVacations[0];
                const vacationStart = new Date(nextVacation.start_date);
                const vacationEnd = new Date(nextVacation.end_date);
                vacationStart.setHours(0, 0, 0, 0);
                vacationEnd.setHours(0, 0, 0, 0);

                // Prüfe ob Urlaub aktuell läuft
                if (vacationStart <= now && vacationEnd >= now) {
                  this.stats.nextVacation = 'Aktuell im Urlaub';
                  this.stats.nextVacationDate = `bis ${this.getRelativeDate(vacationEnd)}`;
                } else {
                  this.stats.nextVacation = 'Urlaub geplant';
                  this.stats.nextVacationDate = this.getRelativeDate(vacationStart);
                }
              }
            },
            error: (error) => {
              console.error('Error loading vacation requests:', error);
            }
          });
        }
      }
    });

    // Feiertage in den nächsten 14 Tagen
    const todayDate = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(todayDate.getDate() + 14);

    this.notificationService.getHolidays(
      todayDate.toISOString().split('T')[0],
      inTwoWeeks.toISOString().split('T')[0]
    ).subscribe({
      next: (data) => {
        const holidays = data.results || data || [];
        if (holidays.length > 0) {
          // Sortiere nach Datum und nimm den nächsten
          const sortedHolidays = holidays.sort((a: any, b: any) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const nextHoliday = sortedHolidays[0];
          this.stats.nextHoliday = nextHoliday.name;
          const holidayDate = new Date(nextHoliday.date);
          this.stats.nextHolidayDate = this.getRelativeDate(holidayDate);
        }
      },
      error: (error) => {
        console.error('Error loading holidays:', error);
      }
    });
  }

  loadManagerStats(startDate: string, endDate: string, params: any): void {
    // Lade alle Schichten UND ShiftTypes
    const planningParams = { start_date: startDate, end_date: endDate, page_size: 1000 };
    
    forkJoin({
      employees: this.employeeService.getEmployees(params),
      shifts: this.shiftService.getShifts(planningParams),
      shiftTypes: this.shiftService.getShiftTypes(params),
      pendingVacations: this.employeeService.getVacationRequests('pending', params),
      approvedVacations: this.employeeService.getVacationRequests('approved', params),
      rejectedVacations: this.employeeService.getVacationRequests('rejected', params),
      absences: this.employeeService.getAbsences(params)
    }).subscribe({
      next: (results) => {
        const employees = results.employees.results || [];
        const shifts = results.shifts.results || [];
        const shiftTypes = results.shiftTypes.results || [];
        const vacations = results.pendingVacations.results || [];
        const absences = results.absences.results || [];

        // Gesamte Mitarbeiter
        this.stats.totalEmployees = employees.length;

        // Offene Urlaubsanträge
        this.stats.pendingVacations = vacations.length;
        
        // Genehmigungsstatistik
        this.stats.approvedCount = (results.approvedVacations.results || []).length;
        this.stats.rejectedCount = (results.rejectedVacations.results || []).length;
        const totalProcessed = this.stats.approvedCount + this.stats.rejectedCount;
        this.stats.approvalRate = totalProcessed > 0 
          ? Math.round((this.stats.approvedCount / totalProcessed) * 100)
          : 0;
        
        // Durchschnittliche Bearbeitungszeit berechnen
        const processedRequests = [...(results.approvedVacations.results || []), ...(results.rejectedVacations.results || [])];
        if (processedRequests.length > 0) {
          const totalDays = processedRequests.reduce((sum: number, req: any) => {
            if (req.created_at && req.updated_at) {
              const created = new Date(req.created_at);
              const updated = new Date(req.updated_at);
              const diffTime = Math.abs(updated.getTime() - created.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return sum + diffDays;
            }
            return sum;
          }, 0);
          this.stats.avgApprovalTime = Math.round(totalDays / processedRequests.length);
        } else {
          this.stats.avgApprovalTime = 0;
        }

        // Krankenstand - aktuelle Kalenderwoche (Mo-So)
        const today = new Date();
        
        // Berechne Start (Montag) und Ende (Sonntag) der aktuellen Kalenderwoche
        const currentWeekStart = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Montag = Start
        currentWeekStart.setDate(today.getDate() + diff);
        currentWeekStart.setHours(0, 0, 0, 0);
        
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sonntag
        currentWeekEnd.setHours(23, 59, 59, 999);
        
        // Berechne Vorwoche
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(currentWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(currentWeekEnd);
        lastWeekEnd.setDate(currentWeekEnd.getDate() - 7);
        
        // Krankenstand aktuelle Woche - zähle alle Tage an denen jemand krank war
        const sickDaysCurrentWeek = new Set<string>(); // Set von "employeeId-date" für eindeutige Tage
        absences.forEach((a: any) => {
          if (a.absence_type !== 'sick') return;
          const start = new Date(a.start_date);
          const end = new Date(a.end_date);
          
          // Iteriere über alle Tage der Krankheit, die in der aktuellen Woche liegen
          for (let d = new Date(Math.max(start.getTime(), currentWeekStart.getTime())); 
               d.getTime() <= Math.min(end.getTime(), currentWeekEnd.getTime()); 
               d.setDate(d.getDate() + 1)) {
            sickDaysCurrentWeek.add(`${a.employee}-${d.toISOString().split('T')[0]}`);
          }
        });
        
        // Krankenstand Vorwoche
        const sickDaysLastWeek = new Set<string>();
        absences.forEach((a: any) => {
          if (a.absence_type !== 'sick') return;
          const start = new Date(a.start_date);
          const end = new Date(a.end_date);
          
          for (let d = new Date(Math.max(start.getTime(), lastWeekStart.getTime())); 
               d.getTime() <= Math.min(end.getTime(), lastWeekEnd.getTime()); 
               d.setDate(d.getDate() + 1)) {
            sickDaysLastWeek.add(`${a.employee}-${d.toISOString().split('T')[0]}`);
          }
        });
        
        // Durchschnittlicher Krankenstand pro Tag in der Woche
        const avgSickCurrentWeek = sickDaysCurrentWeek.size / 7; // 7 Tage
        const avgSickLastWeek = sickDaysLastWeek.size / 7;
        
        // Krankenstand als Prozentsatz (durchschnittlich kranke MA pro Tag / Gesamt-MA)
        this.stats.sickRate = this.stats.totalEmployees > 0 
          ? Math.round((avgSickCurrentWeek / this.stats.totalEmployees) * 100) 
          : 0;
        
        // Anzahl aktuell kranker Mitarbeiter (heute)
        const sickToday = absences.filter((a: any) => {
          if (a.absence_type !== 'sick') return false;
          const start = new Date(a.start_date);
          const end = new Date(a.end_date);
          return today >= start && today <= end;
        }).length;
        this.stats.sickEmployees = sickToday;
        
        // Trend: Vergleich aktuelle Woche vs Vorwoche
        const sickRateLastWeek = this.stats.totalEmployees > 0 
          ? Math.round((avgSickLastWeek / this.stats.totalEmployees) * 100) 
          : 0;
        this.stats.sickRateTrend = this.stats.sickRate - sickRateLastWeek;


        // Im Urlaub - nur Abwesenheiten, die heute aktiv sind
        const onVacationToday = absences.filter((a: any) => {
          if (a.absence_type !== 'vacation') return false;
          const start = new Date(a.start_date);
          const end = new Date(a.end_date);
          return today >= start && today <= end;
        }).length;
        this.stats.onVacation = onVacationToday;
        this.stats.vacationUpcoming = Math.floor(vacations.length * 0.3); // 30% genehmigt und kommend

        // Unterbesetzte Schichten - prüfe pro ShiftType und Tag
        let understaffedCount = 0;
        const weekDates: string[] = [];
        
        // Generiere alle Dates der aktuellen Woche
        const understaffedWeekStart = new Date(startDate);
        const understaffedWeekEnd = new Date(endDate);
        for (let d = new Date(understaffedWeekStart); d <= understaffedWeekEnd; d.setDate(d.getDate() + 1)) {
          weekDates.push(d.toISOString().split('T')[0]);
        }
        
        // Prüfe für jeden ShiftType und jeden Tag
        shiftTypes.forEach((shiftType: any) => {
          weekDates.forEach(date => {
            // Prüfe ob der ShiftType für diesen Tag verfügbar ist
            const dayDate = new Date(date);
            const dayOfWeek = dayDate.getDay();
            
            // Samstag (6) - nur zählen wenn works_on_saturday = true
            if (dayOfWeek === 6 && !shiftType.works_on_saturday) {
              return;
            }
            
            // Sonntag (0) - nur zählen wenn works_on_sunday = true
            if (dayOfWeek === 0 && !shiftType.works_on_sunday) {
              return;
            }
            
            // Zähle besetzte Schichten (mit employee) für diesen ShiftType und Tag
            const assignedShifts = shifts.filter((s: any) => 
              s.shift_type === shiftType.id && 
              s.date === date && 
              s.employee !== null && 
              s.employee !== undefined
            ).length;
            
            const required = shiftType.min_employees || 1;
            
            // Wenn weniger als required besetzt sind, ist es unterbesetzt
            if (assignedShifts < required) {
              understaffedCount++;
            }
          });
        });
        
        this.stats.understaffedShifts = understaffedCount;

        // Überstunden (Beispielberechnung)
        this.stats.totalOvertime = employees.reduce((sum: number, emp: any) => {
          return sum + (emp.overtime_hours || 0);
        }, 0);
        this.stats.avgOvertime = this.stats.totalEmployees > 0 
          ? this.stats.totalOvertime / this.stats.totalEmployees
          : 0;
        this.stats.overtimeTrend = this.stats.totalOvertime > 100 ? 5 : -2;

        // Qualifikationslücken
        this.stats.qualificationGaps = shifts.filter((s: any) => {
          return s.required_qualifications?.length > 0 && !s.employee;
        }).length;

        // Planungsfortschritt - Berücksichtige alle Tage je nach Schichttyp-Konfiguration
        // Generiere alle Tage zwischen startDate und endDate
        const allDays: { date: string, dayOfWeek: number }[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay(); // 0=Sonntag, 1=Montag, ..., 6=Samstag
          allDays.push({
            date: d.toISOString().split('T')[0],
            dayOfWeek: dayOfWeek
          });
        }
        
        // Berechne erforderliche Positionen: Tage × shiftTypes × min_employees
        // Berücksichtige works_on_saturday und works_on_sunday für jeden Schichttyp
        let totalRequiredPositions = 0;
        let totalFilledPositions = 0;
        
        allDays.forEach(({ date, dayOfWeek }) => {
          shiftTypes.forEach((shiftType: any) => {
            // Prüfe ob dieser Schichttyp an diesem Wochentag arbeitet
            const isSaturday = dayOfWeek === 6;
            const isSunday = dayOfWeek === 0;
            const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
            
            // Schichttyp arbeitet an diesem Tag wenn:
            // - Es ein Wochentag (Mo-Fr) ist, ODER
            // - Es Samstag ist UND works_on_saturday = true, ODER
            // - Es Sonntag ist UND works_on_sunday = true
            const worksOnThisDay = isWeekday || 
              (isSaturday && shiftType.works_on_saturday) || 
              (isSunday && shiftType.works_on_sunday);
            
            if (!worksOnThisDay) {
              return; // Dieser Schichttyp arbeitet nicht an diesem Tag
            }
            
            const minEmployees = shiftType.min_employees || 1;
            totalRequiredPositions += minEmployees;
            
            // Zähle besetzte Positionen für diesen Tag + ShiftType
            const dayTypeShifts = shifts.filter((s: any) => 
              s.date === date && s.shift_type === shiftType.id
            );
            const filledCount = dayTypeShifts.filter((s: any) => 
              s.employee !== null && s.employee !== undefined
            ).length;
            
            totalFilledPositions += Math.min(filledCount, minEmployees);
          });
        });
        
        // Fortschritt berechnen
        this.stats.planningProgress = totalRequiredPositions > 0 
          ? Math.round((totalFilledPositions / totalRequiredPositions) * 100)
          : 0;
        
        this.stats.publishedShifts = totalFilledPositions;
        this.stats.draftShifts = totalRequiredPositions - totalFilledPositions;
        
        // Status und Datum basierend auf tatsächlicher Veröffentlichung
        const publishedShifts = shifts.filter((s: any) => s.status === 'published');
        const weekStart = new Date(startDate);
        const weekEnd = new Date(endDate);
        const dateRange = `${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
        
        if (publishedShifts.length > 0) {
          // Finde neuestes updated_at Datum von veröffentlichten Schichten
          const latestUpdate = publishedShifts.reduce((latest: Date, shift: any) => {
            const shiftDate = new Date(shift.updated_at);
            return shiftDate > latest ? shiftDate : latest;
          }, new Date(publishedShifts[0].updated_at));
          
          const publishedDate = latestUpdate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const publishedTime = latestUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          
          this.stats.planStatusText = 'Veröffentlicht';
          this.stats.planStatusDate = `am ${publishedDate} um ${publishedTime} Uhr · ${dateRange}`;
        } else {
          // Entwurf
          this.stats.planStatusText = 'Entwurf';
          this.stats.planStatusDate = dateRange;
        }

        // Mitarbeiter-Auslastung
        let totalUtilization = 0;
        let overloaded = 0;
        let underloaded = 0;
        let employeesWithHours = 0;
        
        employees.forEach((emp: any) => {
          // Finde alle Schichten für diesen Mitarbeiter
          const empShifts = shifts.filter((s: any) => s.employee === emp.id);
          const weeklyHours = empShifts.reduce((sum: number, s: any) => {
            // Hole ShiftType für Zeitberechnung
            const shiftType = shiftTypes.find((st: any) => st.id === s.shift_type);
            if (!shiftType) return sum;
            
            // Berechne Dauer mit Pausenabzug
            const duration = this.calculateShiftDuration(
              shiftType.start_time, 
              shiftType.end_time, 
              shiftType.break_duration || 0
            );
            return sum + duration;
          }, 0);
          
          const minHours = emp.min_hours_per_week || 0;
          const maxHours = emp.max_hours_per_week || 40;
          
          // Berechne Auslastung basierend auf Min-Stunden (100% = min_hours erreicht)
          if (minHours > 0) {
            const utilization = (weeklyHours / minHours) * 100;
            totalUtilization += utilization;
            employeesWithHours++;
            
            // Unterlastet: erreicht Min-Stunden nicht
            if (weeklyHours < minHours) {
              underloaded++;
            }
          }
          
          // Überlastet: überschreitet Max-Stunden
          if (weeklyHours > maxHours) {
            overloaded++;
          }
        });
        
        this.stats.avgTeamUtilization = employeesWithHours > 0
          ? Math.round(totalUtilization / employeesWithHours)
          : 0;
        this.stats.overloadedEmployees = overloaded;
        this.stats.underloadedEmployees = underloaded;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Manager-Statistiken:', err);
      }
    });
  }

  getStartOfWeek(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Montag
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  getEndOfWeek(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sonntag
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  getRelativeDate(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Heute';
    if (dateStr === tomorrowStr) return 'Morgen';
    
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  getCountdown(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} Tag${days > 1 ? 'en' : ''}`;
    if (hours > 0) return `in ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    return 'bald';
  }

  getCurrentDateString(): string {
    return new Date().toLocaleDateString('de-DE', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getVacationProgress(): number {
    return this.stats.totalVacationDays > 0 
      ? Math.round((this.stats.usedVacationDays / this.stats.totalVacationDays) * 100)
      : 0;
  }

  formatOvertimeHours(hours: number): string {
    if (!hours || isNaN(hours)) return '0h 0min';
    
    const isNegative = hours < 0;
    const absHours = Math.abs(hours);
    const h = Math.floor(absHours);
    const min = Math.round((absHours - h) * 60);
    
    const sign = isNegative ? '-' : '+';
    return `${sign}${h}h ${min}min`;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  openSickLeaveDialog(): void {
    // Lade aktuelle Mitarbeiterdaten
    this.employeeService.getEmployees().subscribe({
      next: (data) => {
        const employees = data.results || [];
        
        // Finde den aktuellen User als Employee
        const currentEmployee = employees.find((emp: any) => emp.user === this.currentUserId);
        
        if (!currentEmployee) {
          this.snackBar.open(
            'Sie müssen als Mitarbeiter angelegt sein, um eine Krankmeldung abzugeben.',
            'Schließen',
            { duration: 5000 }
          );
          return;
        }

        const dialogRef = this.dialog.open(AbsenceDialogComponent, {
          width: '500px',
          data: {
            absence: {
              employee: currentEmployee.id,
              absence_type: 'sick',
              start_date: new Date(),
              end_date: new Date(),
              notes: ''
            },
            employees: employees,
            isSickReportMode: true  // Vereinfachter Modus für Krankmeldung
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.employeeService.createAbsence(result).subscribe({
              next: () => {
                this.snackBar.open('Krankmeldung erfolgreich erstellt', 'Schließen', {
                  duration: 3000,
                  panelClass: ['success-snackbar']
                });
                this.loadStats(); // Reload stats
              },
              error: (error: any) => {
                this.snackBar.open(
                  error.error?.detail || 'Fehler beim Erstellen der Krankmeldung',
                  'Schließen',
                  { duration: 5000, panelClass: ['error-snackbar'] }
                );
              }
            });
          }
        });
      },
      error: () => {
        this.snackBar.open(
          'Fehler beim Laden der Mitarbeiterdaten',
          'Schließen',
          { duration: 5000 }
        );
      }
    });
  }

  calculateShiftDuration(startTime: string, endTime: string, breakDuration: number = 0): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let minutes = endMin - startMin;
    
    if (minutes < 0) {
      hours--;
      minutes += 60;
    }
    
    // Über Mitternacht
    if (hours < 0) {
      hours += 24;
    }
    
    const totalHours = hours + (minutes / 60);
    
    // Pausenabzug direkt aus ShiftType (wurde bereits im Backend/Frontend bei Schichttyp-Erstellung berechnet)
    const breakHours = breakDuration / 60; // break_duration ist in Minuten
    return Math.max(0, totalHours - breakHours);
  }
}
