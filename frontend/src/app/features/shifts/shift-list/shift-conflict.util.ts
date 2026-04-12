import { AbsenceRecord, VacationRequest, Shift, ShiftType } from '../../../core/models';
import { parseTime, WeekDay } from './shift-week.util';

// ── Absence helpers ───────────────────────────────────────────────────────────

/**
 * Returns the AbsenceRecord that blocks the employee on dateStr, or null.
 * Ignores vacation_wish records — they are advisory, not blocking.
 */
export function isEmployeeAbsent(
  employeeId: number, dateStr: string, absences: AbsenceRecord[]
): AbsenceRecord | null {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return absences.find(a => {
    if (a.employee !== employeeId || a.absence_type === 'vacation_wish') return false;
    const start = new Date(a.start_date); start.setHours(0, 0, 0, 0);
    const end   = new Date(a.end_date);   end.setHours(0, 0, 0, 0);
    return target >= start && target <= end;
  }) || null;
}

/** Returns the approved VacationRequest for the employee on dateStr, or null. */
export function hasApprovedVacation(
  employeeId: number, dateStr: string, vacations: VacationRequest[]
): VacationRequest | null {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return vacations.find(v => {
    if (v.employee !== employeeId || v.status !== 'approved') return false;
    const start = new Date(v.start_date); start.setHours(0, 0, 0, 0);
    const end   = new Date(v.end_date);   end.setHours(0, 0, 0, 0);
    return target >= start && target <= end;
  }) || null;
}

// ── Absence type labels ───────────────────────────────────────────────────────

/** Maps an absence type key to a full German name (used in dialogs). */
export function getAbsenceTypeName(type: string): string {
  const names: Record<string, string> = {
    sick: 'Krankheit', vacation: 'Urlaub',
    vacation_wish: 'Urlaubswunsch', kug: 'Kurzarbeit', other: 'Sonstiges'
  };
  return names[type] ?? type;
}

/** Maps an absence type key to a short German label (used in tooltips). */
export function getAbsenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sick: 'Krank', vacation: 'Urlaub', kug: 'KUG', other: 'Sonstiges'
  };
  return labels[type] ?? type;
}

// ── Rest-period / overlap logic ───────────────────────────────────────────────

/** Resolves the absolute DateTime for a shift start or end time, advancing by one day for overnight shifts. */
function shiftDateTime(date: Date, timeStr: string, startTimeStr?: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  const dt = new Date(date);
  dt.setHours(hours, minutes, 0, 0);
  if (startTimeStr) {
    const s = parseTime(startTimeStr);
    if (hours < s.hours || (hours === s.hours && minutes < s.minutes)) {
      dt.setDate(dt.getDate() + 1);  // shift ends the next calendar day
    }
  }
  return dt;
}

/**
 * Returns true when two shifts overlap OR violate the mandatory 11-hour rest period.
 * Each shift is defined by its date and start/end time strings.
 */
export function shiftsViolateRestRule(
  dateA: Date, startA: string, endA: string,
  dateB: Date, startB: string, endB: string
): boolean {
  const aStart = shiftDateTime(dateA, startA);
  const aEnd   = shiftDateTime(dateA, endA, startA);
  const bStart = shiftDateTime(dateB, startB);
  const bEnd   = shiftDateTime(dateB, endB, startB);
  if (aStart < bEnd && bStart < aEnd) return true;  // shifts overlap
  const restMs = aStart > bStart
    ? aStart.getTime() - bEnd.getTime()
    : bStart.getTime() - aEnd.getTime();
  return restMs >= 0 && restMs / 3_600_000 < 11;   // less than 11-hour rest
}

/**
 * Returns true when placing an employee on the given shiftType + date conflicts
 * with their other scheduled shifts (same-day duplicate or rest-period violation).
 * Optionally excludes a shift ID (used when dragging an existing shift).
 */
export function hasShiftConflict(
  employeeId: number, dateStr: string, shiftType: ShiftType,
  allShifts: Shift[], excludeShiftId?: number
): boolean {
  const relevant = allShifts.filter(s => s.employee === employeeId && s.id !== excludeShiftId);
  if (relevant.some(s => s.date === dateStr)) return true;  // same-day conflict
  return relevant
    .filter(s => Math.abs((new Date(dateStr).getTime() - new Date(s.date).getTime()) / 86_400_000) <= 2)
    .some(s => shiftsViolateRestRule(
      new Date(s.date), s.start_time, s.end_time,
      new Date(dateStr), shiftType.start_time, shiftType.end_time
    ));
}

// ── Batch conflict calculations ───────────────────────────────────────────────

/** Marks shift IDs where multiple shifts for one employee share the same date. */
function markSameDayConflicts(empShifts: Shift[], out: Set<number>): void {
  const byDate = new Map<string, Shift[]>();
  empShifts.forEach(s => {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  });
  byDate.forEach(same => {
    if (same.length > 1) same.forEach(s => { if (s.id) out.add(s.id); });
  });
}

/** Marks shift IDs where consecutive shifts for one employee violate the 11-hour rest rule. */
function markRestViolationConflicts(empShifts: Shift[], out: Set<number>): void {
  const sorted = [...empShifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const nxt = sorted[i + 1];
    if (cur.date === nxt.date) continue;
    const days = (new Date(nxt.date).getTime() - new Date(cur.date).getTime()) / 86_400_000;
    if (days > 2) continue;
    if (shiftsViolateRestRule(new Date(cur.date), cur.start_time, cur.end_time,
                              new Date(nxt.date), nxt.start_time, nxt.end_time)) {
      if (cur.id) out.add(cur.id);
      if (nxt.id) out.add(nxt.id);
    }
  }
}

/**
 * Scans all shifts and returns IDs where the employee has a same-day duplicate
 * or a rest-period violation with an adjacent shift.
 */
export function getConflictingShiftIds(shifts: Shift[]): Set<number> {
  const conflicts = new Set<number>();
  const byEmployee = new Map<number, Shift[]>();
  shifts.forEach(s => {
    if (!s.employee) return;
    if (!byEmployee.has(s.employee)) byEmployee.set(s.employee, []);
    byEmployee.get(s.employee)!.push(s);
  });
  byEmployee.forEach(empShifts => {
    markSameDayConflicts(empShifts, conflicts);
    markRestViolationConflicts(empShifts, conflicts);
  });
  return conflicts;
}

/**
 * Returns shift IDs where the assigned employee has an absence record
 * or an approved vacation on the shift date.
 */
export function getAbsenceConflictShiftIds(
  shifts: Shift[], absences: AbsenceRecord[], vacations: VacationRequest[]
): Set<number> {
  const conflicts = new Set<number>();
  shifts.forEach(s => {
    if (!s.employee || !s.id) return;
    if (isEmployeeAbsent(s.employee, s.date, absences) ||
        hasApprovedVacation(s.employee, s.date, vacations)) {
      conflicts.add(s.id);
    }
  });
  return conflicts;
}

// ── Absence tooltip ───────────────────────────────────────────────────────────

type AbsenceDay = { date: string; type: string; label: string };

/** Groups consecutive absence days of the same type into date-range entries. */
function groupAbsenceDays(days: AbsenceDay[]): { label: string; dates: string[] }[] {
  const grouped: { type: string; label: string; dates: string[] }[] = [];
  days.forEach(day => {
    const last = grouped[grouped.length - 1];
    if (last?.type === day.type) { last.dates.push(day.date); }
    else { grouped.push({ type: day.type, label: day.label, dates: [day.date] }); }
  });
  return grouped;
}

/**
 * Builds a multi-line tooltip string listing all absence days within the given week.
 * Consecutive days of the same absence type are collapsed into a range.
 */
export function buildAbsenceTooltip(
  employeeId: number, weekDays: WeekDay[], absences: AbsenceRecord[]
): string {
  const days: AbsenceDay[] = weekDays.flatMap(day => {
    const absence = isEmployeeAbsent(employeeId, day.dateStr, absences);
    if (!absence) return [];
    const formatted = new Date(day.dateStr).toLocaleDateString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit'
    });
    return [{ date: formatted, type: absence.absence_type, label: getAbsenceTypeLabel(absence.absence_type) }];
  });
  if (!days.length) return '';
  return groupAbsenceDays(days)
    .map(g => g.dates.length === 1 ? `${g.label}: ${g.dates[0]}` : `${g.label}: ${g.dates[0]} - ${g.dates.at(-1)}`)
    .join('\n');
}
