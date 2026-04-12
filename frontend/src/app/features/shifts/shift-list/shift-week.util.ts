/** Pure date, time, and week calculation utilities for the shift grid. */

/** Returns an ISO date string YYYY-MM-DD for the given date. */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns a German locale date string DD.MM.YYYY. */
export function formatDateDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

/** Trims a time string from HH:MM:SS to HH:MM. */
export function formatTime(time: string): string {
  return time.substring(0, 5);
}

/** Parses a "HH:MM[:SS]" string into numeric hours and minutes. */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':');
  return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) };
}

/** Returns the ISO week number (1–53) for the given date. */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Returns the ISO week number and its year (the "ISO week year" may differ
 * from the calendar year for dates near year boundaries).
 */
export function getIsoWeekYear(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    year: d.getUTCFullYear(),
    week: Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  };
}

/** Returns the Monday 00:00 – Sunday 23:59:59 range containing the given date. */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Day label and date strings for one column in the weekly grid. */
export interface WeekDay {
  /** German day abbreviation: Mo, Di, Mi, Do, Fr, Sa, So. */
  name: string;
  /** Display date string DD.MM.YYYY (shown in column header). */
  date: string;
  /** ISO date string YYYY-MM-DD (used for data lookups). */
  dateStr: string;
}

/** Generates seven WeekDay entries starting from the given Monday. */
export function generateWeekDays(weekStart: Date): WeekDay[] {
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  return dayNames.map((name, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { name, date: formatDateDisplay(d), dateStr: formatDate(d) };
  });
}

/** Returns a formatted week label, e.g. "KW05 (03.02.2025 - 09.02.2025)". */
export function getWeekDisplay(weekStart: Date, weekEnd: Date): string {
  const weekNum = getWeekNumber(weekStart);
  return `KW${String(weekNum).padStart(2, '0')} (${formatDateDisplay(weekStart)} - ${formatDateDisplay(weekEnd)})`;
}

/**
 * Returns worked hours for a shift after subtracting the break duration.
 * Handles overnight shifts (end time before start time).
 * breakDuration is in minutes.
 */
export function calculateShiftDuration(startTime: string, endTime: string, breakDuration = 0): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  let hours = endHour - startHour;
  let minutes = endMin - startMin;
  if (minutes < 0) { hours--; minutes += 60; }
  if (hours < 0) { hours += 24; }  // overnight shift crosses midnight
  return Math.max(0, (hours + minutes / 60) - breakDuration / 60);
}
